const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../db/db');
const router = express.Router();
const multer = require('multer');
const upload = multer();
require('dotenv').config();
const createAuthMiddleware = require('../middleware/auth');

const requireAuth = createAuthMiddleware();

// Get user by ID
router.get('/api/:id', async (req, res) => {
    try {
        const pool = getPool();
        const userId = req.params.id;
        
        const query = `
            SELECT u.id, u.username, u.nome, u.cognome, u.email, 
                   u.numero_telefono, u.indirizzo, u.citta, u.ruolo_id
            FROM utente u
            WHERE u.id = $1`;
            
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati utente'
        });
    }
});

// Get tutti gli artigiani - pubblica
router.get('/artisans', async (req, res) => {
    try {
        const pool = getPool();
        const query = `
            SELECT 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                a.tipologia_id,
                t.nome_tipologia,
                a.immagine
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            WHERE u.ruolo_id = 2
            ORDER BY u.cognome, u.nome`;

        const result = await pool.query(query);

        res.json({
            success: true,
            artisans: result.rows.map(artisan => ({
                ...artisan,
                immagine: artisan.immagine ? artisan.immagine.toString('base64') : null
            }))
        });

    } catch (error) {
        console.error('Error fetching artisans:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli artigiani',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get artisan by ID
router.get('/api/artisan/:id', async (req, res) => {
    try {
        const pool = getPool();
        const artisanId = req.params.id;
        
        const query = `
            SELECT 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                a.tipologia_id,
                t.nome_tipologia,
                a.immagine
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            WHERE u.id = $1 AND u.ruolo_id = 2`;

        const result = await pool.query(query, [artisanId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigiano non trovato'
            });
        }

        const artisan = {
            ...result.rows[0],
            immagine: result.rows[0].immagine ? result.rows[0].immagine.toString('base64') : null
        };

        res.json({
            success: true,
            artisan: artisan
        });

    } catch (error) {
        console.error('Error fetching artisan:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati dell\'artigiano',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API per aggiornare i dati dell'utente/artigiano
router.put('/update/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        
        const userFields = {};
        const artisanFields = {};
        
        Object.entries(updates).forEach(([key, value]) => {
            if (key === 'tipologia_id') {
                artisanFields[key] = value;
            } else {
                userFields[key] = value;
            }
        });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let userData = null;

            if (Object.keys(userFields).length > 0) {
                const userSetClause = Object.keys(userFields)
                    .map((key, index) => `${key} = $${index + 1}`)
                    .join(', ');
                
                const userQuery = `
                    UPDATE utente 
                    SET ${userSetClause}
                    WHERE id = $${Object.keys(userFields).length + 1}
                    RETURNING id, username, nome, cognome, email, numero_telefono, indirizzo, citta`;

                const userResult = await client.query(
                    userQuery, 
                    [...Object.values(userFields), userId]
                );
                userData = userResult.rows[0];
            }

            if (artisanFields.tipologia_id) {
                await client.query(
                    `UPDATE artigiani 
                     SET tipologia_id = $1 
                     WHERE artigiano_id = $2`,
                    [artisanFields.tipologia_id, userId]
                );
            }

            if (!userData) {
                const getUserQuery = `
                    SELECT id, username, nome, cognome, email, numero_telefono, indirizzo, citta
                    FROM utente 
                    WHERE id = $1`;
                const userResult = await client.query(getUserQuery, [userId]);
                userData = userResult.rows[0];
            }

            await client.query('COMMIT');

            if (artisanFields.tipologia_id) {
                userData.tipologia_id = artisanFields.tipologia_id;
            }

            res.json({
                success: true,
                user: userData
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del profilo',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API per aggiornare l'immagine del profilo
router.post('/profile/image', requireAuth, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nessuna immagine caricata' });
        }

        const imageBase64 = req.file.buffer;

        const result = await pool.query(
            'UPDATE artigiani SET immagine = $1 WHERE artigiano_id = $2 RETURNING immagine',
            [imageBase64, req.user.id]
        );

        if (result.rows.length === 0) {
            throw new Error('Errore nell\'aggiornamento dell\'immagine');
        }

        const base64Image = result.rows[0].immagine.toString('base64');

        res.json({ 
            success: true, 
            message: 'Immagine aggiornata con successo',
            image: base64Image
        });

    } catch (error) {
        console.error('Error updating profile image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore durante l\'aggiornamento dell\'immagine' 
        });
    }
});

module.exports = router;