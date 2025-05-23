const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');

// Home page
router.get('/', async (req, res) => {
  try {
      res.sendFile(path.join(__dirname, '../public/index.html'));
  } catch (error) {
      console.error('Errore nel caricamento della home page:', error);
      res.status(500).send('Errore interno del server');
  }
});

// API per recuperare tutte le categorie
router.get('/categories', async (req, res) => {
    try {
        const query = `
            SELECT 
                tipologia_id,
                nome_tipologia
            FROM tipologia
            ORDER BY nome_tipologia ASC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            categories: result.rows
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle categorie',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API per recuperare tutte le recensioni
router.get('/reviews', async (req, res) => {
    try {
        const reviewsResult = await pool.query(`
            SELECT 
                r.recensione_id,
                r.cliente_id,
                r.artigiano_id,
                r.descrizione,
                r.valutazione,
                r.stato,
                r.data_recensione,
                c.username as cliente_username,
                c.nome as cliente_nome,
                c.cognome as cliente_cognome,
                a.username as artigiano_username,
                a.nome as artigiano_nome,
                a.cognome as artigiano_cognome
            FROM recensioni r
            JOIN utente c ON r.cliente_id = c.id
            JOIN utente a ON r.artigiano_id = a.id
            WHERE r.stato = 'attiva'
            ORDER BY r.data_recensione DESC
        `);

        res.json({
            success: true,
            reviews: reviewsResult.rows
        });
    } catch (error) {
        console.error('Errore nel recupero delle recensioni:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API per salvare una nuova recensione
router.post('/reviews', async (req, res) => {
    try {
        const { cliente_id, artigiano_id, valutazione, descrizione } = req.body;

        // Validazione dei dati
        if (!cliente_id || !artigiano_id || !valutazione || !descrizione) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti. Richiesti: cliente_id, artigiano_id, valutazione, descrizione'
            });
        }

        // Verifica che il cliente esista e sia attivo
        const clienteExists = await pool.query(
            'SELECT id FROM utente WHERE id = $1 AND ruolo_id = 1 AND stato = $2',
            [cliente_id, 'attivo']
        );

        if (clienteExists.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cliente non trovato o non attivo'
            });
        }

        // Verifica che l'artigiano esista e sia attivo
        const artigianoExists = await pool.query(
            'SELECT u.id FROM utente u JOIN artigiani a ON u.id = a.artigiano_id WHERE u.id = $1 AND u.ruolo_id = 2 AND u.stato = $2',
            [artigiano_id, 'attivo']
        );

        if (artigianoExists.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Artigiano non trovato o non attivo'
            });
        }

        // Inserisci la recensione
        const result = await pool.query(`
            INSERT INTO recensioni (
                cliente_id, 
                artigiano_id, 
                valutazione, 
                descrizione, 
                stato,
                data_recensione
            )
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING recensione_id
        `, [cliente_id, artigiano_id, valutazione, descrizione, 'attiva']);

        res.status(201).json({
            success: true,
            message: 'Recensione salvata con successo',
            review: {
                recensione_id: result.rows[0].recensione_id,
                cliente_id,
                artigiano_id,
                valutazione,
                descrizione,
                stato: 'attiva',
                data_recensione: new Date()
            }
        });
    } catch (error) {
        console.error('Errore nel salvataggio della recensione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel salvataggio della recensione',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;