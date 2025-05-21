const express = require('express');
const router = express.Router();
const pool = require('../db/db'); // o dove hai configurato il tuo pool
const authorize = require('../middleware/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET tutti i prodotti - pubblico
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT  p.*, u.nome_utente AS artigiano_nome, t.nome_tipologia as categoria
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utente u ON a.artigiano_id = u.id
      JOIN tipologia t ON p.tipologia_id = t.tipologia_id
    `);
    
    res.json({
      success: true,
      products: result.rows
    });
    
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// GET un prodotto specifico - pubblico
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT p.*, a.tipologia_id AS artigiano_tipologia, u.nome_utente AS nome_artigiano
             FROM prodotti p
             JOIN artigiani a ON p.artigiano_id = a.artigiano_id
             JOIN utente u ON a.artigiano_id = u.id
             WHERE p.prodotto_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Prodotto non trovato' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Errore nel recupero del prodotto:', error);
        res.status(500).json({ message: 'Errore del server durante il recupero del prodotto.' });
    }
});

// Inserimento di un nuovo prodotto - solo per artigiani
router.post('/', authorize(2), upload.single('immagine'), async (req, res) => {
    try {
        // Log the entire request body for debugging
        console.log('Request body:', req.body);

        const nome_prodotto = req.body.nome_prodotto || null;
        const tipologia_id = req.body.tipologia_id || null;
        const prezzo = req.body.prezzo || null;
        const descrizione = req.body.descrizione || null;
        const quant = req.body.quant || 1;
        const immagine = req.file ? req.file.buffer : null;

        const query = `
            INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, descrizione, quant, immagine)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING prodotto_id
        `;
        const values = [
            req.user.id, 
            nome_prodotto, 
            tipologia_id, 
            prezzo, 
            descrizione, 
            quant, 
            immagine
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Prodotto inserito con successo.',
            prodotto_id: result.rows[0].prodotto_id
        });

    } catch (error) {
        console.error('Errore nell\'inserimento del prodotto:', error);
        res.status(500).json({ 
            success: false,
            message: 'Errore del server durante la creazione del prodotto.',
            error: error.message 
        });
    }
});

// Diminuisce di 1 la quantità di un prodotto
router.patch('/:id/decrement', authorize(1), async (req, res) => {
    const productId = parseInt(req.params.id);

    try {
        // Controlla che il prodotto esista e abbia almeno 1 quantità disponibile
        const productResult = await pool.query(
            'SELECT quant FROM prodotti WHERE prodotto_id = $1',
            [productId]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: 'Prodotto non trovato.' });
        }

        const currentQuantity = productResult.rows[0].quant;

        if (currentQuantity <= 0) {
            return res.status(400).json({ message: 'Prodotto esaurito.' });
        }

        // Decrementa la quantità
        await pool.query(
            'UPDATE prodotti SET quant = quant - 1 WHERE prodotto_id = $1',
            [productId]
        );

        res.status(200).json({ message: 'Quantità del prodotto aggiornata con successo.' });

    } catch (error) {
        console.error('Errore nel decremento della quantità:', error);
        res.status(500).json({ message: 'Errore del server durante il decremento del prodotto.' });
    }
});

// Modifica un prodotto - tutti i dati - solo per artigiano proprietario o admin
router.patch('/:id', authorize(2), async (req, res) => {
    const productId = parseInt(req.params.id);
    const user = req.user; 
    const { nome_prodotto, descrizione, prezzo, tipologia_id, quant, immagine } = req.body;

    try {
        // Controlla che il prodotto esista
        const productCheck = await pool.query(
            'SELECT * FROM prodotti WHERE prodotto_id = $1',
            [productId]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Prodotto non trovato.' });
        }

        const product = productCheck.rows[0];

        // Se utente è artigiano, controlla che il prodotto sia suo
        if (user.ruolo_id === 2 && product.artigiano_id !== user.id) {
            return res.status(403).json({ message: 'Non sei autorizzato a modificare questo prodotto.' });
        }

        // Esegui l'UPDATE solo dei campi forniti
        const updateQuery = `
            UPDATE prodotti
            SET 
                nome_prodotto = COALESCE($1, nome_prodotto),
                descrizione = COALESCE($2, descrizione),
                prezzo = COALESCE($3, prezzo),
                tipologia_id = COALESCE($4, tipologia_id),
                quant = COALESCE($5, quant),
                immagine = COALESCE($6, immagine)
            WHERE prodotto_id = $7
        `;

        await pool.query(updateQuery, [
            nome_prodotto || null,
            descrizione || null,
            prezzo || null,
            tipologia_id || null,
            quant || null,
            immagine || null,
            productId
        ]);

        res.status(200).json({ message: 'Prodotto aggiornato con successo.' });

    } catch (error) {
        console.error('Errore durante la modifica del prodotto:', error);
        res.status(500).json({ message: 'Errore del server durante la modifica del prodotto.' });
    }
});

// DELETE di un prodotto dato l'id - solo per artigiano proprietario o admin
router.delete('/:id', authorize(2), async (req, res) => {
    const productId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.ruolo_id;

    try {
        // Controlla se il prodotto esiste e chi lo ha creato
        const result = await pool.query('SELECT artigiano_id FROM prodotti WHERE prodotto_id = $1', [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Prodotto non trovato.' });
        }

        const product = result.rows[0];

        // Controllo permessi: solo l'artigiano proprietario o admin può eliminare
        if (userRole !== 3 && product.artigiano_id !== userId) {
            return res.status(403).json({ message: 'Non hai i permessi per eliminare questo prodotto.' });
        }

        // Elimina il prodotto
        await pool.query('DELETE FROM prodotti WHERE prodotto_id = $1', [productId]);

        res.status(200).json({ message: 'Prodotto eliminato con successo.' });

    } catch (error) {
        console.error('Errore durante l\'eliminazione del prodotto:', error);
        res.status(500).json({ message: 'Errore del server durante l\'eliminazione del prodotto.' });
    }
});

module.exports = router;