const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

// Get users statistics
router.get('/stats/users', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(CASE WHEN ruolo_id = 1 THEN 1 END) as clients_count,
                COUNT(CASE WHEN ruolo_id = 2 THEN 1 END) as artisans_count
            FROM utente
            WHERE stato = 'attivo'`;
        
        const result = await pool.query(query);
        
        res.json({
            clientsCount: parseInt(result.rows[0].clients_count),
            artisansCount: parseInt(result.rows[0].artisans_count)
        });
    } catch (error) {
        console.error('Error fetching users stats:', error);
        res.status(500).json({ message: 'Errore nel recupero delle statistiche utenti' });
    }
});

// Get monthly orders count
router.get('/stats/orders', requireAuth, async (req, res) => {
    try {
        const query = `
            WITH RECURSIVE months AS (
                SELECT 1 as month
                UNION ALL
                SELECT month + 1 FROM months WHERE month < 12
            )
            SELECT 
                m.month,
                COALESCE(COUNT(o.ordine_id), 0) as count
            FROM months m
            LEFT JOIN ordini o ON EXTRACT(MONTH FROM o.data_ordine) = m.month
                AND EXTRACT(YEAR FROM o.data_ordine) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY m.month
            ORDER BY m.month`;

        const result = await pool.query(query);
        
        // Create array with 12 months
        const monthlyOrders = Array(12).fill(0);
        result.rows.forEach(row => {
            monthlyOrders[row.month - 1] = parseInt(row.count);
        });

        res.json(monthlyOrders);
    } catch (error) {
        console.error('Error fetching orders stats:', error);
        res.status(500).json({ message: 'Errore nel recupero statistiche ordini' });
    }
});

// Get categories stats
router.get('/stats/categories', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                t.nome_tipologia,
                COUNT(p.prodotto_id) as product_count
            FROM tipologia t
            LEFT JOIN prodotti p ON t.tipologia_id = p.tipologia_id
            GROUP BY t.tipologia_id, t.nome_tipologia
            ORDER BY product_count DESC`;

        const result = await pool.query(query);
        
        res.json({
            labels: result.rows.map(r => r.nome_tipologia),
            values: result.rows.map(r => parseInt(r.product_count))
        });
    } catch (error) {
        console.error('Error fetching categories stats:', error);
        res.status(500).json({ message: 'Errore nel recupero statistiche categorie' });
    }
});

/* User Management Routes */
// Get all users
router.get('/users', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id as utente_id,
                u.username,
                u.email,
                u.stato,
                COALESCE(
                    (SELECT data_inizio 
                     FROM sospensioni_utenti su 
                     WHERE su.utente_id = u.id 
                     AND su.data_fine IS NULL
                     ORDER BY data_inizio DESC 
                     LIMIT 1),
                    NULL
                ) as data_sospensione
            FROM utente u
            WHERE u.ruolo_id = 1 AND u.stato != 'eliminato'
            ORDER BY u.username`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Errore nel recupero degli utenti' });
    }
});

// Get specific user
router.get('/users/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT u.id, u.username, u.email, u.stato
            FROM utente u
            WHERE u.id = $1 AND u.ruolo_id = 1`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Errore nel recupero dell\'utente' });
    }
});

// Update user status
router.patch('/users/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            if (status === 'sospeso') {
                // Add suspension record with automatic end date after 3 days
                await client.query(`
                    INSERT INTO sospensioni_utenti (
                        utente_id, 
                        data_inizio, 
                        data_fine_prevista
                    )
                    VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '3 days')
                `, [id]);
            } else if (status === 'attivo') {
                // Admin is manually removing suspension
                await client.query(`
                    UPDATE sospensioni_utenti
                    SET data_fine = CURRENT_TIMESTAMP,
                        rimossa_da_admin = true
                    WHERE utente_id = $1 AND data_fine IS NULL
                `, [id]);
            }

            // Update user status
            const updateQuery = `
                UPDATE utente 
                SET stato = $1 
                WHERE id = $2 AND ruolo_id = 1 
                RETURNING id, username, email, stato`;

            const result = await client.query(updateQuery, [status, id]);

            if (result.rows.length === 0) {
                throw new Error('Utente non trovato');
            }

            await client.query('COMMIT');
            res.json(result.rows[0]);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Errore nella modifica dello stato utente' });
    }
});

// Get user reports count
router.get('/users/reports-count/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT COUNT(*) as report_count
            FROM segnalazioni s
            JOIN recensioni r ON s.recensione_id = r.recensione_id
            WHERE r.cliente_id = $1
            AND s.stato_segnalazione = 'in attesa'  -- Conta solo le segnalazioni non risolte
            GROUP BY r.cliente_id`;

        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            reportCount: result.rows.length > 0 ? parseInt(result.rows[0].report_count) : 0
        });

    } catch (error) {
        console.error('Error counting user reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel conteggio delle segnalazioni'
        });
    }
});

// Delete user (soft delete)
router.delete('/users/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            UPDATE utente 
            SET stato = 'eliminato' 
            WHERE id = $1 AND ruolo_id = 1 
            RETURNING *`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        res.json({ message: 'Utente eliminato con successo' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione dell\'utente' });
    }
});



