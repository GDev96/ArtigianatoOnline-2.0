const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

// Validazione del formato dell'immagine per la registrazione - corretto
function isValidImageData(base64String) {
    try {
        const matches = base64String.match(/^data:image\/(jpeg|jpg|png);base64,/i);
        return matches !== null;
    } catch (error) {
        return false;
    }
}

// Registrazione utente - corretto
router.post('/signup', async (req, res) => {
    try {
        let {
            nome_utente, email, nome, cognome, 
            password, indirizzo, citta, isArtigiano,
            numero_telefono, tipologia_id, iban, immagine
        } = req.body;

        // Validate required fields
        if (!nome_utente || !email || !nome || !cognome || !password) {
            return res.status(400).json({
                success: false,
                error: 'Tutti i campi obbligatori devono essere compilati'
            });
        }

        // Process image if present
        let processedImage = null;
        if (immagine) {
            if (!isValidImageData(immagine)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato immagine non valido'
                });
            }

            // Convert base64 to buffer
            const base64Data = immagine.replace(/^data:image\/\w+;base64,/, '');
            processedImage = Buffer.from(base64Data, 'base64');
        }

        // Generate password hash
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert user
            const userResult = await client.query(`
                INSERT INTO utente (
                    username, email, nome, cognome, 
                    password_hash, indirizzo, citta, 
                    numero_telefono, ruolo_id, stato
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                nome_utente, email, nome, cognome,
                hash, indirizzo, citta,
                numero_telefono, isArtigiano ? 2 : 1, 'attivo'
            ]);

            // If artisan, insert additional data
            if (isArtigiano) {
                await client.query(`
                    INSERT INTO artigiani (
                        artigiano_id, tipologia_id, 
                        iban, immagine
                    )
                    VALUES ($1, $2, $3, $4)
                `, [
                    userResult.rows[0].id,
                    tipologia_id,
                    iban,
                    processedImage
                ]);
            }

            await client.query('COMMIT');
            res.status(201).json({
                success: true,
                message: 'Utente registrato con successo'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Errore registrazione:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante la registrazione',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//Login utente - corretto
router.post('/login', async (req, res) => {
    try {
        const { nome_utente, password } = req.body;
        
        console.log('Login attempt for user:', nome_utente);

        // Check for required fields
        if (!nome_utente || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username e password sono richiesti'
            });
        }

        // Get user from database
        const result = await pool.query(
            'SELECT * FROM utente WHERE username = $1 AND stato = $2',
            [nome_utente, 'attivo']
        );

        if (result.rows.length === 0) {
            console.log('User not found:', nome_utente);
            return res.status(401).json({
                success: false,
                error: 'Username o password errati'
            });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            console.log('Invalid password for user:', nome_utente);
            return res.status(401).json({
                success: false,
                error: 'Username o password errati'
            });
        }

        // Create token with role information
        const token = jwt.sign({
            id: user.id,
            username: user.username,
            ruolo_id: user.ruolo_id
        }, process.env.JWT_SECRET, { 
            expiresIn: '30m' 
        });

        // Set token in cookie and headers
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 1000 // 30 minutes
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                nome: user.nome,
                cognome: user.cognome,
                ruolo_id: user.ruolo_id
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Errore del server durante il login'
        });
    }
});

// Logout utente - corretto
router.post('/logout', (req, res) => {
    try {
        // Clear JWT cookie if it exists
        res.clearCookie('token');
        
        res.json({
            success: true,
            message: 'Logout effettuato con successo'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il logout',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
