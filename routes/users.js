const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

// Registrazione nuovo utente
router.post('/signup', async (req, res) => {
  let {
    username, nome, cognome, email, password, isArtigiano, numero_telefono, indirizzo, citta, tipologia_id, iban, immagine 
  } = req.body;

  // Controllo campi obbligatori
  if (!username || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  // Controllo dati artigiano
  if (isArtigiano && (!iban || !tipologia_id)) {
    return res.status(400).json({ error: 'IBAN e tipologia di prodotto sono obbligatori per gli artigiani.' });
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const ruolo_id = isArtigiano ? 2 : 1;

    // Inserimento utente
    const userInsertQuery = `
      INSERT INTO utente (username, nome, cognome, numero_telefono, indirizzo, citta, email, password_hash, ruolo_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    
    const userValues = [
      username,
      nome,
      cognome,
      numero_telefono || null,
      indirizzo || null,
      citta || null,
      email,
      hash,
      ruolo_id
    ];

    const result = await pool.query(userInsertQuery, userValues);
    const userId = result.rows[0].id;

    // Inserimento artigiano
    if (isArtigiano) {
      const artisanQuery = `
        INSERT INTO artigiani (artigiano_id, tipologia_id, iban, immagine)
        VALUES ($1, $2, $3, $4)
      `;
      const artisanValues = [userId, tipologia_id, iban, immagine || null];
      await pool.query(artisanQuery, artisanValues);
    }

    res.status(201).json({ message: 'Utente registrato con successo', userId });

  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: 'Errore del server durante la registrazione' });
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

        if (!artisansResult.rows.length) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nessun artigiano trovato' 
            });
        }

        const artisans = artisansResult.rows.map(artisan => ({
            ...artisan,
            immagine: artisan.immagine ? artisan.immagine.toString('base64') : null,
            valutazione_media: parseFloat(artisan.valutazione_media) || 0,
            numero_recensioni: parseInt(artisan.numero_recensioni) || 0
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