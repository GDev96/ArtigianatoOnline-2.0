const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool'); // Usa pool corretto
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

/* ========== STATISTICS ROUTES ========== */

// Get users statistics
router.get('/stats/users', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const query = `
            SELECT 
                COUNT(CASE WHEN ruolo_id = 1 THEN 1 END) as clients_count,
                COUNT(CASE WHEN ruolo_id = 2 THEN 1 END) as artisans_count,
                COUNT(CASE WHEN stato = 'sospeso' AND ruolo_id = 1 THEN 1 END) as suspended_clients,
                COUNT(CASE WHEN stato = 'sospeso' AND ruolo_id = 2 THEN 1 END) as suspended_artisans
            FROM utente
            WHERE stato != 'eliminato'`;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: {
                clientsCount: parseInt(result.rows[0].clients_count) || 0,
                artisansCount: parseInt(result.rows[0].artisans_count) || 0,
                suspendedClients: parseInt(result.rows[0].suspended_clients) || 0,
                suspendedArtisans: parseInt(result.rows[0].suspended_artisans) || 0
            }
        });
    } catch (error) {
        console.error('Error fetching users stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero delle statistiche utenti' 
        });
    }
});

// Get monthly orders count
router.get('/stats/orders', requireAuth, async (req, res) => {
    const pool = getPool();
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

        res.json({
            success: true,
            data: monthlyOrders
        });
    } catch (error) {
        console.error('Error fetching orders stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero statistiche ordini' 
        });
    }
});

// Get categories stats
router.get('/stats/categories', requireAuth, async (req, res) => {
    const pool = getPool();
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
            success: true,
            data: {
                labels: result.rows.map(r => r.nome_tipologia),
                values: result.rows.map(r => parseInt(r.product_count))
            }
        });
    } catch (error) {
        console.error('Error fetching categories stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero statistiche categorie' 
        });
    }
});

/* ========== USER MANAGEMENT ROUTES ========== */

// Get all users with pagination and filters
router.get('/users', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['u.ruolo_id = 1', "u.stato != 'eliminato'"];
        let queryParams = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            whereConditions.push(`u.stato = $${paramCount}`);
            queryParams.push(status);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`(u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM utente u
            WHERE ${whereClause}`;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated users
        const query = `
            SELECT 
                u.id as utente_id,
                u.username,
                u.email,
                u.stato,
                u.nome,
                u.cognome,
                u.citta,
                COALESCE(
                    (SELECT data_inizio 
                     FROM sospensioni_utenti su 
                     WHERE su.utente_id = u.id 
                     AND su.data_fine IS NULL
                     ORDER BY data_inizio DESC 
                     LIMIT 1),
                    NULL
                ) as data_sospensione,
                (
                    SELECT COUNT(*) 
                    FROM segnalazioni s 
                    JOIN recensioni r ON s.recensione_id = r.recensione_id 
                    WHERE r.cliente_id = u.id AND s.stato_segnalazione = 'in attesa'
                ) as pending_reports
            FROM utente u
            WHERE ${whereClause}
            ORDER BY u.username
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

        queryParams.push(limit, offset);
        const result = await pool.query(query, queryParams);

        res.json({
            success: true,
            data: {
                users: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero degli utenti' 
        });
    }
});

// Get specific user
router.get('/users/:id', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.stato,
                u.nome,
                u.cognome,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                (
                    SELECT COUNT(*) 
                    FROM ordini o 
                    WHERE o.cliente_id = u.id
                ) as total_orders,
                (
                    SELECT COUNT(*) 
                    FROM recensioni r 
                    WHERE r.cliente_id = u.id
                ) as total_reviews,
                (
                    SELECT COUNT(*) 
                    FROM segnalazioni s 
                    JOIN recensioni r ON s.recensione_id = r.recensione_id 
                    WHERE r.cliente_id = u.id
                ) as total_reports
            FROM utente u
            WHERE u.id = $1 AND u.ruolo_id = 1`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Utente non trovato' 
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero dell\'utente' 
        });
    }
});

