const express = require('express');
const router = express.Router();
const { pool } = require('../db/db'); // Fix pool import
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

//TODO: GET tutte le recensioni - admin

// POST /reports/artisan - Create artisan report
router.post('/artisan', requireAuth, async (req, res) => {
    try {
        const { artisan_id, reason, description } = req.body;
        const user_id = req.user.id;

        // Validation
        if (!artisan_id || !reason || !description) {
            return res.status(400).json({
                success: false,
                message: 'Tutti i campi sono richiesti'
            });
        }

        // Check if artisan exists
        const artisanCheck = await pool.query(
            'SELECT artigiano_id FROM artigiani WHERE artigiano_id = $1',
            [artisan_id]
        );

        if (artisanCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigiano non trovato'
            });
        }

        // Insert report
        const result = await pool.query(`
            INSERT INTO segnalazioni (utente_id, recensione_id, testo, motivazione, stato_segnalazione)
            VALUES ($1, NULL, $2, $3, 'in attesa')
            RETURNING segnalazione_id
        `, [user_id, description, reason]);

        res.status(201).json({
            success: true,
            message: 'Segnalazione inviata con successo',
            report_id: result.rows[0].segnalazione_id
        });

    } catch (error) {
        console.error('Error creating artisan report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'invio della segnalazione'
        });
    }
});

// POST /reports/review - Create review report
router.post('/review', requireAuth, async (req, res) => {
    try {
        const { review_id, reason, description } = req.body;
        const user_id = req.user.id;

        // Validation
        if (!review_id || !reason || !description) {
            return res.status(400).json({
                success: false,
                message: 'Tutti i campi sono richiesti'
            });
        }

        // Check if review exists
        const reviewCheck = await pool.query(
            'SELECT recensione_id FROM recensioni WHERE recensione_id = $1',
            [review_id]
        );

        if (reviewCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recensione non trovata'
            });
        }

        // Insert report
        const result = await pool.query(`
            INSERT INTO segnalazioni (utente_id, recensione_id, testo, motivazione, stato_segnalazione)
            VALUES ($1, $2, $3, $4, 'in attesa')
            RETURNING segnalazione_id
        `, [user_id, review_id, description, reason]);

        res.status(201).json({
            success: true,
            message: 'Segnalazione inviata con successo',
            report_id: result.rows[0].segnalazione_id
        });

    } catch (error) {
        console.error('Error creating review report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'invio della segnalazione'
        });
    }
});

//TODO: PUT modifica segnalazione - admin

//TODO: DELETE elimina segnalazione - admin



module.exports = router;