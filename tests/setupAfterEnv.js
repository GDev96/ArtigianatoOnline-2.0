const { afterAll, afterEach, beforeAll } = require('@jest/globals');
const { closePool } = require('../db/pool');
const { app, startServer } = require('../app');

let server;

beforeAll(async () => {
    try {
        jest.setTimeout(10000);
        server = await startServer();
    } catch (error) {
        console.error('Test setup error:', error);
        throw error;
    }
});

afterEach(async () => {
    // Add specific test cleanup if needed
});

afterAll(async () => {
    try {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        await closePool();
    } catch (error) {
        console.error('Test cleanup error:', error);
    }
});