/* Artisan Management Routes */
// Get all artisans
router.get('/artisans', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id as artisan_id,
                u.username,
                u.email,
                u.stato,
                a.artigiano_id,
                a.tipologia_id,
                t.nome_tipologia,
                (
                    SELECT COUNT(s.segnalazione_id) 
                    FROM segnalazioni s 
                    WHERE s.artigiano_id = a.artigiano_id
                ) as segnalazioni
            FROM utente u
            INNER JOIN artigiani a ON a.artigiano_id = u.id
            INNER JOIN tipologia t ON t.tipologia_id = a.tipologia_id
            WHERE u.ruolo_id = 2
            ORDER BY u.username`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching artisans:', error);
        res.status(500).json({ message: 'Errore nel recupero degli artigiani' });
    }
});

// Update artisan status
router.patch('/artisans/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update user status
            const updateQuery = `
                UPDATE utente 
                SET stato = $1 
                WHERE id = $2 AND ruolo_id = 2 
                RETURNING id, username, email, stato`;

            const result = await client.query(updateQuery, [status, id]);

            if (result.rows.length === 0) {
                throw new Error('Artigiano non trovato');
            }

            // Handle suspension tracking
            if (status === 'sospeso') {
                // Add new suspension record
                await client.query(`
                    INSERT INTO sospensioni_artigiani (artigiano_id, data_inizio)
                    VALUES ($1, CURRENT_TIMESTAMP)
                `, [id]);
            } else {
                // Close current suspension record
                await client.query(`
                    UPDATE sospensioni_artigiani
                    SET data_fine = CURRENT_TIMESTAMP
                    WHERE artigiano_id = $1 AND data_fine IS NULL
                `, [id]);
            }

            await client.query('COMMIT');
            res.json(result.rows[0]);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating artisan status:', error);
        res.status(500).json({ message: 'Errore nella modifica dello stato artigiano' });
    }
});

// Get suspended artisans with suspension history
router.get('/artisans/suspended', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id as artisan_id,
                u.username,
                u.email,
                u.stato,
                a.artigiano_id,
                t.nome_tipologia,
                (
                    SELECT COUNT(s.segnalazione_id) 
                    FROM segnalazioni s 
                    WHERE s.artigiano_id = a.artigiano_id
                ) as segnalazioni,
                (
                    SELECT COUNT(*) 
                    FROM sospensioni_artigiani sa 
                    WHERE sa.artigiano_id = a.artigiano_id
                ) as numero_sospensioni,
                (
                    SELECT sa.data_inizio 
                    FROM sospensioni_artigiani sa 
                    WHERE sa.artigiano_id = a.artigiano_id 
                    AND sa.data_fine IS NULL
                    ORDER BY sa.data_inizio DESC 
                    LIMIT 1
                ) as data_ultima_sospensione
            FROM utente u
            INNER JOIN artigiani a ON a.artigiano_id = u.id
            INNER JOIN tipologia t ON t.tipologia_id = a.tipologia_id
            WHERE u.ruolo_id = 2 AND u.stato = 'sospeso'
            ORDER BY data_ultima_sospensione DESC`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching suspended artisans:', error);
        res.status(500).json({ message: 'Errore nel recupero degli artigiani sospesi' });
    }
});



/* Reviews Management */
router.get('/reviews', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                r.recensione_id,
                c.username as cliente_nome,
                a.username as artigiano_nome,
                r.valutazione,
                r.descrizione as testo,
                r.data_recensione,
                r.stato,
                COUNT(s.segnalazione_id) as segnalazioni
            FROM recensioni r
            JOIN utente c ON r.cliente_id = c.id
            JOIN utente a ON r.artigiano_id = a.id
            LEFT JOIN segnalazioni s ON s.recensione_id = r.recensione_id
            GROUP BY r.recensione_id, c.username, a.username
            ORDER BY r.data_recensione DESC`;

        const result = await pool.query(query);
        res.json({ reviews: result.rows });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Errore nel recupero delle recensioni' });
    }
});

// Get review details
router.get('/reviews/:id/details', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                r.recensione_id,
                c.username as cliente_nome,
                a.username as artigiano_nome,
                r.valutazione,
                r.descrizione as testo,
                r.data_recensione,
                r.stato,
                COUNT(s.segnalazione_id) as segnalazioni
            FROM recensioni r
            JOIN utente c ON r.cliente_id = c.id
            JOIN utente a ON r.artigiano_id = a.id
            LEFT JOIN segnalazioni s ON s.recensione_id = r.recensione_id
            WHERE r.recensione_id = $1
            GROUP BY r.recensione_id, c.username, a.username`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Recensione non trovata' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching review details:', error);
        res.status(500).json({ message: 'Errore nel recupero dei dettagli della recensione' });
    }
});



