const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/db.js');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

router.post('/register', async (req, res) => {
  let {
    username, nome, cognome, email, password, isArtigiano, numero_telefono, indirizzo, citta, tipologia_id, iban, immagine } = req.body;

  // Controlliamo i campi obbligatori per tutti gli utenti
  if (!username || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  // Se l'utente è un artigiano, controlliamo anche i dati specifici
  if (isArtigiano) {
    if (!iban || !tipologia_id) {
      return res.status(400).json({ error: 'IBAN e tipologia di prodotto sono obbligatori per gli artigiani.' });
    }
    // Prepariamo immagine se è in base64
    if (immagine && typeof immagine === 'string') {
      immagine = Buffer.from(immagine, 'base64');
    }
  }

  try {
    // Cripta la password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Impostiamo il ruolo_id: 1 = cliente, 2 = artigiano
    const ruolo_id = isArtigiano ? 2 : 1;

    // Inserisci il nuovo utente nella tabella utente
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
      password_hash,
      ruolo_id
    ];

    const result = await pool.query(userInsertQuery, userValues);
    const userId = result.rows[0].id;

    // Se artigiano, inserisci nella tabella artigiani
    if (isArtigiano) {
      const artisanQuery = `
        INSERT INTO artigiani (artigiano_id, tipologia_id, iban, immagine)
        VALUES ($1, $2, $3, $4)`;
      const artisanValues = [userId, tipologia_id, iban, immagine || null];
      await pool.query(artisanQuery, artisanValues);
    }

    res.status(201).json({ message: 'Utente registrato con successo', userId });

  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: 'Errore del server durante la registrazione' });
  }
});

// API per registrare un admin 
router.post('/register-admin', async (req, res) => {
  const { username, nome, cognome, email, password } = req.body;

  if (!username || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const ruolo_id = 3; // ADMIN

    const query = `
      INSERT INTO utente (username, nome, cognome, email, password_hash, ruolo_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [username, nome, cognome, email, password_hash, ruolo_id];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Admin creato con successo',
      adminId: result.rows[0].id
    });

  } catch (error) {
    console.error('Errore registrazione admin:', error);
    res.status(500).json({ error: 'Errore del server durante la creazione dell\'admin' });
  }
});

// API per il login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Verifica se l'utente esiste
    const result = await pool.query('SELECT * FROM utente WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Username o password errati' });
    }

    const user = result.rows[0];

    // 2. Verifica la password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Username o password errati' });
    }

    // 3. Crea il payload di base
    const payload = {
      id: user.id,
      nome: user.nome,
      cognome: user.cognome,
      username: user.username,
      email: user.email,
      numero_telefono: user.numero_telefono,
      indirizzo: user.indirizzo,
      citta: user.citta,
      ruolo_id: user.ruolo_id,
      stato: user.stato
    };

    // 4. Se è un artigiano, aggiungi i dati extra
    if (user.ruolo_id === 2) {
      const artisanResult = await pool.query('SELECT * FROM artigiani WHERE artigiano_id = $1', [user.id]);
      if (artisanResult.rows.length > 0) {
        const artisan = artisanResult.rows[0];
        payload.tipologia_id = artisan.tipologia_id;
        payload.iban = artisan.iban;
        payload.immagine = artisan.immagine;
      }
    }

    // 5. Genera token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 6. Risposta
    res.status(200).json({
      token,
      user: payload
    });

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Recuperare gli artigiani
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
              a.tipologia_id,
              t.nome_tipologia
          FROM utente u 
          JOIN artigiani a ON u.id = a.artigiano_id
          LEFT JOIN tipologia t ON a.tipologia_id = t.tipologia_id
          WHERE u.ruolo_id = 2 AND u.stato = 'attivo'
      `);

      if (artisansResult.rows.length === 0) {
          return res.status(404).json({
              success: false,
              message: 'Nessun artigiano trovato'
          });
      }

      res.json({
          success: true,
          artisans: artisansResult.rows
      });
    } catch (error) {
      console.error('Errore nel recupero degli artigiani:', error);
      res.status(500).json({
          success: false,
          message: 'Errore interno del server',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
});

module.exports = router;