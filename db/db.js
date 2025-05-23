const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Pool di connessione al nostro database
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'artigianato_online',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Successfully connected to database');
    release();
});

// Funzione per inizializzare le tabelle e popolare il database
async function initializeTables() {
    const client = await pool.connect();
    
    try {
        console.log('Connessione al database avvenuta con successo');
        console.log('Preparazione del database in corso...');

        // Creare le tabelle
        const tablesPath = path.join(__dirname, 'tables.sql');
        const tables = fs.readFileSync(tablesPath, 'utf-8');
        await client.query(tables);
        console.log('Struttura delle tabelle creata correttamente');

        // Eseguire il seed
        const seedModule = require('./seed');
        console.log('Seed eseguito correttamente');

        return pool; // Ritorniamo il pool per l'uso nell'applicazione
    } catch (err) {
        console.error('Errore nell\'esecuzione delle tables o del seed:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initializeDatabase: async () => {
        try {
            console.log('Verifica esistenza del database...');
            
            // Colleghiamoci prima al database di default 'postgres' per controllare se il nostro database esiste
            const adminPool = new Pool({
                user: 'postgres',
                host: 'localhost',
                database: 'postgres', // Database di default
                password: 'postgres',
                port: 5432,
            });

            // Verifica se il database esiste
            const dbCheckResult = await adminPool.query(
                "SELECT 1 FROM pg_database WHERE datname = 'artigianato_online'"
            );

            // Se il database non esiste, crealo
            if (dbCheckResult.rows.length === 0) {
                console.log('Database non trovato. Creazione in corso...');
                await adminPool.query('CREATE DATABASE artigianato_online');
                console.log('Database artigianato_online creato con successo');
            } else {
                console.log('Database artigianato_online già esistente');
            }

            await adminPool.end();
            
            // Ora possiamo connetterci al nostro database e inizializzarlo
            return initializeTables();
        } catch (err) {
            console.error('Errore durante l\'inizializzazione del database:', err);
            throw err;
        }
    }
};