/* Products Management */
router.get('/products', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.prodotto_id,
                p.nome_prodotto,
                p.tipologia_id,
                t.nome_tipologia,
                p.prezzo,
                p.quantita as quant,
                u.username as artigiano_nome,
                u.id as artigiano_id
            FROM prodotti p
            JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            JOIN utente u ON a.artigiano_id = u.id
            JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            ORDER BY p.nome_prodotto`;

        const result = await pool.query(query);
        res.json({ products: result.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Errore nel recupero dei prodotti' });
    }
});



/* Orders Management */
router.get('/orders', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.ordine_id as id,
                c.username as cliente_nome,
                a.username as artigiano_nome,
                o.data_ordine as data,
                o.stato,
                COALESCE(SUM(d.quantita * d.prezzo_unitario), 0) as totale
            FROM ordini o
            JOIN utente c ON o.cliente_id = c.id
            LEFT JOIN dettagli_ordine d ON o.ordine_id = d.ordine_id
            LEFT JOIN prodotti p ON d.prodotto_id = p.prodotto_id
            LEFT JOIN artigiani ar ON p.artigiano_id = ar.artigiano_id
            LEFT JOIN utente a ON ar.artigiano_id = a.id
            GROUP BY o.ordine_id, c.username, a.username
            ORDER BY o.data_ordine DESC`;

        const result = await pool.query(query);
        res.json({ orders: result.rows });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Errore nel recupero degli ordini' });
    }
});

// Get order details
router.get('/orders/:id/details', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                o.ordine_id,
                o.data_ordine as data,
                o.stato,
                c.username as cliente_nome,
                json_agg(json_build_object(
                    'nome_prodotto', p.nome_prodotto,
                    'quantita', d.quantita,
                    'prezzo_unitario', d.prezzo_unitario
                )) as products,
                SUM(d.quantita * d.prezzo_unitario) as totale
            FROM ordini o
            JOIN utente c ON o.cliente_id = c.id
            JOIN dettagli_ordine d ON o.ordine_id = d.ordine_id
            JOIN prodotti p ON d.prodotto_id = p.prodotto_id
            WHERE o.ordine_id = $1
            GROUP BY o.ordine_id, c.username`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ordine non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: 'Errore nel recupero dei dettagli dell\'ordine' });
    }
});



/* Reports Management */
// Get reports
router.get('/reports', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                s.segnalazione_id as id,
                s.ordine_id,
                s.recensione_id,
                s.artigiano_id,
                u_segnalatore.username as utente_nome,
                u_artigiano.username as artigiano_nome,
                r.cliente_id,
                s.motivazione as tipo,
                s.testo as descrizione,
                s.data_segnalazione as data,
                s.stato_segnalazione as stato
            FROM segnalazioni s
            JOIN utente u_segnalatore ON s.utente_segnalatore_id = u_segnalatore.id
            LEFT JOIN utente u_artigiano ON s.artigiano_id = u_artigiano.id
            LEFT JOIN recensioni r ON s.recensione_id = r.recensione_id
            ORDER BY s.data_segnalazione DESC`;

        const result = await pool.query(query);
        res.json({ reports: result.rows });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Errore nel recupero delle segnalazioni' });
    }
});

// Get report details
router.get('/reports/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                s.segnalazione_id,
                s.motivazione as tipo,
                s.testo as descrizione,
                s.data_segnalazione as data,
                s.stato_segnalazione as stato,
                u_artigiano.username as artigiano_nome,
                u_segnalatore.username as segnalatore_nome,
                s.artigiano_id
            FROM segnalazioni s
            JOIN utente u_artigiano ON s.artigiano_id = u_artigiano.id
            JOIN utente u_segnalatore ON s.utente_segnalatore_id = u_segnalatore.id
            WHERE s.segnalazione_id = $1`;

        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Segnalazione non trovata' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching report details:', error);
        res.status(500).json({ message: 'Errore nel recupero dei dettagli della segnalazione' });
    }
});

// Update report status
router.patch('/admin/:id/resolve', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if admin
        if (req.user.ruolo_id !== 3) {
            return res.status(403).json({
                success: false,
                message: 'Accesso non autorizzato'
            });
        }

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

// Get categories for dropdown menus
router.get('/categories', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT tipologia_id, nome_tipologia
            FROM tipologia
            ORDER BY nome_tipologia`;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Errore nel recupero delle categorie' });
    }
});



module.exports = router;