// Update user status
router.patch('/users/:id/status', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['attivo', 'sospeso'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido'
            });
        }

        await client.query('BEGIN');

        // Handle suspension logic
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
        
        res.json({
            success: true,
            message: `Stato utente aggiornato a ${status}`,
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nella modifica dello stato utente' 
        });
    } finally {
        client.release();
    }
});

// Get user reports count
router.get('/users/:userId/reports-count', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { userId } = req.params;

        const query = `
            SELECT COUNT(*) as report_count
            FROM segnalazioni s
            JOIN recensioni r ON s.recensione_id = r.recensione_id
            WHERE r.cliente_id = $1
            AND s.stato_segnalazione = 'in attesa'`;

        const result = await pool.query(query, [userId]);
        
        res.json({
            success: true,
            data: {
                reportCount: parseInt(result.rows[0].report_count) || 0
            }
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
    const pool = getPool();
    try {
        const { id } = req.params;

        const query = `
            UPDATE utente 
            SET stato = 'eliminato' 
            WHERE id = $1 AND ruolo_id = 1 
            RETURNING id, username`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Utente non trovato' 
            });
        }

        res.json({ 
            success: true,
            message: 'Utente eliminato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nell\'eliminazione dell\'utente' 
        });
    }
});

/* ========== ARTISAN MANAGEMENT ROUTES ========== */

// Get all artisans with pagination and filters
router.get('/artisans', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { page = 1, limit = 20, status, category, search } = req.query;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['u.ruolo_id = 2'];
        let queryParams = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            whereConditions.push(`u.stato = $${paramCount}`);
            queryParams.push(status);
        }

        if (category && category !== 'all') {
            paramCount++;
            whereConditions.push(`a.tipologia_id = $${paramCount}`);
            queryParams.push(category);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`(u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM utente u
            INNER JOIN artigiani a ON a.artigiano_id = u.id
            WHERE ${whereClause}`;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated artisans
        const query = `
            SELECT 
                u.id as artisan_id,
                u.username,
                u.email,
                u.stato,
                u.nome,
                u.cognome,
                u.citta,
                a.artigiano_id,
                a.tipologia_id,
                t.nome_tipologia,
                (
                    SELECT COUNT(s.segnalazione_id) 
                    FROM segnalazioni s 
                    WHERE s.artigiano_id = a.artigiano_id 
                    AND s.stato_segnalazione = 'in attesa'
                ) as pending_reports,
                (
                    SELECT COUNT(p.prodotto_id)
                    FROM prodotti p 
                    WHERE p.artigiano_id = a.artigiano_id
                ) as total_products,
                (
                    SELECT AVG(r.valutazione)::NUMERIC(3,2)
                    FROM recensioni r 
                    WHERE r.artigiano_id = a.artigiano_id
                ) as avg_rating
            FROM utente u
            INNER JOIN artigiani a ON a.artigiano_id = u.id
            INNER JOIN tipologia t ON t.tipologia_id = a.tipologia_id
            WHERE ${whereClause}
            ORDER BY u.username
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

        queryParams.push(limit, offset);
        const result = await pool.query(query, queryParams);

        res.json({
            success: true,
            data: {
                artisans: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching artisans:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero degli artigiani' 
        });
    }
});

// Update artisan status
router.patch('/artisans/:id/status', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['attivo', 'sospeso'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido'
            });
        }

        await client.query('BEGIN');

        // Handle suspension logic
        if (status === 'sospeso') {
            // Add suspension record with automatic end date after 3 days
            await client.query(`
                INSERT INTO sospensioni_artigiani (
                    artigiano_id, 
                    data_inizio, 
                    data_fine_prevista
                )
                VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '3 days')
            `, [id]);
        } else if (status === 'attivo') {
            // Admin is manually removing suspension
            await client.query(`
                UPDATE sospensioni_artigiani
                SET data_fine = CURRENT_TIMESTAMP,
                    rimossa_da_admin = true
                WHERE artigiano_id = $1 AND data_fine IS NULL
            `, [id]);
        }

        // Update artisan status
        const updateQuery = `
            UPDATE utente 
            SET stato = $1 
            WHERE id = $2 AND ruolo_id = 2 
            RETURNING id, username, email, stato`;

        const result = await client.query(updateQuery, [status, id]);

        if (result.rows.length === 0) {
            throw new Error('Artigiano non trovato');
        }

        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Stato artigiano aggiornato a ${status}`,
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating artisan status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nella modifica dello stato artigiano' 
        });
    } finally {
        client.release();
    }
});

