const express = require('express');
const router = express.Router();
const { getPool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// GET carrello utente
router.get('/', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            `SELECT 
                c.carrello_id,
                c.prodotto_id,
                c.quantita,
                c.prezzo_unitario,
                p.nome_prodotto,
                p.immagine,
                p.quantita as disponibilita
            FROM carrello c
            INNER JOIN prodotti p ON c.prodotto_id = p.prodotto_id
            WHERE c.cliente_id = $1`,
            [req.user.id]
        );

        res.json({
            success: true,
            items: result.rows.map(item => ({
                ...item,
                immagine: item.immagine ? item.immagine.toString('base64') : null
            }))
        });

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del carrello'
        });
    } finally {
        client.release();
    }
});

// POST aggiungi al carrello
router.post('/add', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { prodotto_id, quantita } = req.body;

        await client.query('BEGIN');

        // Verifica disponibilità prodotto
        const productCheck = await client.query(
            'SELECT quantita, prezzo FROM prodotti WHERE prodotto_id = $1',
            [prodotto_id]
        );

        if (productCheck.rows.length === 0) {
            throw new Error('Prodotto non trovato');
        }

        const product = productCheck.rows[0];
        if (product.quantita < quantita) {
            throw new Error('Quantità richiesta non disponibile');
        }

        // Verifica se il prodotto è già nel carrello
        const cartCheck = await client.query(
            'SELECT quantita FROM carrello WHERE cliente_id = $1 AND prodotto_id = $2',
            [req.user.id, prodotto_id]
        );

        if (cartCheck.rows.length > 0) {
            // Aggiorna quantità esistente
            const newQuantity = cartCheck.rows[0].quantita + quantita;
            if (newQuantity > product.quantita) {
                throw new Error('Quantità totale eccede la disponibilità');
            }

            await client.query(
                `UPDATE carrello 
                SET quantita = $1 
                WHERE cliente_id = $2 AND prodotto_id = $3`,
                [newQuantity, req.user.id, prodotto_id]
            );
        } else {
            // Inserisci nuovo elemento
            await client.query(
                `INSERT INTO carrello (cliente_id, prodotto_id, quantita, prezzo_unitario)
                VALUES ($1, $2, $3, $4)`,
                [req.user.id, prodotto_id, quantita, product.prezzo]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Prodotto aggiunto al carrello'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding to cart:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        client.release();
    }
});

// PUT aggiorna quantità
router.put('/update', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { prodotto_id, quantita } = req.body;

        await client.query('BEGIN');

        // Verifica disponibilità prodotto
        const productCheck = await client.query(
            'SELECT quantita FROM prodotti WHERE prodotto_id = $1',
            [prodotto_id]
        );

        if (productCheck.rows.length === 0) {
            throw new Error('Prodotto non trovato');
        }

        if (quantita > productCheck.rows[0].quantita) {
            throw new Error('Quantità richiesta non disponibile');
        }

        await client.query(
            `UPDATE carrello 
            SET quantita = $1 
            WHERE cliente_id = $2 AND prodotto_id = $3`,
            [quantita, req.user.id, prodotto_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Quantità aggiornata'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating cart:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        client.release();
    }
});

// DELETE rimuovi dal carrello
router.delete('/remove/:id', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'DELETE FROM carrello WHERE cliente_id = $1 AND prodotto_id = $2',
            [req.user.id, req.params.id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Prodotto rimosso dal carrello'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella rimozione del prodotto'
        });
    } finally {
        client.release();
    }
});

// GET conteggio elementi carrello
router.get('/count', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            `SELECT COALESCE(SUM(quantita), 0) as count 
            FROM carrello 
            WHERE cliente_id = $1`,
            [req.user.id]
        );

        res.json({
            success: true,
            count: parseInt(result.rows[0].count)
        });

    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del conteggio carrello'
        });
    } finally {
        client.release();
    }
});

module.exports = router;