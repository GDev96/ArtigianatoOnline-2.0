const express = require('express');
const router = express.Router();
const { pool } = require('../db/db'); // Fix pool import
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();

//TODO: GET tutte le recensioni - admin

//TODO: POST nuova segnalazione - solo utenti autenticati

//TODO: PUT modifica segnalazione - admin

//TODO: DELETE elimina segnalazione - admin



module.exports = router;