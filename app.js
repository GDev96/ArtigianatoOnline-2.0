require('dotenv').config();

const express = require('express');
const { initializeDatabase, pool } = require('./db/db');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Aumenta il limite del body parser per supportare file di grandi dimensioni (es. immagini)
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// Users route
const utentiRouter = require('./routes/users');
app.use('/users', utentiRouter);

//Products route
const productsRouter = require('./routes/products');
app.use('/products', productsRouter);


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