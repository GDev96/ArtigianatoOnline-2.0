const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Admin connection config
const adminConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432
};

// Application database config
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'artigianato_online',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432')
};

let pool = null;

async function initializeDatabase() {
    try {
        console.log('Inizializzazione database...');
        
        // Create admin connection
        const adminPool = new Pool(adminConfig);
        
        try {
            // Check if database exists
            const dbExists = await adminPool.query(
                "SELECT 1 FROM pg_database WHERE datname = $1",
                [dbConfig.database]
            );

            if (dbExists.rows.length === 0) {
                console.log(`Creating database ${dbConfig.database}...`);
                await adminPool.query(`CREATE DATABASE ${dbConfig.database}`);
            }
        } finally {
            await adminPool.end();
        }

        // Create application pool
        pool = new Pool(dbConfig);

        // Initialize tables
        console.log('Creating tables...');
        const tablesPath = path.join(__dirname, 'tables.sql');
        const tables = fs.readFileSync(tablesPath, 'utf-8');
        await pool.query(tables);

        // Check if seed is needed
        const result = await pool.query('SELECT COUNT(*) FROM utente');
        if (parseInt(result.rows[0].count) === 0) {
            console.log('Running initial seed...');
            const seed = require('./seed');
            await seed(pool);
        }

        return pool;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

module.exports = {
    pool: () => {
        if (!pool) {
            throw new Error('Database not initialized');
        }
        return pool;
    },
    initializeDatabase
};