// Get artisan reports count
router.get('/artisans/:id/reports-count', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { id } = req.params;

        const query = `
            SELECT COUNT(*) as report_count
            FROM segnalazioni s
            WHERE s.artigiano_id = $1
            AND s.stato_segnalazione = 'in attesa'`;

        const result = await pool.query(query, [id]);
        
        res.json({
            success: true,
            data: {
                reportCount: parseInt(result.rows[0].report_count) || 0
            }
        });

    } catch (error) {
        console.error('Error counting artisan reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel conteggio delle segnalazioni'
        });
    }
});

// Get suspended artisans with suspension history
router.get('/artisans/suspended', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const query = `
            SELECT 
                u.id as artisan_id,
                u.username,
                u.email,
                u.stato,
                t.nome_tipologia,
                (
                    SELECT COUNT(*) 
                    FROM sospensioni_artigiani sa 
                    WHERE sa.artigiano_id = a.artigiano_id
                ) as numero_sospensioni,
                (
                    SELECT data_inizio 
                    FROM sospensioni_artigiani sa 
                    WHERE sa.artigiano_id = a.artigiano_id 
                    AND sa.data_fine IS NULL 
                    ORDER BY sa.data_inizio DESC 
                    LIMIT 1
                ) as data_ultima_sospensione,
                (
                    SELECT data_fine_prevista 
                    FROM sospensioni_artigiani sa 
                    WHERE sa.artigiano_id = a.artigiano_id 
                    AND sa.data_fine IS NULL 
                    ORDER BY sa.data_inizio DESC 
                    LIMIT 1
                ) as data_fine_prevista
            FROM utente u
            JOIN artigiani a ON a.artigiano_id = u.id
            JOIN tipologia t ON t.tipologia_id = a.tipologia_id
            WHERE u.stato = 'sospeso'
            AND u.ruolo_id = 2
            ORDER BY data_ultima_sospensione DESC NULLS LAST`;

        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching suspended artisans:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero degli artigiani sospesi' 
        });
    }
});

/* ========== REVIEWS MANAGEMENT ========== */

// Get all reviews with pagination and filters
router.get('/reviews', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { page = 1, limit = 20, status, rating } = req.query;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        let queryParams = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            whereConditions.push(`r.stato = $${paramCount}`);
            queryParams.push(status);
        }

        if (rating && rating !== 'all') {
            paramCount++;
            whereConditions.push(`r.valutazione = $${paramCount}`);
            queryParams.push(rating);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM recensioni r
            WHERE ${whereClause}`;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated reviews
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
            LEFT JOIN segnalazioni s ON s.recensione_id = r.recensione_id AND s.stato_segnalazione = 'in attesa'
            WHERE ${whereClause}
            GROUP BY r.recensione_id, c.username, a.username, r.valutazione, r.descrizione, r.data_recensione, r.stato
            ORDER BY r.data_recensione DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

        queryParams.push(limit, offset);
        const result = await pool.query(query, queryParams);

        res.json({
            success: true,
            data: {
                reviews: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero delle recensioni' 
        });
    }
});

// Get review details
router.get('/reviews/:id/details', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                r.recensione_id,
                c.username as cliente_nome,
                c.email as cliente_email,
                a.username as artigiano_nome,
                a.email as artigiano_email,
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
            GROUP BY r.recensione_id, c.username, c.email, a.username, a.email`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Recensione non trovata' 
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching review details:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero dei dettagli della recensione' 
        });
    }
});

