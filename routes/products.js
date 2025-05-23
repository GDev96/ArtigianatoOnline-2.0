const express = require('express');
const router = express.Router();
const { pool } = require('../db/db'); // Update this line
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

// GET tutti i prodotti - pubblico - corretta
router.get('/', async (req, res) => {
    try {
        console.log('Starting products query...'); // Add debug log
        const query = `
            SELECT 
                p.prodotto_id,
                p.nome_prodotto,
                p.prezzo,
                p.quantita,
                p.immagine,
                p.artigiano_id,
                p.tipologia_id,
                u.nome as artigiano_nome,
                u.cognome as artigiano_cognome,
                t.nome_tipologia,
                COALESCE(AVG(r.valutazione)::numeric(10,1), 0) as valutazione_media,
                COUNT(DISTINCT r.recensione_id) as numero_recensioni
            FROM prodotti p
            INNER JOIN utente u ON p.artigiano_id = u.id
            LEFT JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            LEFT JOIN recensioni r ON u.id = r.artigiano_id 
                AND r.stato = 'attiva'
            WHERE u.stato = 'attivo'
            GROUP BY 
                p.prodotto_id,
                p.nome_prodotto,
                p.prezzo,
                p.quantita,
                p.immagine,
                p.artigiano_id,
                p.tipologia_id,
                u.nome,
                u.cognome,
                t.nome_tipologia
            ORDER BY p.nome_prodotto ASC`;

        const result = await pool.query(query);
        console.log(`Query executed, found ${result.rows.length} products`); // Add debug log
        
        res.json({
            success: true,
            products: result.rows.map(product => ({
                ...product,
                immagine: product.immagine ? product.immagine.toString('base64') : null,
                prezzo: parseFloat(product.prezzo),
                valutazione_media: parseFloat(product.valutazione_media)
            }))
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei prodotti',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET prodotto singolo per ID - pubblico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                p.*,
                u.nome as artigiano_nome,
                u.cognome as artigiano_cognome,
                t.nome_tipologia
            FROM prodotti p
            INNER JOIN utente u ON p.artigiano_id = u.id
            LEFT JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            WHERE p.prodotto_id = $1`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato'
            });
        }

        const product = result.rows[0];
        
        res.json({
            success: true,
            product: {
                ...product,
                immagine: product.immagine ? product.immagine.toString('base64') : null
            }
        });

    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del prodotto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST nuovo prodotto - solo artigiani
router.post('/', requireAuth, async (req, res) => {
    try {
        const { nome_prodotto, descrizione, prezzo, quantita, tipologia_id } = req.body;
        let { immagine } = req.body;

        // Verifica che l'utente sia un artigiano
        if (req.user.ruolo_id !== 2) {
            return res.status(403).json({
                success: false,
                message: 'Solo gli artigiani possono creare prodotti'
            });
        }

        // Validazione dati
        if (!nome_prodotto || !prezzo || prezzo <= 0 || quantita < 0) {
            return res.status(400).json({
                success: false,
                message: 'Dati prodotto non validi'
            });
        }

        // Converti immagine in Buffer se presente
        if (immagine) {
            immagine = Buffer.from(immagine, 'base64');
        }

        const query = `
            INSERT INTO prodotti 
                (artigiano_id, nome_prodotto, descrizione, prezzo, quantita, tipologia_id, immagine)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`;

        const result = await pool.query(query, [
            req.user.id,
            nome_prodotto,
            descrizione,
            prezzo,
            quantita,
            tipologia_id,
            immagine
        ]);

        res.status(201).json({
            success: true,
            product: {
                ...result.rows[0],
                immagine: immagine ? immagine.toString('base64') : null
            }
        });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione del prodotto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT modifica prodotto - solo artigiano proprietario
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_prodotto, descrizione, prezzo, quantita, tipologia_id } = req.body;
        let { immagine } = req.body;

        // Verifica proprietà del prodotto
        const checkQuery = 'SELECT artigiano_id FROM prodotti WHERE prodotto_id = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato'
            });
        }

        if (checkResult.rows[0].artigiano_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a modificare questo prodotto'
            });
        }

        // Converti immagine in Buffer se presente
        if (immagine) {
            immagine = Buffer.from(immagine, 'base64');
        }

        const query = `
            UPDATE prodotti 
            SET 
                nome_prodotto = COALESCE($1, nome_prodotto),
                descrizione = COALESCE($2, descrizione),
                prezzo = COALESCE($3, prezzo),
                quantita = COALESCE($4, quantita),
                tipologia_id = COALESCE($5, tipologia_id),
                immagine = COALESCE($6, immagine)
            WHERE prodotto_id = $7
            RETURNING *`;

        const result = await pool.query(query, [
            nome_prodotto,
            descrizione,
            prezzo,
            quantita,
            tipologia_id,
            immagine,
            id
        ]);

        res.json({
            success: true,
            product: {
                ...result.rows[0],
                immagine: result.rows[0].immagine ? result.rows[0].immagine.toString('base64') : null
            }
        });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella modifica del prodotto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE elimina prodotto - solo artigiano proprietario
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica proprietà del prodotto
        const checkQuery = 'SELECT artigiano_id FROM prodotti WHERE prodotto_id = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato'
            });
        }

        if (checkResult.rows[0].artigiano_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a eliminare questo prodotto'
            });
        }

        await pool.query('DELETE FROM prodotti WHERE prodotto_id = $1', [id]);

        res.json({
            success: true,
            message: 'Prodotto eliminato con successo'
        });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del prodotto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;