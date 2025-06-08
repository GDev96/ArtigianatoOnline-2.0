const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool'); // ✅ FIXED: Use correct pool import
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// Get ordini dell'utente
router.get('/user', requireAuth, async (req, res) => {
    const pool = getPool(); // ✅ FIXED: Get pool instance
    try {
        const query = `
            WITH OrderSummary AS (
                SELECT 
                    o.ordine_id,
                    o.data_ordine,
                    o.stato,
                    SUM(det.prezzo_unitario * det.quantita) as totale,
                    MIN(u.nome) as nome_artigiano,
                    MIN(u.cognome) as cognome_artigiano
                FROM ordini o
                INNER JOIN dettagli_ordine det ON o.ordine_id = det.ordine_id
                INNER JOIN prodotti p ON det.prodotto_id = p.prodotto_id
                INNER JOIN artigiani a ON p.artigiano_id = a.artigiano_id
                INNER JOIN utente u ON a.artigiano_id = u.id
                WHERE o.cliente_id = $1
                GROUP BY o.ordine_id, o.data_ordine, o.stato
            )
            SELECT 
                os.*,
                COALESCE(json_agg(
                    json_build_object(
                        'nome', p.nome_prodotto,
                        'quantita', det.quantita,
                        'prezzo', det.prezzo_unitario
                    )
                ) FILTER (WHERE p.prodotto_id IS NOT NULL), '[]') as prodotti
            FROM OrderSummary os
            LEFT JOIN dettagli_ordine det ON os.ordine_id = det.ordine_id
            LEFT JOIN prodotti p ON det.prodotto_id = p.prodotto_id
            GROUP BY 
                os.ordine_id, 
                os.data_ordine, 
                os.stato, 
                os.totale, 
                os.nome_artigiano, 
                os.cognome_artigiano
            ORDER BY os.data_ordine DESC`;

        const result = await pool.query(query, [req.user.id]);

        // Format the results
        const orders = result.rows.map(order => ({
            ordine_id: order.ordine_id,
            data_ordine: order.data_ordine,
            stato: order.stato,
            totale: parseFloat(order.totale),
            nome_artigiano: order.nome_artigiano,
            cognome_artigiano: order.cognome_artigiano,
            prodotti: order.prodotti.map(p => ({
                nome: p.nome,
                quantita: p.quantita,
                prezzo: parseFloat(p.prezzo)
            }))
        }));

        // ✅ FIXED: Return consistent API format
        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli ordini',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get ordini per artigiano
router.get('/artisan/sales', requireAuth, async (req, res) => {
    const pool = getPool(); // ✅ FIXED: Get pool instance
    try {
        const artisanId = req.user.id;
        const query = `
            WITH MonthlyOrders AS (
                SELECT 
                    DATE_TRUNC('month', o.data_ordine) as mese,
                    COUNT(DISTINCT o.ordine_id) as numero_ordini
                FROM ordini o
                JOIN dettagli_ordine det ON o.ordine_id = det.ordine_id
                JOIN prodotti p ON det.prodotto_id = p.prodotto_id
                WHERE p.artigiano_id = $1
                GROUP BY DATE_TRUNC('month', o.data_ordine)
                ORDER BY mese ASC
            )
            SELECT 
                TO_CHAR(mese, 'Month') as mese,
                EXTRACT(MONTH FROM mese) as mese_numero,
                COALESCE(numero_ordini, 0) as numero_ordini
            FROM MonthlyOrders`;

        const result = await pool.query(query, [artisanId]);

        // Create array for all months
        const monthlyData = new Array(12).fill(0);
        
        // Fill in the data we have
        result.rows.forEach(row => {
            monthlyData[row.mese_numero - 1] = parseInt(row.numero_ordini);
        });

        res.json({
            success: true,
            data: monthlyData
        });

    } catch (error) {
        console.error('Error fetching artisan sales:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle vendite'
        });
    }
});

// Get dettagli ordine tramite id
router.get('/:id', requireAuth, async (req, res) => {
    const pool = getPool(); // ✅ FIXED: Get pool instance
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        const query = `
            SELECT 
                o.ordine_id,
                o.data_ordine,
                o.stato,
                SUM(det.prezzo_unitario * det.quantita) as totale,
                json_agg(json_build_object(
                    'nome', p.nome_prodotto,
                    'quantita', det.quantita,
                    'prezzo', det.prezzo_unitario,
                    'artigiano_id', p.artigiano_id
                )) as prodotti
            FROM ordini o
            INNER JOIN dettagli_ordine det ON o.ordine_id = det.ordine_id
            INNER JOIN prodotti p ON det.prodotto_id = p.prodotto_id
            WHERE o.ordine_id = $1 AND o.cliente_id = $2
            GROUP BY o.ordine_id, o.data_ordine, o.stato`;

        const result = await pool.query(query, [orderId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ordine non trovato'
            });
        }

        // ✅ FIXED: Return consistent API format
        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dettagli dell\'ordine'
        });
    }
});

