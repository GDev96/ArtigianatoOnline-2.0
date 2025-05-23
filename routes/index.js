const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

// Home page
router.get('/', async (req, res) => {
  try {
      res.sendFile(path.join(__dirname, '../public/index.html'));
  } catch (error) {
      console.error('Errore nel caricamento della home page:', error);
      res.status(500).send('Errore interno del server');
  }
});

// API per recuperare tutte le categorie - pubblica
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


module.exports = router;