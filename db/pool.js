const { Pool } = require('pg');

class DatabasePool {
    static instance = null;
    
    constructor() {
        if (!DatabasePool.instance) {
            this.pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            });
            this.isEnded = false;
            DatabasePool.instance = this;
        }
        return DatabasePool.instance;
    }

    getPool() {
        return this.pool;
    }

    async end() {
        if (!this.isEnded) {
            this.isEnded = true;
            await this.pool.end();
        }
    }
}

const dbPool = new DatabasePool();
module.exports = {
    getPool: () => dbPool.getPool(),
    closePool: () => dbPool.end()
};