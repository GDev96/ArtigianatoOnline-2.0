const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { sendPasswordRecoveryEmail } = require('../services/emailService');
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

// Password recovery request
router.post('/recover-password', async (req, res) => {
    try {
        const { email } = req.body;

        console.log('Ricevuta richiesta recupero password per:', email);

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email richiesta'
            });
        }

        // Check if user exists
        const user = await pool.query(
            'SELECT id, username FROM utente WHERE email = $1 AND stato = $2',
            [email, 'attivo']
        );

        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nessun account trovato con questa email'
            });
        }

        // Generate recovery token
        const recoveryToken = jwt.sign(
            { id: user.rows[0].id, action: 'password-recovery' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Create recovery link
        const recoveryLink = `${process.env.APP_URL}/resetPass.html?token=${recoveryToken}`;

        try {
            await sendPasswordRecoveryEmail(email, recoveryLink);
            
            res.json({
                success: true,
                message: 'Email di recupero inviata con successo'
            });
        } catch (emailError) {
            console.error('Errore invio email:', emailError);
            res.status(500).json({
                success: false,
                error: 'Errore nell\'invio dell\'email di recupero'
            });
        }

    } catch (error) {
        console.error('Password recovery error:', error);
        res.status(500).json({
            success: false,
            error: 'Errore durante il recupero della password'
        });
    }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token e nuova password sono richiesti'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token is for password reset
        if (decoded.action !== 'password-recovery') {
            return res.status(400).json({
                success: false,
                error: 'Token non valido per il reset della password'
            });
        }

        // Hash new password
        const saltRounds = 10;
        const hash = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        const result = await pool.query(
            'UPDATE utente SET password_hash = $1 WHERE id = $2 AND stato = $3 RETURNING id',
            [hash, decoded.id, 'attivo']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            message: 'Password aggiornata con successo'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({
                success: false,
                error: 'Token non valido o scaduto'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Errore durante il reset della password'
        });
    }
});

module.exports = router;
