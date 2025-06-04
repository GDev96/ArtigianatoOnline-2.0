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

module.exports = router;