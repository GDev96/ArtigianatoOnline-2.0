const express = require('express');
const router = express.Router();
const { getPool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer();

const requireAuth = createAuthMiddleware();

// GET tutti i prodotti - pubblico
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
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
                t.nome_tipologia
            FROM prodotti p
            INNER JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            INNER JOIN utente u ON a.artigiano_id = u.id
            LEFT JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            ORDER BY p.nome_prodotto ASC`;

        const result = await pool.query(query);
        
        res.json({
            success: true,
            products: result.rows.map(product => ({
                ...product,
                immagine: product.immagine ? product.immagine.toString('base64') : null,
                prezzo: parseFloat(product.prezzo)
            }))
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei prodotti'
        });
    }
});

// GET prodotti per artigiano
router.get('/artisan/:id', async (req, res) => {
    try {
        const pool = getPool();
        const artisanId = req.params.id;

        const query = `
            SELECT 
                p.prodotto_id,
                p.nome_prodotto,
                p.prezzo,
                p.quantita,
                p.immagine,
                p.tipologia_id,
                t.nome_tipologia
            FROM prodotti p
            LEFT JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            WHERE p.artigiano_id = $1
            ORDER BY p.nome_prodotto ASC`;

        const result = await pool.query(query, [artisanId]);

        res.json({
            success: true,
            products: result.rows.map(product => ({
                ...product,
                immagine: product.immagine ? product.immagine.toString('base64') : null,
                prezzo: parseFloat(product.prezzo)
            }))
        });

    } catch (error) {
        console.error('Error fetching artisan products:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei prodotti dell\'artigiano'
        });
    }
});

// GET prodotto singolo per ID
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        
        const query = `
            SELECT 
                p.*,
                u.nome as artigiano_nome,
                u.cognome as artigiano_cognome,
                t.nome_tipologia
            FROM prodotti p
            INNER JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            INNER JOIN utente u ON a.artigiano_id = u.id
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
                immagine: product.immagine ? product.immagine.toString('base64') : null,
                prezzo: parseFloat(product.prezzo)
            }
        });

    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del prodotto'
        });
    }
});

// POST nuovo prodotto - solo artigiani
router.post('/', requireAuth, upload.single('immagine'), async (req, res) => {
    const client = await getPool().connect();
    try {
        const { nome_prodotto, prezzo, quantita, tipologia_id } = req.body;

        // Verifica che l'utente sia un artigiano
        const checkArtisan = await client.query(
            'SELECT 1 FROM artigiani WHERE artigiano_id = $1',
            [req.user.id]
        );

        if (checkArtisan.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Solo gli artigiani possono creare prodotti'
            });
        }

        if (!nome_prodotto || !prezzo || prezzo <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Nome prodotto e prezzo sono richiesti'
            });
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO prodotti 
            (artigiano_id, nome_prodotto, prezzo, quantita, tipologia_id, immagine)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.user.id,
                nome_prodotto,
                prezzo,
                quantita || 0,
                tipologia_id,
                req.file ? req.file.buffer : null
            ]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            product: {
                ...result.rows[0],
                immagine: result.rows[0].immagine ? result.rows[0].immagine.toString('base64') : null,
                prezzo: parseFloat(result.rows[0].prezzo)
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione del prodotto'
        });
    } finally {
        client.release();
    }
});

// PUT modifica prodotto - solo artigiano proprietario
router.put('/:id', requireAuth, upload.single('immagine'), async (req, res) => {
    const client = await getPool().connect();
    try {
        const { id } = req.params;
        const { nome_prodotto, prezzo, quantita, tipologia_id } = req.body;

        await client.query('BEGIN');

        const checkResult = await client.query(
            'SELECT 1 FROM prodotti WHERE prodotto_id = $1 AND artigiano_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a modificare questo prodotto'
            });
        }

        const setClause = [];
        const values = [];
        let paramCount = 1;

        if (nome_prodotto) {
            setClause.push(`nome_prodotto = $${paramCount}`);
            values.push(nome_prodotto);
            paramCount++;
        }
        if (prezzo) {
            setClause.push(`prezzo = $${paramCount}`);
            values.push(prezzo);
            paramCount++;
        }
        if (quantita !== undefined) {
            setClause.push(`quantita = $${paramCount}`);
            values.push(quantita);
            paramCount++;
        }
        if (tipologia_id) {
            setClause.push(`tipologia_id = $${paramCount}`);
            values.push(tipologia_id);
            paramCount++;
        }
        if (req.file) {
            setClause.push(`immagine = $${paramCount}`);
            values.push(req.file.buffer);
            paramCount++;
        }

        values.push(id, req.user.id);

        const result = await client.query(
            `UPDATE prodotti 
             SET ${setClause.join(', ')}
             WHERE prodotto_id = $${paramCount} AND artigiano_id = $${paramCount + 1}
             RETURNING *`,
            values
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            product: {
                ...result.rows[0],
                immagine: result.rows[0].immagine ? result.rows[0].immagine.toString('base64') : null,
                prezzo: parseFloat(result.rows[0].prezzo)
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella modifica del prodotto'
        });
    } finally {
        client.release();
    }
});

// DELETE elimina prodotto - solo artigiano proprietario
router.delete('/:id', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Verifica proprietà del prodotto
        const checkResult = await client.query(
            'SELECT 1 FROM prodotti WHERE prodotto_id = $1 AND artigiano_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a eliminare questo prodotto'
            });
        }

        await client.query(
            'DELETE FROM prodotti WHERE prodotto_id = $1 AND artigiano_id = $2',
            [id, req.user.id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Prodotto eliminato con successo'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del prodotto'
        });
    } finally {
        client.release();
    }
});

module.exports = router;