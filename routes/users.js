const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

// Helper function to validate image
function isValidImageData(base64String) {
    try {
        const matches = base64String.match(/^data:image\/(jpeg|jpg|png);base64,/i);
        return matches !== null;
    } catch (error) {
        return false;
    }
}

// Registration endpoint
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

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM utente WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Username o password errati' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Username o password errati' });
    }

    // Payload base
    const payload = {
      id: user.id,
      nome: user.nome,
      cognome: user.cognome,
      username: user.username,
      email: user.email,
      numero_telefono: user.numero_telefono,
      indirizzo: user.indirizzo,
      citta: user.citta,
      ruolo_id: user.ruolo_id
    };

    // Dati extra artigiano
    if (user.ruolo_id === 2) {
      const artisanResult = await pool.query(`
        SELECT a.*, t.nome_tipologia 
        FROM artigiani a 
        JOIN tipologia t ON a.tipologia_id = t.tipologia_id 
        WHERE a.artigiano_id = $1
      `, [user.id]);
      
      if (artisanResult.rows.length > 0) {
        const artisan = artisanResult.rows[0];
        payload.tipologia_id = artisan.tipologia_id;
        payload.nome_tipologia = artisan.nome_tipologia;
        payload.iban = artisan.iban;
        payload.immagine = artisan.immagine;
      }
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      token,
      user: payload
    });

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Get tutti gli artigiani - corretta
router.get('/artisans', async (req, res) => {
    try {
        const artisansResult = await pool.query(`
            SELECT 
                u.id, 
                u.username, 
                u.nome, 
                u.cognome,
                u.email, 
                u.numero_telefono, 
                u.indirizzo,
                u.citta,
                u.stato,
                a.tipologia_id,
                t.nome_tipologia,
                a.iban,
                a.immagine,
                COALESCE(AVG(r.valutazione)::numeric(10,1), 0) as valutazione_media,
                COUNT(r.recensione_id) as numero_recensioni
            FROM utente u 
            JOIN artigiani a ON u.id = a.artigiano_id
            LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
            LEFT JOIN recensioni r ON u.id = r.artigiano_id AND r.stato = 'attiva'
            WHERE u.ruolo_id = 2 AND u.stato = 'attivo'
            GROUP BY u.id, u.username, u.nome, u.cognome, u.email, 
                     u.numero_telefono, u.indirizzo, u.citta, u.stato,
                     a.tipologia_id, t.nome_tipologia, a.iban, a.immagine
            ORDER BY u.nome, u.cognome
        `);

        // Convert binary data to base64
        const artisans = artisansResult.rows.map(row => ({
            ...row,
            // Convert Buffer to base64 string
            immagine: row.immagine ? Buffer.from(row.immagine).toString('base64') : null
        }));


        res.json({ 
            success: true, 
            artisans 
        });

    } catch (error) {
        console.error('Errore DB:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore del server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;