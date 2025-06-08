const { afterAll } = require('@jest/globals');
const { pool } = require('../db/db');

// Set test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
    if (pool) {
        await pool.end();
        console.log('Pool database chiuso');
    }
});