// Hide/Unhide review
router.patch('/reviews/:id/toggle-visibility', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Get current status
        const currentQuery = `
            SELECT stato FROM recensioni WHERE recensione_id = $1`;
        const currentResult = await client.query(currentQuery, [req.params.id]);

        if (currentResult.rows.length === 0) {
            throw new Error('Recensione non trovata');
        }

        const currentStatus = currentResult.rows[0].stato;
        const newStatus = currentStatus === 'attiva' ? 'nascosta' : 'attiva';

        // Update review status
        const updateQuery = `
            UPDATE recensioni 
            SET stato = $1
            WHERE recensione_id = $2
            RETURNING *`;

        const result = await client.query(updateQuery, [newStatus, req.params.id]);

        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Recensione ${newStatus === 'nascosta' ? 'nascosta' : 'ripristinata'} con successo`,
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error toggling review visibility:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella modifica della visibilità della recensione'
        });
    } finally {
        client.release();
    }
});

/* ========== PRODUCTS MANAGEMENT ========== */

// Get all products with pagination and filters
router.get('/products', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { page = 1, limit = 20, category, artisan, search } = req.query;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        let queryParams = [];
        let paramCount = 0;

        if (category && category !== 'all') {
            paramCount++;
            whereConditions.push(`p.tipologia_id = $${paramCount}`);
            queryParams.push(category);
        }

        if (artisan) {
            paramCount++;
            whereConditions.push(`u.username ILIKE $${paramCount}`);
            queryParams.push(`%${artisan}%`);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`p.nome_prodotto ILIKE $${paramCount}`);
            queryParams.push(`%${search}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM prodotti p
            JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            JOIN utente u ON a.artigiano_id = u.id
            JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            WHERE ${whereClause}`;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated products
        const query = `
            SELECT 
                p.prodotto_id,
                p.nome_prodotto,
                p.tipologia_id,
                t.nome_tipologia,
                p.prezzo,
                p.quantita as quant,
                u.username as artigiano_nome,
                u.id as artigiano_id,
                u.stato as artigiano_stato
            FROM prodotti p
            JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            JOIN utente u ON a.artigiano_id = u.id
            JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            WHERE ${whereClause}
            ORDER BY p.nome_prodotto
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

        queryParams.push(limit, offset);
        const result = await pool.query(query, queryParams);

        res.json({
            success: true,
            data: {
                products: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero dei prodotti' 
        });
    }
});

// Get product details
router.get('/products/:id/details', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                p.prodotto_id,
                p.nome_prodotto,
                p.prezzo,
                p.quantita,
                t.nome_tipologia,
                u.username as artigiano_nome,
                u.email as artigiano_email,
                u.stato as artigiano_stato,
                (
                    SELECT COUNT(*)
                    FROM dettagli_ordine d
                    WHERE d.prodotto_id = p.prodotto_id
                ) as total_sold
            FROM prodotti p
            JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            JOIN utente u ON a.artigiano_id = u.id
            JOIN tipologia t ON p.tipologia_id = t.tipologia_id
            WHERE p.prodotto_id = $1`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Prodotto non trovato' 
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero dei dettagli del prodotto' 
        });
    }
});

/* ========== ORDERS MANAGEMENT ========== */
// Get all orders with pagination and filters
router.get('/orders', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        let queryParams = [];
        
        // Build dynamic WHERE conditions properly
        if (status && status !== 'all') {
            queryParams.push(status);
            whereConditions.push(`o.stato = $${queryParams.length}`);
        }
        
        if (search) {
            queryParams.push(`%${search}%`);
            whereConditions.push(`c.username ILIKE $${queryParams.length}`);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Get total count
        const countQuery = `
            SELECT COUNT(DISTINCT o.ordine_id) as total
            FROM ordini o
            JOIN utente c ON o.cliente_id = c.id
            WHERE ${whereClause}`;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        
        // Add pagination parameters
        queryParams.push(limit, offset);
        
        // Get paginated orders
        const query = `
            SELECT
                o.ordine_id as id,
                c.username as cliente_nome,
                o.data_ordine as data,
                o.stato,
                COALESCE(o.has_reports, false) as has_reports,
                COALESCE(SUM(d.quantita * d.prezzo_unitario), 0) as totale,
                COUNT(DISTINCT d.prodotto_id) as numero_prodotti
            FROM ordini o
            JOIN utente c ON o.cliente_id = c.id
            LEFT JOIN dettagli_ordine d ON o.ordine_id = d.ordine_id
            WHERE ${whereClause}
            GROUP BY o.ordine_id, c.username, o.data_ordine, o.stato, o.has_reports
            ORDER BY o.data_ordine DESC
            LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            data: {
                orders: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli ordini'
        });
    }
});

