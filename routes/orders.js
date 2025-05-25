const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');
const createAuthMiddleware = require('../middleware/auth');

// Create auth middleware
const requireAuth = createAuthMiddleware();


//...



module.exports = router;