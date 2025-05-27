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

// API per aggiornare i dati dell'utente
router.put('/update/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { nome, cognome, email, telefono, indirizzo, citta } = req.body;

        // Validazione dei dati in ingresso
        if (!nome || !cognome || !email) {
            return res.status(400).json({
                success: false,
                message: 'Nome, cognome ed email sono campi obbligatori'
            });
        }

        const query = `
            UPDATE utente 
            SET nome = $1, 
                cognome = $2, 
                email = $3, 
                numero_telefono = $4, 
                indirizzo = $5, 
                citta = $6
            WHERE id = $7
            RETURNING id, username, nome, cognome, email, numero_telefono, indirizzo, citta, ruolo_id, stato`;

        const result = await pool.query(query, [
            nome,
            cognome,
            email,
            telefono,
            indirizzo,
            citta,
            userId
        ]);

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
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del profilo'
        });
    }
});

//TODO: API per modificare un artigiano - admin

//TODO: API per eliminare un utente - admin

//TODO: API per eliminare un artigiano - admin

module.exports = router;