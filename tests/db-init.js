const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/pool');

async function initTestDatabase() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'postgres' // Connect to default database first
    });

    try {
        await client.connect();

        // Create test database if it doesn't exist
        const dbName = process.env.DB_NAME || 'artigianato_online_test';
        await client.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '${dbName}'
            AND pid <> pg_backend_pid();
        `);
        
        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
        await client.query(`CREATE DATABASE ${dbName}`);
        
        // Close connection to postgres database
        await client.end();

        // Connect to new test database
        const testClient = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: dbName
        });

        await testClient.connect();

        // Read and execute schema
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, '..', 'db', 'tables.sql'),
            'utf8'
        );
        await testClient.query(schemaSQL);

        // Read and execute test seed
        const seedSQL = fs.readFileSync(
            path.join(__dirname, 'test-seed.sql'),
            'utf8'
        );
        await testClient.query(seedSQL);

        console.log('Test database initialized successfully');
        
        await testClient.end();

    } catch (err) {
        console.error('Error initializing test database:', err);
        throw err;
    }
}

// Run if called directly
if (require.main === module) {
    require('dotenv').config();
    initTestDatabase()
        .then(() => console.log('Database initialization complete'))
        .catch(err => {
            console.error('Database initialization failed:', err);
            process.exit(1);
        });
}

module.exports = { initTestDatabase };