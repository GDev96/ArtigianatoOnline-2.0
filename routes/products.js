const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();


//TODO: API per visualizzare tutti i prodotti

//TODO: API per creare un prodotto - artigiano

//TODO: API per modificare un prodotto - artigiano

//TODO: API per eliminare un prodotto - artigiano


module.exports = router;