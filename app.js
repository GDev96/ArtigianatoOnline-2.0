require('dotenv').config();

const express = require('express');
const { initializeDatabase, pool } = require('./db/db.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);
app.use('/api', indexRouter);

// Users route
const utentiRouter = require('./routes/users');
app.use('/api/users', utentiRouter);

//Products route
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

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
        app.listen(PORT, () => {
            console.log(`Server in esecuzione sulla porta ${PORT}`);
        });
    } catch (error) {
        console.error('Errore durante l\'avvio del server:', error);
        process.exit(1);
    }
}

// Avvia il server
startServer();