// Get order details
router.get('/orders/:id/details', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { id } = req.params;
        
        const query = `
            SELECT
                o.ordine_id,
                o.data_ordine as data,
                o.stato,
                COALESCE(o.has_reports, false) as has_reports,
                c.username as cliente_nome,
                c.email as cliente_email,
                c.indirizzo as cliente_indirizzo,
                c.citta as cliente_citta,
                json_agg(json_build_object(
                    'prodotto_id', p.prodotto_id,
                    'nome_prodotto', p.nome_prodotto,
                    'quantita', d.quantita,
                    'prezzo_unitario', d.prezzo_unitario,
                    'subtotale', d.quantita * d.prezzo_unitario,
                    'artigiano_nome', u.username
                )) as products,
                SUM(d.quantita * d.prezzo_unitario) as totale
            FROM ordini o
            JOIN utente c ON o.cliente_id = c.id
            JOIN dettagli_ordine d ON o.ordine_id = d.ordine_id
            JOIN prodotti p ON d.prodotto_id = p.prodotto_id
            JOIN artigiani a ON p.artigiano_id = a.artigiano_id
            JOIN utente u ON a.artigiano_id = u.id
            WHERE o.ordine_id = $1
            GROUP BY o.ordine_id, c.username, c.email, c.indirizzo, c.citta, o.data_ordine, o.stato, o.has_reports`;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ordine non trovato'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dettagli dell\'ordine'
        });
    }
});

/* ========== REPORTS MANAGEMENT ========== */
// Get all reports with pagination and filters
router.get('/reports', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { page = 1, limit = 20, status, type } = req.query;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        let queryParams = [];
        
        // Build dynamic WHERE conditions properly
        if (status && status !== 'all') {
            queryParams.push(status);
            whereConditions.push(`s.stato_segnalazione = $${queryParams.length}`);
        }
        
        if (type && type !== 'all') {
            if (type === 'order') {
                whereConditions.push(`s.ordine_id IS NOT NULL`);
            } else if (type === 'review') {
                whereConditions.push(`s.recensione_id IS NOT NULL`);
            } else if (type === 'artisan') {
                whereConditions.push(`s.artigiano_id IS NOT NULL AND s.ordine_id IS NULL AND s.recensione_id IS NULL`);
            }
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM segnalazioni s
            WHERE ${whereClause}`;
        
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        
        // Add pagination parameters
        queryParams.push(limit, offset);
        
        // Get paginated reports
        const query = `
            SELECT
                s.segnalazione_id as id,
                s.ordine_id,
                s.recensione_id,
                s.artigiano_id,
                u_segnalatore.username as utente_nome,
                COALESCE(u_artigiano.username, '') as artigiano_nome,
                r.cliente_id,
                s.motivazione as tipo,
                s.testo as descrizione,
                s.data_segnalazione as data,
                s.stato_segnalazione as stato,
                CASE
                    WHEN s.ordine_id IS NOT NULL THEN 'Ordine'
                    WHEN s.recensione_id IS NOT NULL THEN 'Recensione'
                    WHEN s.artigiano_id IS NOT NULL THEN 'Artigiano'
                    ELSE 'Altro'
                END as tipo_segnalazione
            FROM segnalazioni s
            JOIN utente u_segnalatore ON s.utente_segnalatore_id = u_segnalatore.id
            LEFT JOIN utente u_artigiano ON s.artigiano_id = u_artigiano.id
            LEFT JOIN recensioni r ON s.recensione_id = r.recensione_id
            WHERE ${whereClause}
            ORDER BY s.data_segnalazione DESC
            LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            data: {
                reports: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle segnalazioni'
        });
    }
});

