const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initTestDatabase() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres'
    });

    try {
        await client.connect();
        
        // Drop test database if exists
        await client.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'artigianato_online_test'
            AND pid <> pg_backend_pid();
        `);
        await client.query('DROP DATABASE IF EXISTS artigianato_online_test');
        
        // Create fresh test database
        await client.query('CREATE DATABASE artigianato_online_test');
        console.log('Database di test creato');
        
        // Connect to test database
        const testClient = new Client({
            host: 'localhost',
            port: 5432,
            database: 'artigianato_online_test',
            user: 'postgres',
            password: 'postgres'
        });

        await testClient.connect();

        // Create tables
        const tablesPath = path.join(__dirname, '..', 'db', 'tables.sql');
        const tables = fs.readFileSync(tablesPath, 'utf-8');
        await testClient.query(tables);
        console.log('Tabelle create');

        // Insert test data
        const seedPath = path.join(__dirname, 'test-seed.sql');
        if (fs.existsSync(seedPath)) {
            const seed = fs.readFileSync(seedPath, 'utf-8');
            await testClient.query(seed);
            console.log('Dati di test inseriti');
        }

        await testClient.end();

    } catch (err) {
        console.error('Errore inizializzazione database di test:', err);
        throw err;
    } finally {
        await client.end();
    }
}

// ...existing code...

// Modify connection handling for tests
const connect = async () => {
    try {
        await pool.connect();
        console.log('Successfully connected to database');
        return pool;
    } catch (err) {
        console.error('Error connecting to database:', err);
        throw err;
    }
};

// Add cleanup function for tests
const closePool = async () => {
    try {
        await pool.end();
        console.log('Database pool closed');
    } catch (err) {
        console.error('Error closing pool:', err);
        throw err;
    }
};

module.exports = {
    pool,
    connect,
    closePool,
    initializeDatabase
};

module.exports = { initTestDatabase };