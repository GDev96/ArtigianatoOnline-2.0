const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

const getPool = () => {
    if (!pool) {
        pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT)
        });
    }
    return pool;
};

const closePool = async () => {
    if (pool) {
        await pool.end();
        pool = null;
    }
};

module.exports = {
    getPool,
    closePool
};