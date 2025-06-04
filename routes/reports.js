const express = require('express');
const router = express.Router();
const { pool } = require('../db/db'); // Fix pool import
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

// Get all reports (admin only)
router.get('/all', requireAuth, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso non autorizzato'
            });
        }

        const query = `
            SELECT 
                s.segnalazione_id as id,
                s.data_segnalazione as data,
                s.ordine_id,
                s.recensione_id,
                s.utente_id,
                s.testo as descrizione,
                s.motivazione as tipo,
                s.stato_segnalazione as stato,
                u.username as segnalatore_nome,
                CASE 
                    WHEN s.ordine_id IS NOT NULL THEN 'ordine'
                    WHEN s.recensione_id IS NOT NULL THEN 'recensione'
                    WHEN s.utente_id IS NOT NULL THEN 'artigiano'
                END as tipo_segnalazione,
                CASE
                    WHEN s.ordine_id IS NOT NULL THEN o.cliente_id
                    WHEN s.recensione_id IS NOT NULL THEN r.cliente_id
                    WHEN s.utente_id IS NOT NULL THEN art.artigiano_id
                END as target_id,
                CASE
                    WHEN s.ordine_id IS NOT NULL THEN c_ord.username
                    WHEN s.recensione_id IS NOT NULL THEN c_rev.username
                    WHEN s.utente_id IS NOT NULL THEN art_u.username
                END as target_nome
            FROM segnalazioni s
            JOIN utente u ON s.utente_id = u.id
            LEFT JOIN ordini o ON s.ordine_id = o.ordine_id
            LEFT JOIN recensioni r ON s.recensione_id = r.recensione_id
            LEFT JOIN utente art ON s.utente_id = art.id AND art.ruolo_id = 2
            LEFT JOIN artigiani art_info ON art.id = art_info.artigiano_id
            LEFT JOIN utente c_ord ON o.cliente_id = c_ord.id
            LEFT JOIN utente c_rev ON r.cliente_id = c_rev.id
            LEFT JOIN utente art_u ON art.id = art_u.id
            ORDER BY s.data_segnalazione DESC`;

        const result = await pool.query(query);
        res.json({ reports: result.rows });
    } catch (error) {
        console.error('Error fetching all reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle segnalazioni'
        });
    }
});

// Get segnalazioni dell'utente
router.get('/user', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                s.segnalazione_id,
                s.data_segnalazione,
                s.recensione_id,  
                s.testo,
                s.motivazione,
                s.stato_segnalazione
            FROM segnalazioni s
            WHERE s.utente_id = $1
            ORDER BY s.data_segnalazione DESC`;

        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (error) {
        // ...existing error handling...
    }
});

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

// POST /reports/order - Create order report
router.post('/order', requireAuth, async (req, res) => {
    try {
        const { order_id, reason, description } = req.body;
        const user_id = req.user.id;

        // Validation
        if (!order_id || !reason || !description) {
            return res.status(400).json({
                success: false,
                message: 'Tutti i campi sono richiesti'
            });
        }

        // Check if order exists and belongs to user
        const orderCheck = await pool.query(
            'SELECT ordine_id FROM ordini WHERE ordine_id = $1 AND cliente_id = $2',
            [order_id, user_id]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ordine non trovato o non autorizzato'
            });
        }

        // Insert report
        const result = await pool.query(`
            INSERT INTO segnalazioni (utente_id, ordine_id, testo, motivazione, stato_segnalazione)
            VALUES ($1, $2, $3, $4, 'in attesa')
            RETURNING segnalazione_id
        `, [user_id, order_id, description, reason]);

        res.status(201).json({
            success: true,
            message: 'Segnalazione inviata con successo',
            report_id: result.rows[0].segnalazione_id
        });

    } catch (error) {
        console.error('Error creating order report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'invio della segnalazione'
        });
    }
});

// Update report status (admin only)
router.patch('/admin/:id/resolve', requireAuth, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso non autorizzato'
            });
        }

        const { id } = req.params;
        
        const query = `
            UPDATE segnalazioni
            SET stato_segnalazione = 'risolta'
            WHERE segnalazione_id = $1
            RETURNING *`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Segnalazione non trovata'
            });
        }

        res.json({
            success: true,
            message: 'Segnalazione risolta con successo',
            report: result.rows[0]
        });

    } catch (error) {
        console.error('Error resolving report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella risoluzione della segnalazione'
        });
    }
});

// DELETE elimina segnalazione - solo utente che ha fatto la segnalazione
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Verifica proprietà della segnalazione
        const reportCheck = await pool.query(
            'SELECT segnalazione_id FROM segnalazioni WHERE segnalazione_id = $1 AND utente_id = $2',
            [id, user_id]
        );

        if (reportCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a eliminare questa segnalazione'
            });
        }

        await pool.query('DELETE FROM segnalazioni WHERE segnalazione_id = $1', [id]);

        res.json({
            success: true,
            message: 'Segnalazione eliminata con successo'
        });

    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della segnalazione'
        });
    }
});



module.exports = router;