const express = require('express');
const router = express.Router();
const { getPool } = require('../db/db');
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

// GET recensioni dell'utente
router.get('/user', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
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

// GET reviews for specific artisan
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
            INNER JOIN artigiani a ON r.artigiano_id = a.artigiano_id
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

// POST new review
router.post('/', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        const { artigiano_id, valutazione, descrizione } = req.body;
        const cliente_id = req.user.id;

        // Validazione input
        if (!artigiano_id || !valutazione || !descrizione) {
            return res.status(400).json({
                success: false,
                message: 'Dati recensione incompleti'
            });
        }

        if (valutazione < 1 || valutazione > 5) {
            return res.status(400).json({
                success: false,
                message: 'La valutazione deve essere tra 1 e 5'
            });
        }

        await client.query('BEGIN');

        // Verifica che l'artigiano esista e sia attivo
        const artisanCheck = await client.query(`
            SELECT a.artigiano_id 
            FROM artigiani a
            INNER JOIN utente u ON a.artigiano_id = u.id
            WHERE a.artigiano_id = $1 AND u.stato = 'attivo'`,
            [artigiano_id]
        );

        if (artisanCheck.rows.length === 0) {
            throw new Error('Artigiano non trovato o non attivo');
        }

        // Verifica che l'utente non abbia già recensito questo artigiano
        const existingReview = await client.query(`
            SELECT recensione_id 
            FROM recensioni 
            WHERE cliente_id = $1 AND artigiano_id = $2 AND stato = 'attiva'`,
            [cliente_id, artigiano_id]
        );

        if (existingReview.rows.length > 0) {
            throw new Error('Hai già recensito questo artigiano');
        }

        // Verifica che l'utente non stia recensendo se stesso
        if (cliente_id === parseInt(artigiano_id)) {
            throw new Error('Non puoi recensire te stesso');
        }

        // Inserisci la nuova recensione
        const insertQuery = `
            INSERT INTO recensioni 
                (cliente_id, artigiano_id, valutazione, descrizione, data_recensione, stato)
            VALUES 
                ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'attiva')
            RETURNING *`;

        const result = await client.query(insertQuery, [
            cliente_id,
            artigiano_id,
            valutazione,
            descrizione
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Recensione aggiunta con successo',
            review: result.rows[0]
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
        const pool = getPool();

        // Validazione input
        if (!valutazione || !descrizione) {
            return res.status(400).json({
                success: false,
                message: 'Dati recensione incompleti'
            });
        }

        if (valutazione < 1 || valutazione > 5) {
            return res.status(400).json({
                success: false,
                message: 'La valutazione deve essere tra 1 e 5'
            });
        }

        // Verifica proprietà della recensione
        const reviewCheck = await pool.query(
            'SELECT recensione_id FROM recensioni WHERE recensione_id = $1 AND cliente_id = $2 AND stato = \'attiva\'',
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
            SET valutazione = $1, descrizione = $2, data_recensione = CURRENT_TIMESTAMP
            WHERE recensione_id = $3 AND cliente_id = $4
            RETURNING *`;

        const result = await pool.query(query, [valutazione, descrizione, id, cliente_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recensione non trovata'
            });
        }

        res.json({
            success: true,
            message: 'Recensione modificata con successo',
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
        const pool = getPool();

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

        // Elimina la recensione
        const deleteResult = await pool.query(
            'DELETE FROM recensioni WHERE recensione_id = $1 AND cliente_id = $2 RETURNING *',
            [id, cliente_id]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recensione non trovata'
            });
        }

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

// PATCH toggle visibility (per admin)
router.patch('/:id/toggle-visibility', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = getPool();

        // Verifica che l'utente sia admin
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso negato: solo gli amministratori possono nascondere/mostrare le recensioni'
            });
        }

        // Toggle dello stato della recensione
        const query = `
            UPDATE recensioni 
            SET stato = CASE 
                WHEN stato = 'attiva' THEN 'nascosta'
                WHEN stato = 'nascosta' THEN 'attiva'
                ELSE 'nascosta'
            END
            WHERE recensione_id = $1
            RETURNING *`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recensione non trovata'
            });
        }

        const newStatus = result.rows[0].stato;
        const message = newStatus === 'attiva' ? 'Recensione mostrata' : 'Recensione nascosta';

        res.json({
            success: true,
            message: message,
            review: result.rows[0]
        });

    } catch (error) {
        console.error('Error toggling review visibility:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella modifica della visibilità della recensione'
        });
    }
});

// GET statistics for admin
router.get('/admin/stats', requireAuth, async (req, res) => {
    try {
        const pool = getPool();

        // Verifica che l'utente sia admin
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso negato'
            });
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN stato = 'attiva' THEN 1 END) as active_reviews,
                COUNT(CASE WHEN stato = 'nascosta' THEN 1 END) as hidden_reviews,
                AVG(valutazione) as average_rating,
                COUNT(DISTINCT cliente_id) as unique_reviewers,
                COUNT(DISTINCT artigiano_id) as reviewed_artisans
            FROM recensioni`;

        const result = await pool.query(statsQuery);

        res.json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching review statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
});

module.exports = router;