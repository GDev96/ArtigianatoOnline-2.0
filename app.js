require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const { initializeDatabase, pool } = require('./db/db');
const path = require('path');
const createAuthMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Create auth middleware
const requireAuth = createAuthMiddleware();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const reviewsRouter = require('./routes/reviews');

// Public routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/reviews', reviewsRouter);
app.use('/categories', indexRouter);

// Protected routes
app.use('/profile.html', requireAuth);
app.use('/cart.html', requireAuth);
app.use('/dashboard.html', requireAuth);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Si è verificato un errore interno del server'
    });
});

// Start server
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
    } catch (error) {
        console.error('Errore durante l\'avvio del server:', error);
        process.exit(1);
    }
}

// Avvia il server
startServer();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;