const STATI = {
    ORDINE: {
        IN_PREPARAZIONE: 'in preparazione',
        SPEDITO: 'spedito',
        CONTROVERSIA: 'controversia aperta',
        CONSEGNATO: 'consegnato'
    },
    DETTAGLIO: {
        IN_PREPARAZIONE: 'in preparazione',
        SPEDITO: 'spedito',
        CONSEGNATO: 'consegnato'
    }
};

// POST /orders/create - Crea un nuovo ordine
router.post('/create', requireAuth, async (req, res) => {
    const pool = getPool(); // ✅ FIXED: Get pool instance
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user.id;

        // 1. Get cart items
        const cartQuery = `
            SELECT 
                c.prodotto_id,
                c.quantita,
                c.prezzo_unitario,
                p.quantita as disponibilita
            FROM carrello c
            JOIN prodotti p ON c.prodotto_id = p.prodotto_id
            WHERE c.cliente_id = $1`;
        
        const cartResult = await client.query(cartQuery, [userId]);
        if (cartResult.rows.length === 0) {
            throw new Error('Carrello vuoto');
        }

        // 2. Check product availability
        for (const item of cartResult.rows) {
            if (item.disponibilita < item.quantita) {
                throw new Error(`Quantità non disponibile per il prodotto ${item.prodotto_id}`);
            }
        }

        // 3. Create order with correct stato value
        const orderQuery = `
            INSERT INTO ordini (cliente_id, stato, data_ordine)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING ordine_id`;
        
        const orderResult = await client.query(orderQuery, [userId, STATI.ORDINE.IN_PREPARAZIONE]);
        const ordineId = orderResult.rows[0].ordine_id;

        // 4. Create order details with correct structure including stato
        const detailsQuery = `
            INSERT INTO dettagli_ordine (ordine_id, prodotto_id, quantita, prezzo_unitario, stato)
            VALUES ($1, $2, $3, $4, $5)`;
        
        for (const item of cartResult.rows) {
            // Insert order details with initial stato
            await client.query(detailsQuery, [
                ordineId,
                item.prodotto_id,
                item.quantita,
                item.prezzo_unitario,
                STATI.DETTAGLIO.IN_PREPARAZIONE
            ]);

            // Update product quantity
            await client.query(
                'UPDATE prodotti SET quantita = quantita - $1 WHERE prodotto_id = $2',
                [item.quantita, item.prodotto_id]
            );
        }

        // 5. Clear user's cart
        await client.query('DELETE FROM carrello WHERE cliente_id = $1', [userId]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Ordine creato con successo',
            data: {
                ordine_id: ordineId
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nella creazione dell\'ordine'
        });
    } finally {
        client.release();
    }
});

// ✅ NEW: Update order status for artisans
router.patch('/:id/status', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        const { id: orderId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        // Validate status
        const validStatuses = Object.values(STATI.ORDINE);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido'
            });
        }

        await client.query('BEGIN');

        // Check if user is artisan and has access to this order
        const checkQuery = `
            SELECT DISTINCT o.ordine_id
            FROM ordini o
            JOIN dettagli_ordine d ON o.ordine_id = d.ordine_id
            JOIN prodotti p ON d.prodotto_id = p.prodotto_id
            WHERE o.ordine_id = $1 AND p.artigiano_id = $2`;

        const checkResult = await client.query(checkQuery, [orderId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a modificare questo ordine'
            });
        }

        // Update order status
        const updateQuery = `
            UPDATE ordini 
            SET stato = $1 
            WHERE ordine_id = $2 
            RETURNING *`;

        const result = await client.query(updateQuery, [status, orderId]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Stato ordine aggiornato con successo',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dello stato dell\'ordine'
        });
    } finally {
        client.release();
    }
});

module.exports = router;