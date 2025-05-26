const express = require('express');
const router = express.Router();
const { pool } = require('../db/db'); // Fix pool import
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

// GET tutte le recensioni - pubblico
router.get('/', async (req, res) => {
    try {
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
            message: 'Errore nel recupero delle recensioni',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle recensioni'
        });
    }
});

// POST nuova recensione - solo utenti autenticati
router.post('/', requireAuth, async (req, res) => {
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

        // Verifica che il cliente non sia l'artigiano stesso
        if (cliente_id === artigiano_id) {
            return res.status(403).json({
                success: false,
                message: 'Non puoi recensire te stesso'
            });
        }

        // Verifica che l'artigiano esista
        const artisanCheck = await pool.query(
            'SELECT id FROM utente WHERE id = $1 AND ruolo_id = 2',
            [artigiano_id]
        );

        if (artisanCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigiano non trovato'
            });
        }

        // Inserisci la recensione
        const query = `
            INSERT INTO recensioni 
                (cliente_id, artigiano_id, valutazione, descrizione, data_recensione, stato)
            VALUES 
                ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'attiva')
            RETURNING *`;

        const result = await pool.query(query, [
            cliente_id,
            artigiano_id,
            valutazione,
            descrizione
        ]);

        // Recupera i dettagli completi della recensione appena creata
        const reviewDetails = await pool.query(`
            SELECT 
                r.*,
                c.nome as cliente_nome,
                c.cognome as cliente_cognome,
                a.nome as artigiano_nome,
                a.cognome as artigiano_cognome
            FROM recensioni r
            INNER JOIN utente c ON r.cliente_id = c.id
            INNER JOIN utente a ON r.artigiano_id = a.id
            WHERE r.recensione_id = $1`,
            [result.rows[0].recensione_id]
        );

        res.status(201).json({
            success: true,
            review: reviewDetails.rows[0]
        });

    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione della recensione',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// TODO: PUT modifica recensione - solo cliente che ha scritto la recensione e admin

module.exports = router;