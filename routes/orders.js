const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// Get ordini dell'utente
router.get('/user', requireAuth, async (req, res) => {
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

        res.json(orders);

    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli ordini',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get dettagli ordine tramite id
router.get('/:id', requireAuth, async (req, res) => {
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
                    'prezzo', det.prezzo_unitario
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

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dettagli dell\'ordine'
        });
    }
});

module.exports = router;