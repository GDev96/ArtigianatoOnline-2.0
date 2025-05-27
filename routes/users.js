const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

//TODO: API per visualizzare tutti gli utenti

// Get user by ID
router.get('/api/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        const query = `
            SELECT id, username, nome, cognome, email, numero_telefono, indirizzo, citta, ruolo_id, stato
            FROM utente 
            WHERE id = $1 AND stato = 'attivo'`;
            
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
        const query = `
            SELECT 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                COALESCE(AVG(r.valutazione)::numeric(10,1), 0) as valutazione_media,
                COUNT(DISTINCT r.recensione_id) as numero_recensioni,
                a.immagine
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            LEFT JOIN recensioni r ON u.id = r.artigiano_id 
                AND r.stato = 'attiva'
            WHERE u.ruolo_id = 2 
            AND u.stato = 'attivo'
            GROUP BY 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                a.immagine
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
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                COALESCE(AVG(r.valutazione)::numeric(10,1), 0) as valutazione_media,
                COUNT(DISTINCT r.recensione_id) as numero_recensioni,
                a.immagine
            FROM utente u
            INNER JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            LEFT JOIN recensioni r ON u.id = r.artigiano_id 
                AND r.stato = 'attiva'
            WHERE u.id = $1 
            AND u.ruolo_id = 2 
            AND u.stato = 'attivo'
            GROUP BY 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                u.numero_telefono,
                u.indirizzo,
                u.citta,
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                a.immagine`;

        const result = await pool.query(query, [artisanId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigiano non trovato'
            });
        }

        // Convert image buffer to base64 if exists
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
        
        // Separate updates for utente and artigiani tables
        const userFields = {};
        const artisanFields = {};
        
        // Split fields between tables
        Object.entries(updates).forEach(([key, value]) => {
            if (key === 'tipologia_id') {
                artisanFields[key] = value;
            } else {
                userFields[key] = value;
            }
        });

        // Start a transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let userData = null;

            // Update user table if we have user fields
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

            // Update artisan table if we have tipologia_id
            if (artisanFields.tipologia_id) {
                await client.query(
                    `UPDATE artigiani 
                     SET tipologia_id = $1 
                     WHERE artigiano_id = $2`,
                    [artisanFields.tipologia_id, userId]
                );
            }

            // If we didn't update user data, get it
            if (!userData) {
                const getUserQuery = `
                    SELECT id, username, nome, cognome, email, numero_telefono, indirizzo, citta
                    FROM utente 
                    WHERE id = $1`;
                const userResult = await client.query(getUserQuery, [userId]);
                userData = userResult.rows[0];
            }

            await client.query('COMMIT');

            // Add tipologia_id to response
            if (artisanFields.tipologia_id) {
                userData.tipologia_id = artisanFields.tipologia_id;
            }

            console.log('Updated user data:', userData);

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

//TODO: API per modificare un artigiano - admin

//TODO: API per eliminare un utente - admin

//TODO: API per eliminare un artigiano - admin

module.exports = router;