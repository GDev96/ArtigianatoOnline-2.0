const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const requireAuth = createAuthMiddleware();

// GET tutti i prodotti - pubblico
router.get('/', async (req, res) => {
  try {
    // Updated query with proper JOIN conditions and error handling
    const result = await pool.query(`
      SELECT 
        p.*,
        u.nome as artigiano_nome,
        u.cognome as artigiano_cognome,
        t.nome_tipologia,
        t.tipologia_id,
        COALESCE(AVG(r.valutazione)::numeric(10,1), 0) as valutazione_media,
        COUNT(DISTINCT r.recensione_id) as numero_recensioni
      FROM prodotti p
      INNER JOIN utente u ON p.artigiano_id = u.id
      LEFT JOIN tipologia t ON p.tipologia_id = t.tipologia_id
      LEFT JOIN recensioni r ON u.id = r.artigiano_id 
        AND r.stato = 'attiva'
      WHERE u.stato = 'attivo'
      GROUP BY 
        p.prodotto_id,
        p.nome_prodotto,
        p.descrizione,
        p.prezzo,
        p.quantita,
        p.immagine,
        u.nome,
        u.cognome,
        t.nome_tipologia,
        t.tipologia_id
      ORDER BY p.nome_prodotto ASC
    `);

    console.log('Query executed successfully');
    console.log('Number of products found:', result.rows.length);
    
    const products = result.rows.map(product => ({
      prodotto_id: product.prodotto_id,
      nome_prodotto: product.nome_prodotto,
      descrizione: product.descrizione,
      prezzo: parseFloat(product.prezzo),
      quantita: parseInt(product.quantita),
      immagine: product.immagine ? product.immagine.toString('base64') : null,
      artigiano_id: product.artigiano_id,
      artigiano_nome: product.artigiano_nome,
      artigiano_cognome: product.artigiano_cognome,
      tipologia_id: product.tipologia_id,
      nome_tipologia: product.nome_tipologia,
      valutazione_media: parseFloat(product.valutazione_media),
      numero_recensioni: parseInt(product.numero_recensioni)
    }));

    res.json({
      success: true,
      products
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore del server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET prodotto specifico
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        u.nome as artigiano_nome,
        u.cognome as artigiano_cognome,
        t.nome_tipologia,
        t.tipologia_id,
        COALESCE(AVG(r.valutazione)::numeric(10,1), 0) as valutazione_media,
        COUNT(r.recensione_id) as numero_recensioni
      FROM prodotti p
      JOIN utente u ON p.artigiano_id = u.id
      JOIN artigiani a ON u.id = a.artigiano_id
      LEFT JOIN tipologia t ON p.tipologia_id = t.tipologia_id
      LEFT JOIN recensioni r ON u.id = r.artigiano_id AND r.stato = 'attiva'
      WHERE p.prodotto_id = $1 AND u.stato = 'attivo'
      GROUP BY 
        p.prodotto_id,
        p.nome_prodotto,
        p.descrizione,
        p.prezzo,
        p.quantita,
        p.immagine,
        u.nome,
        u.cognome,
        t.nome_tipologia,
        t.tipologia_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Prodotto non trovato' });
    }

    const product = {
      ...result.rows[0],
      immagine: result.rows[0].immagine ? result.rows[0].immagine.toString('base64') : null,
      prezzo: parseFloat(result.rows[0].prezzo)
    };

    res.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Errore nel recupero del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST nuovo prodotto (solo artigiani)
router.post('/', requireAuth, upload.single('immagine'), async (req, res) => {
  try {
    if (req.user.ruolo_id !== 2) {
      return res.status(403).json({
        success: false,
        message: 'Solo gli artigiani possono inserire prodotti'
      });
    }

    const { nome_prodotto, descrizione, prezzo, tipologia_id, quantita } = req.body;
    const immagine = req.file ? req.file.buffer : null;

    const query = `
      INSERT INTO prodotti (
        artigiano_id,
        nome_prodotto,
        descrizione,
        prezzo,
        tipologia_id,
        quantita,
        immagine
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING prodotto_id
    `;

    const result = await pool.query(query, [
      req.user.id,
      nome_prodotto,
      descrizione,
      prezzo,
      tipologia_id,
      quantita || 0,
      immagine
    ]);

    res.status(201).json({
      success: true,
      message: 'Prodotto inserito con successo',
      prodotto_id: result.rows[0].prodotto_id
    });

  } catch (error) {
    console.error('Errore nell\'inserimento del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PATCH aggiorna prodotto (solo proprietario o admin)
router.patch('/:id', requireAuth, upload.single('immagine'), async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { nome_prodotto, descrizione, prezzo, tipologia_id, quantita } = req.body;
    const immagine = req.file ? req.file.buffer : null;

    // Verifica proprietà del prodotto
    const productCheck = await pool.query(
      'SELECT artigiano_id FROM prodotti WHERE prodotto_id = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prodotto non trovato'
      });
    }

    // Verifica permessi
    if (req.user.ruolo_id !== 3 && productCheck.rows[0].artigiano_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato a modificare questo prodotto'
      });
    }

    const updateQuery = `
      UPDATE prodotti
      SET 
        nome_prodotto = COALESCE($1, nome_prodotto),
        descrizione = COALESCE($2, descrizione),
        prezzo = COALESCE($3, prezzo),
        tipologia_id = COALESCE($4, tipologia_id),
        quantita = COALESCE($5, quantita),
        immagine = COALESCE($6, immagine)
      WHERE prodotto_id = $7
      RETURNING prodotto_id
    `;

    const result = await pool.query(updateQuery, [
      nome_prodotto,
      descrizione,
      prezzo,
      tipologia_id,
      quantita,
      immagine,
      productId
    ]);

    res.json({
      success: true,
      message: 'Prodotto aggiornato con successo',
      prodotto_id: result.rows[0].prodotto_id
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento del prodotto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;