// Get report details
router.get('/reports/:id', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { id } = req.params;
        
        const query = `
            SELECT
                s.segnalazione_id,
                s.ordine_id,
                s.recensione_id,
                s.artigiano_id,
                s.motivazione as tipo,
                s.testo as descrizione,
                s.data_segnalazione as data,
                s.stato_segnalazione as stato,
                u_segnalatore.username as segnalatore_nome,
                u_segnalatore.email as segnalatore_email,
                COALESCE(u_artigiano.username, '') as artigiano_nome,
                COALESCE(u_artigiano.email, '') as artigiano_email,
                CASE
                    WHEN s.ordine_id IS NOT NULL THEN 'Ordine'
                    WHEN s.recensione_id IS NOT NULL THEN 'Recensione'
                    WHEN s.artigiano_id IS NOT NULL THEN 'Artigiano'
                    ELSE 'Altro'
                END as tipo_segnalazione,
                -- Dettagli aggiuntivi in base al tipo
                CASE
                    WHEN s.ordine_id IS NOT NULL THEN (
                        SELECT json_build_object(
                            'data_ordine', o.data_ordine,
                            'stato_ordine', o.stato,
                            'totale', COALESCE(SUM(d.quantita * d.prezzo_unitario), 0)
                        )
                        FROM ordini o
                        LEFT JOIN dettagli_ordine d ON o.ordine_id = d.ordine_id
                        WHERE o.ordine_id = s.ordine_id
                        GROUP BY o.ordine_id, o.data_ordine, o.stato
                    )
                    WHEN s.recensione_id IS NOT NULL THEN (
                        SELECT json_build_object(
                            'valutazione', r.valutazione,
                            'testo_recensione', r.descrizione,
                            'data_recensione', r.data_recensione
                        )
                        FROM recensioni r
                        WHERE r.recensione_id = s.recensione_id
                    )
                    ELSE NULL
                END as dettagli_aggiuntivi
            FROM segnalazioni s
            JOIN utente u_segnalatore ON s.utente_segnalatore_id = u_segnalatore.id
            LEFT JOIN utente u_artigiano ON s.artigiano_id = u_artigiano.id
            WHERE s.segnalazione_id = $1`;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Segnalazione non trovata'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching report details:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dettagli della segnalazione'
        });
    }
});

// Resolve report
router.patch('/reports/:id/resolve', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get report details
        const reportQuery = `
            SELECT ordine_id, stato_segnalazione
            FROM segnalazioni
            WHERE segnalazione_id = $1`;
        
        const reportResult = await client.query(reportQuery, [req.params.id]);
        
        if (reportResult.rows.length === 0) {
            throw new Error('Segnalazione non trovata');
        }
        
        const { ordine_id, stato_segnalazione } = reportResult.rows[0];
        
        if (stato_segnalazione === 'risolta') {
            return res.status(400).json({
                success: false,
                message: 'Segnalazione già risolta'
            });
        }
        
        // Update report status
        const updateQuery = `
            UPDATE segnalazioni
            SET stato_segnalazione = 'risolta'
            WHERE segnalazione_id = $1
            RETURNING *`;
        
        const result = await client.query(updateQuery, [req.params.id]);
        
        // If it's an order report, reset the order status
        if (ordine_id) {
            const updateOrderQuery = `
                UPDATE ordini
                SET stato = 'in preparazione',
                    has_reports = false
                WHERE ordine_id = $1`;
            
            await client.query(updateOrderQuery, [ordine_id]);
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Segnalazione risolta con successo',
            data: result.rows[0]
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

// Bulk resolve reports
router.patch('/reports/bulk-resolve', requireAuth, async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        const { reportIds } = req.body;
        
        if (!Array.isArray(reportIds) || reportIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Lista di segnalazioni non valida'
            });
        }
        
        await client.query('BEGIN');
        
        // Get order IDs for the reports
        const orderQuery = `
            SELECT DISTINCT ordine_id
            FROM segnalazioni
            WHERE segnalazione_id = ANY($1) AND ordine_id IS NOT NULL`;
        
        const orderResult = await client.query(orderQuery, [reportIds]);
        const orderIds = orderResult.rows.map(row => row.ordine_id);
        
        // Update all reports
        const updateQuery = `
            UPDATE segnalazioni
            SET stato_segnalazione = 'risolta'
            WHERE segnalazione_id = ANY($1) AND stato_segnalazione = 'in attesa'
            RETURNING segnalazione_id`;
        
        const result = await client.query(updateQuery, [reportIds]);
        
        // Update related orders
        if (orderIds.length > 0) {
            const updateOrdersQuery = `
                UPDATE ordini
                SET stato = 'in preparazione',
                    has_reports = false
                WHERE ordine_id = ANY($1)`;
            
            await client.query(updateOrdersQuery, [orderIds]);
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `${result.rows.length} segnalazioni risolte con successo`,
            data: {
                resolvedCount: result.rows.length,
                resolvedIds: result.rows.map(row => row.segnalazione_id)
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error bulk resolving reports:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella risoluzione delle segnalazioni'
        });
    } finally {
        client.release();
    }
});

