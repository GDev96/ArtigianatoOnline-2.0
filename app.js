require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const { initializeDatabase, pool } = require('./db/db');
const path = require('path');
const createAuthMiddleware = require('./middleware/auth');

// Create auth middleware instance
const requireAuth = createAuthMiddleware();

// Import routes
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cookieParser());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Static files
app.use(express.static('public'));

// Apply auth middleware to specific routes
app.use('/api', requireAuth);
app.use('/products', requireAuth);
app.use('/users', (req, res, next) => {
    if (['/login', '/signup'].includes(req.path)) {
        return next();
    }
    requireAuth(req, res, next);
});

// Route handlers
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);

// ...rest of your code...
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

async function startServer() {
    try {
        // Inizializza il database (crea DB se non esiste, crea tabelle, esegue seed)
        await initializeDatabase();
        
        // Rotte base di esempio
        app.get('/', (req, res) => {
            res.send('API per e-commerce artigianato online');
        });

        // Rotta per testare la connessione al database
        app.get('/test-db', async (req, res) => {
            try {
                const result = await pool.query('SELECT NOW()');
                res.json({
                    status: 'success',
                    message: 'Connessione al database riuscita',
                    timestamp: result.rows[0].now
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Errore nella connessione al database',
                    error: error.message
                });
            }
        });

        // Avvia il server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('Press Ctrl+C to stop the server');
        });
    } catch (error) {
        console.error('Errore durante l\'avvio del server:', error);
        process.exit(1);
    }
}

// Avvia il server
startServer();