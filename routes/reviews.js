const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

// FIXME: API per recuperare tutte le recensioni - pubblica


// FIXME: API per salvare una nuova recensione - solo utenti loggati


module.exports = router;