/* ========== UTILITY ROUTES ========== */
// Get categories for dropdown menus
router.get('/categories', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const query = `
            SELECT tipologia_id, nome_tipologia
            FROM tipologia
            ORDER BY nome_tipologia`;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle categorie'
        });
    }
});

// Get system health/status
router.get('/system/health', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        // Test database connection
        const dbTest = await pool.query('SELECT NOW() as server_time');
        
        // Get some basic stats
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM utente WHERE stato = 'attivo') as active_users,
                (SELECT COUNT(*) FROM ordini WHERE data_ordine >= CURRENT_DATE - INTERVAL '30 days') as recent_orders,
                (SELECT COUNT(*) FROM segnalazioni WHERE stato_segnalazione = 'in attesa') as pending_reports`;
        
        const stats = await pool.query(statsQuery);
        
        res.json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                server_time: dbTest.rows[0].server_time,
                statistics: stats.rows[0]
            }
        });
        
    } catch (error) {
        console.error('Error checking system health:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel controllo dello stato del sistema',
            data: {
                status: 'unhealthy',
                database: 'disconnected'
            }
        });
    }
});

// Export data (basic implementation)
router.get('/export/:type', requireAuth, async (req, res) => {
    const pool = getPool();
    try {
        const { type } = req.params;
        const { format = 'json' } = req.query;
        
        let query, filename;
        
        switch (type) {
            case 'users':
                query = `
                    SELECT id, username, email, stato, nome, cognome, citta
                    FROM utente WHERE ruolo_id = 1 AND stato != 'eliminato'
                    ORDER BY username`;
                filename = 'users_export';
                break;
                
            case 'artisans':
                query = `
                    SELECT u.id, u.username, u.email, u.stato, t.nome_tipologia
                    FROM utente u
                    JOIN artigiani a ON u.id = a.artigiano_id
                    JOIN tipologia t ON a.tipologia_id = t.tipologia_id
                    ORDER BY u.username`;
                filename = 'artisans_export';
                break;
                
            case 'orders':
                query = `
                    SELECT o.ordine_id, c.username as cliente, o.data_ordine, o.stato
                    FROM ordini o
                    JOIN utente c ON o.cliente_id = c.id
                    ORDER BY o.data_ordine DESC`;
                filename = 'orders_export';
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Tipo di export non supportato'
                });
        }
        
        const result = await pool.query(query);
        
        if (format === 'csv') {
            // Simple CSV implementation
            if (result.rows.length === 0) {
                return res.json({
                    success: true,
                    data: [],
                    count: 0,
                    message: 'Nessun dato da esportare'
                });
            }
            
            const headers = Object.keys(result.rows[0]).join(',');
            const rows = result.rows.map(row =>
                Object.values(row).map(val =>
                    typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
                ).join(',')
            );
            const csv = [headers, ...rows].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data: result.rows,
                count: result.rows.length,
                exported_at: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'esportazione dei dati'
        });
    }
});

module.exports = router;