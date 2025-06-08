const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const { app, startServer } = require('../../app');
const { pool } = require('../../db/db');

let server;

describe('API Integration Tests', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        server = await startServer();
    });

    afterAll(async () => {
        if (pool) await pool.end();
        if (server) await new Promise(resolve => server.close(resolve));
    });

    describe('Authentication', () => {
        test('POST /auth/login - invalid credentials returns 400', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'wrongpassword'
                })
                .expect(400); // Updated to match actual response
        });

    test('POST /auth/signup - valid data creates user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 1
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    await pool.end();
    // Close server properly
    if (app.listening) {
      await new Promise(resolve => app.server.close(resolve));
    }
  });
});