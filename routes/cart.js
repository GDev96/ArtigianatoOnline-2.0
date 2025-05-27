const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

// GET /cart - Visualizza i prodotti nel carrello
router.get('/', requireAuth, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Utente non autenticato'
            });
        }

        const userId = req.user.id;

        const query = `
            SELECT 
                c.carrello_id,
                c.prodotto_id,
                c.quantita,
                c.prezzo_unitario,
                p.nome_prodotto,
                p.immagine,
                p.quantita as disponibilita
            FROM carrello c
            JOIN prodotti p ON c.prodotto_id = p.prodotto_id
            WHERE c.cliente_id = $1`;

        const result = await pool.query(query, [userId]);

        res.json({
            success: true,
            items: result.rows || []
        });

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del carrello',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /cart/add - Inserisci prodotto nel carrello - corretta
router.post('/add', requireAuth, async (req, res) => {
    try {
        const { prodotto_id, quantita } = req.body;
        const cliente_id = req.user.id;

        // Validation
        if (!prodotto_id || quantita < 1) {
            return res.status(400).json({
                success: false,
                message: 'Dati prodotto non validi'
            });
        }

        // Check product availability and price
        const productCheck = await pool.query(
            'SELECT quantita, prezzo FROM prodotti WHERE prodotto_id = $1',
            [prodotto_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato'
            });
        }

        const { quantita: disponibilita, prezzo } = productCheck.rows[0];

        if (disponibilita < quantita) {
            return res.status(400).json({
                success: false,
                message: 'Quantità richiesta non disponibile'
            });
        }

        // Check if product already in cart
        const cartCheck = await pool.query(
            'SELECT carrello_id, quantita FROM carrello WHERE cliente_id = $1 AND prodotto_id = $2',
            [cliente_id, prodotto_id]
        );

        let result;
        if (cartCheck.rows.length > 0) {
            // Update existing cart item
            const newQuantity = cartCheck.rows[0].quantita + quantita;
            result = await pool.query(
                'UPDATE carrello SET quantita = $1 WHERE carrello_id = $2 RETURNING *',
                [newQuantity, cartCheck.rows[0].carrello_id]
            );
        } else {
            // Insert new cart item
            result = await pool.query(
                'INSERT INTO carrello (cliente_id, prodotto_id, quantita, prezzo_unitario) VALUES ($1, $2, $3, $4) RETURNING *',
                [cliente_id, prodotto_id, quantita, prezzo]
            );
        }

        res.status(201).json({
            success: true,
            item: result.rows[0]
        });

    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiunta al carrello'
        });
    }
});

// PUT /cart/update - Modifica quantità prodotto nel carrello
router.put('/update', requireAuth, async (req, res) => {
    try {
        const { prodotto_id, quantita } = req.body;
        const cliente_id = req.user.id;

        // Validation
        if (!prodotto_id || quantita < 0) {
            return res.status(400).json({
                success: false,
                message: 'Dati prodotto non validi'
            });
        }

        // Check product availability
        const productCheck = await pool.query(
            'SELECT quantita FROM prodotti WHERE prodotto_id = $1',
            [prodotto_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato'
            });
        }

        if (productCheck.rows[0].quantita < quantita) {
            return res.status(400).json({
                success: false,
                message: 'Quantità richiesta non disponibile'
            });
        }

        // Update cart item
        const result = await pool.query(
            'UPDATE carrello SET quantita = $1 WHERE cliente_id = $2 AND prodotto_id = $3 RETURNING *',
            [quantita, cliente_id, prodotto_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato nel carrello'
            });
        }

        // Get updated cart item with product details
        const updatedItem = await pool.query(`
            SELECT 
                c.carrello_id,
                c.prodotto_id,
                c.quantita,
                c.prezzo_unitario,
                p.nome_prodotto,
                p.immagine,
                p.quantita as disponibilita
            FROM carrello c
            JOIN prodotti p ON c.prodotto_id = p.prodotto_id
            WHERE c.carrello_id = $1
        `, [result.rows[0].carrello_id]);

        res.json({
            success: true,
            item: updatedItem.rows[0]
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del carrello',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /cart/remove/:id - Rimuovi prodotto dal carrello
router.delete('/remove/:id', requireAuth, async (req, res) => {
    try {
        const prodotto_id = req.params.id;
        const cliente_id = req.user.id;

        // Rimuovi il check dello stato dalla query
        const result = await pool.query(
            'DELETE FROM carrello WHERE cliente_id = $1 AND prodotto_id = $2 RETURNING *',
            [cliente_id, prodotto_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato nel carrello'
            });
        }

        res.json({
            success: true,
            message: 'Prodotto rimosso dal carrello'
        });

    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella rimozione dal carrello',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//TOOD : Implement a route to clear the cart

module.exports = router;

