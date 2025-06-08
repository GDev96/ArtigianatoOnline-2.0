const express = require('express');
const router = express.Router();
const { getPool } = require('../db/db'); // Update to use getPool
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// GET tutte le recensioni - pubblico
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const query = `
            SELECT 
                r.recensione_id,
                r.cliente_id,
                r.artigiano_id,
                r.valutazione,
                r.descrizione,
                r.data_recensione,
                r.stato,
                c.nome as cliente_nome,
                c.cognome as cliente_cognome,
                a.nome as artigiano_nome,
                a.cognome as artigiano_cognome
            FROM recensioni r
            INNER JOIN utente c ON r.cliente_id = c.id
            INNER JOIN utente a ON r.artigiano_id = a.id
            WHERE r.stato = 'attiva'
            ORDER BY r.data_recensione DESC`;

        const result = await pool.query(query);

        res.json({
            success: true,
            reviews: result.rows
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle recensioni'
        });
    }
});

// Get recensioni dell'utente
router.get('/user', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                r.recensione_id,
                r.data_recensione,
                r.valutazione,
                r.descrizione,
                r.stato,
                u.nome as nome_artigiano,
                u.cognome as cognome_artigiano,
                a.artigiano_id
            FROM recensioni r
            INNER JOIN artigiani a ON r.artigiano_id = a.artigiano_id
            INNER JOIN utente u ON a.artigiano_id = u.id
            WHERE r.cliente_id = $1
            ORDER BY r.data_recensione DESC`;

        const result = await pool.query(query, [req.user.id]);
        
        res.json({
            success: true,
            reviews: result.rows
        });

    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle recensioni'
        });
    }
});

// GET single review by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const query = `
            SELECT 
                r.recensione_id,
                r.cliente_id,
                r.artigiano_id,
                r.valutazione,
                r.descrizione,
                r.data_recensione,
                r.stato,
                c.nome as cliente_nome,
                c.cognome as cliente_cognome
            FROM recensioni r
            INNER JOIN utente c ON r.cliente_id = c.id
            WHERE r.recensione_id = $1 AND r.cliente_id = $2`;

        const result = await pool.query(query, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recensione non trovata o non autorizzato'
            });
        }

        res.json({
            success: true,
            review: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero della recensione'
        });
    }
});

router.get('/artisan/:id', async (req, res) => {
    try {
        const artisanId = req.params.id;
        const pool = getPool();

        const query = `
            SELECT 
                r.recensione_id,
                r.cliente_id,
                r.artigiano_id,
                r.valutazione,
                r.descrizione,
                r.data_recensione,
                r.stato,
                c.nome as nome_cliente,
                c.cognome as cognome_cliente
            FROM recensioni r
            INNER JOIN utente c ON r.cliente_id = c.id
            WHERE r.artigiano_id = $1 
            AND r.stato = 'attiva'
            ORDER BY r.data_recensione DESC`;

        const result = await pool.query(query, [artisanId]);

        res.json({
            success: true,
            reviews: result.rows
        });

    } catch (error) {
        console.error('Error fetching artisan reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle recensioni'
        });
    }
});

// POST nuova recensione - solo utenti autenticati
router.post('/', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { artigiano_id, valutazione, descrizione } = req.body;
        const cliente_id = req.user.id;

        // Validation
        if (!artigiano_id || !valutazione || !descrizione) {
            return res.status(400).json({
                success: false,
                message: 'Dati recensione incompleti'
            });
        }

        await client.query('BEGIN');

        // Check if artisan exists and is active
        const artisanCheck = await client.query(`
            SELECT u.id 
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            WHERE u.id = $1 AND u.ruolo_id = 2 AND u.stato = 'attivo'`,
            [artigiano_id]
        );

        if (artisanCheck.rows.length === 0) {
            throw new Error('Artigiano non trovato o non attivo');
        }

        // Check if user has already reviewed this artisan
        const existingReview = await client.query(`
            SELECT recensione_id 
            FROM recensioni 
            WHERE cliente_id = $1 AND artigiano_id = $2 AND stato = 'attiva'`,
            [cliente_id, artigiano_id]
        );

        if (existingReview.rows.length > 0) {
            throw new Error('Hai già recensito questo artigiano');
        }

        // Insert review
        const insertQuery = `
            INSERT INTO recensioni 
                (cliente_id, artigiano_id, valutazione, descrizione, data_recensione, stato)
            VALUES 
                ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'attiva')
            RETURNING recensione_id`;

        const result = await client.query(insertQuery, [
            cliente_id,
            artigiano_id,
            valutazione,
            descrizione
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            review: {
                recensione_id: result.rows[0].recensione_id,
                cliente_id,
                artigiano_id,
                valutazione,
                descrizione
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating review:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nella creazione della recensione'
        });
    } finally {
        client.release();
    }
});

// PUT modifica recensione - solo cliente che ha scritto la recensione
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { valutazione, descrizione } = req.body;
        const cliente_id = req.user.id;

        // Validazione input
        if (!valutazione || !descrizione) {
            return res.status(400).json({
                success: false,
                message: 'Dati recensione incompleti'
            });
        }

        // Verifica proprietà della recensione
        const reviewCheck = await pool.query(
            'SELECT recensione_id FROM recensioni WHERE recensione_id = $1 AND cliente_id = $2',
            [id, cliente_id]
        );

        if (reviewCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a modificare questa recensione'
            });
        }

        // Aggiorna la recensione
        const query = `
            UPDATE recensioni 
            SET valutazione = $1, descrizione = $2
            WHERE recensione_id = $3
            RETURNING *`;

        const result = await pool.query(query, [valutazione, descrizione, id]);

        res.json({
            success: true,
            review: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella modifica della recensione'
        });
    }
});

// DELETE elimina recensione - solo cliente che ha scritto la recensione
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const cliente_id = req.user.id;

        // Verifica proprietà della recensione
        const reviewCheck = await pool.query(
            'SELECT recensione_id FROM recensioni WHERE recensione_id = $1 AND cliente_id = $2',
            [id, cliente_id]
        );

        if (reviewCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a eliminare questa recensione'
            });
        }

        await pool.query('DELETE FROM recensioni WHERE recensione_id = $1', [id]);

        res.json({
            success: true,
            message: 'Recensione eliminata con successo'
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della recensione'
        });
    }
});

module.exports = router;