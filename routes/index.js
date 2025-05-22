const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');

// TODO: Home page
router.get('/', async (req, res) => {
  try {
      res.sendFile(path.join(__dirname, '../public/index.html'));
  } catch (error) {
      console.error('Errore nel caricamento della home page:', error);
      res.status(500).send('Errore interno del server');
  }
});

// TODO: API per recuperare tutte le categorie
// API per recuperare tutte le categorie
router.get('/categories', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT 
                t.tipologia_id,
                t.nome_tipologia
            FROM tipologia t
            INNER JOIN artigiani a ON t.tipologia_id = a.tipologia_id
            INNER JOIN utente u ON a.artigiano_id = u.id
            WHERE u.stato = 'attivo'
            ORDER BY t.nome_tipologia ASC
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


// TODO: API per recuperare tutte le recensioni
router.get('/api/reviews', async (req, res) => {
    try {
        const reviewsResult = await pool.query(`
            SELECT 
                r.recensione_id,
                r.descrizione as testo,
                r.valutazione,
                r.data_recensione,
                u.nome_utente as cliente_nome,
                a.nome_utente as artigiano_nome,
                r.artigiano_id
            FROM recensioni r
            JOIN utente u ON r.cliente_id = u.id
            JOIN utente a ON r.artigiano_id = a.id
            ORDER BY r.data_recensione DESC
        `);

        // Rimuoviamo il controllo che restituiva 404
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

// TODO: API per salvare una nuova recensione
router.post('/reviews', async (req, res) => {
    try {
        const { cliente_id, artigiano_id, valutazione, descrizione, data_recensione } = req.body;

        console.log('Dati ricevuti:', req.body);

        // Valida i dati
        if (!cliente_id || !artigiano_id || !valutazione || !descrizione) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti'
            });
        }

        // Verifica che l'utente esista
        const userExists = await pool.query(
            'SELECT id FROM utente WHERE id = $1',
            [cliente_id]
        );

        if (userExists.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        // Verifica che l'artigiano esista
        const artisanExists = await pool.query(
            'SELECT id FROM utente WHERE id = $1',
            [artigiano_id]
        );

        if (artisanExists.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Artigiano non trovato'
            });
        }

        // Inserisci la recensione nel database senza specificare recensione_id
        const result = await pool.query(`
            INSERT INTO recensioni (cliente_id, artigiano_id, valutazione, descrizione, data_recensione)
            VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP))
            RETURNING recensione_id
        `, [cliente_id, artigiano_id, valutazione, descrizione, data_recensione]);

        res.json({
            success: true,
            message: 'Recensione salvata con successo',
            review_id: result.rows[0].recensione_id
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