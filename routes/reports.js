const express = require('express');
const router = express.Router();
const { getPool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// Get all reports (admin only)
router.get('/all', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso non autorizzato'
            });
        }

        const query = `
            SELECT 
                s.segnalazione_id,
                s.data_segnalazione,
                s.ordine_id,
                s.recensione_id,
                s.artigiano_id,
                s.testo,
                s.motivazione,
                s.stato_segnalazione,
                s.utente_segnalatore_id,
                us.username as segnalatore_username,
                CASE 
                    WHEN s.ordine_id IS NOT NULL THEN 'ordine'
                    WHEN s.recensione_id IS NOT NULL THEN 'recensione'
                    WHEN s.artigiano_id IS NOT NULL THEN 'artigiano'
                END as tipo_segnalazione,
                CASE 
                    WHEN s.ordine_id IS NOT NULL THEN o.cliente_id
                    WHEN s.recensione_id IS NOT NULL THEN r.cliente_id
                    WHEN s.artigiano_id IS NOT NULL THEN a.utente_id
                END as target_id
            FROM segnalazioni s
            JOIN utente us ON s.utente_segnalatore_id = us.id
            LEFT JOIN ordini o ON s.ordine_id = o.ordine_id
            LEFT JOIN recensioni r ON s.recensione_id = r.recensione_id
            LEFT JOIN artigiani a ON s.artigiano_id = a.artigiano_id
            WHERE s.stato_segnalazione = 'in attesa'
            ORDER BY s.data_segnalazione DESC`;

        const result = await client.query(query);
        
        res.json({
            success: true,
            reports: result.rows
        });

    } catch (error) {
        console.error('Error fetching all reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle segnalazioni'
        });
    } finally {
        client.release();
    }
});

// Get user's reports
router.get('/user', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const query = `
            SELECT 
                s.segnalazione_id,
                s.data_segnalazione,
                s.ordine_id,
                s.recensione_id,
                s.artigiano_id,
                s.testo,
                s.motivazione,
                s.stato_segnalazione
            FROM segnalazioni s
            WHERE s.utente_segnalatore_id = $1
            ORDER BY s.data_segnalazione DESC`;

        const result = await client.query(query, [req.user.id]);
        res.json({
            success: true,
            reports: result.rows
        });

    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle segnalazioni'
        });
    } finally {
        client.release();
    }
});

// Create artisan report
router.post('/artisan', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { artisan_id, reason, description } = req.body;
        
        await client.query('BEGIN');

        // Check if artisan exists and is active
        const artisanCheck = await client.query(
            `SELECT a.artigiano_id 
             FROM artigiani a
             JOIN utente u ON a.artigiano_id = u.id
             WHERE a.artigiano_id = $1 AND u.stato = 'attivo'`,
            [artisan_id]
        );

        if (artisanCheck.rows.length === 0) {
            throw new Error('Artigiano non trovato o non attivo');
        }

        // Create report
        const result = await client.query(`
            INSERT INTO segnalazioni (
                utente_segnalatore_id,
                artigiano_id,
                testo,
                motivazione,
                stato_segnalazione
            )
            VALUES ($1, $2, $3, $4, 'in attesa')
            RETURNING segnalazione_id`,
            [req.user.id, artisan_id, description, reason]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Segnalazione inviata con successo',
            report_id: result.rows[0].segnalazione_id
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating artisan report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore durante l\'invio della segnalazione'
        });
    } finally {
        client.release();
    }
});

// POST /reports/review - Create review report
router.post('/review', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { review_id, reason, description } = req.body;
        const segnalatore_id = req.user.id;

        // Validation
        if (!review_id || !reason || !description) {
            return res.status(400).json({
                success: false,
                message: 'Tutti i campi sono richiesti'
            });
        }

        await client.query('BEGIN');

        // Check if review exists and is active
        const reviewCheck = await client.query(
            `SELECT r.recensione_id 
             FROM recensioni r
             WHERE r.recensione_id = $1 AND r.stato = 'attiva'`,
            [review_id]
        );

        if (reviewCheck.rows.length === 0) {
            throw new Error('Recensione non trovata o non attiva');
        }

        // Insert report
        const result = await client.query(`
            INSERT INTO segnalazioni (
                utente_segnalatore_id, 
                recensione_id,
                testo, 
                motivazione, 
                stato_segnalazione
            )
            VALUES ($1, $2, $3, $4, 'in attesa')
            RETURNING segnalazione_id
        `, [segnalatore_id, review_id, description, reason]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Segnalazione inviata con successo',
            report_id: result.rows[0].segnalazione_id
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating review report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore durante l\'invio della segnalazione'
        });
    } finally {
        client.release();
    }
});

// POST /reports/order - Create order report
router.post('/order', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { order_id, reason, description } = req.body;
        const user_id = req.user.id;

        await client.query('BEGIN');

        // Check if order exists and belongs to user
        const orderCheck = await client.query(
            `SELECT o.ordine_id 
            FROM ordini o
            WHERE o.ordine_id = $1 
            AND o.cliente_id = $2`,
            [order_id, user_id]
        );

        if (orderCheck.rows.length === 0) {
            throw new Error('Ordine non trovato o non idoneo per segnalazione');
        }

        // Insert report without changing order status
        await client.query(`
            INSERT INTO segnalazioni (
                utente_segnalatore_id, 
                ordine_id, 
                testo, 
                motivazione, 
                stato_segnalazione
            )
            VALUES ($1, $2, $3, $4, 'in attesa')
        `, [user_id, order_id, description, reason]);

        // Removed the order status update

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Segnalazione inviata con successo'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore durante l\'invio della segnalazione'
        });
    } finally {
        client.release();
    }
});

// Update report status (admin only)
router.patch('/admin/:id/resolve', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso non autorizzato'
            });
        }

        const { id } = req.params;
        
        await client.query('BEGIN');

        const query = `
            UPDATE segnalazioni
            SET 
                stato_segnalazione = 'risolta',
                data_risoluzione = CURRENT_TIMESTAMP
            WHERE segnalazione_id = $1
            RETURNING *`;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error('Segnalazione non trovata');
        }

        // If it's an order report, update order status
        if (result.rows[0].ordine_id) {
            await client.query(
                `UPDATE ordini 
                 SET stato = 'completato' 
                 WHERE ordine_id = $1`,
                [result.rows[0].ordine_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Segnalazione risolta con successo',
            report: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resolving report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nella risoluzione della segnalazione'
        });
    } finally {
        client.release();
    }
});

// DELETE elimina segnalazione - solo utente che ha fatto la segnalazione
router.delete('/:id', requireAuth, async (req, res) => {
    const client = await getPool().connect();
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        await client.query('BEGIN');

        // Verifica proprietà della segnalazione
        const reportCheck = await client.query(
            `SELECT s.* 
             FROM segnalazioni s
             WHERE s.segnalazione_id = $1 
             AND s.utente_segnalatore_id = $2
             AND s.stato_segnalazione = 'in attesa'`,
            [id, user_id]
        );

        if (reportCheck.rows.length === 0) {
            throw new Error('Segnalazione non trovata o non modificabile');
        }

        await client.query('DELETE FROM segnalazioni WHERE segnalazione_id = $1', [id]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Segnalazione eliminata con successo'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting report:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nell\'eliminazione della segnalazione'
        });
    } finally {
        client.release();
    }
});

module.exports = router;