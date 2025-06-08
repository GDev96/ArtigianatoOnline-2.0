const request = require('supertest');
const { app } = require('../../app');
const { getPool } = require('../../db/pool');

describe('API Integration Tests', () => {
    let pool;

    beforeAll(async () => {
        pool = getPool();
        
        // Setup test database state
        await pool.query('TRUNCATE TABLE utente, ruoli CASCADE');
        
        // Insert required roles
        await pool.query(`
            INSERT INTO ruoli (ruolo_id, nome_ruolo) 
            VALUES (1, 'cliente'), (2, 'artigiano'), (3, 'admin')
            ON CONFLICT (ruolo_id) DO NOTHING
        `);

        // Verify roles were inserted
        const roles = await pool.query('SELECT * FROM ruoli');
        console.log('Available roles:', roles.rows);
    });

    describe('Authentication', () => {
        test('POST /auth/signup - valid data creates user', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Test123!',
                nome: 'Test',
                cognome: 'User',
                numero_telefono: '1234567890',
                indirizzo: 'Via Test 123',
                citta: 'Test City',
                ruolo_id: 1
            };
    
            console.log('Sending signup request with:', userData);
    
            const response = await request(app)
                .post('/auth/signup')
                .send(userData);
    
            // Detailed error logging
            if (response.status !== 201) {
                console.log('Signup failed:', response.body);
                
                // Check database state
                const user = await pool.query(
                    'SELECT username, email, stato, ruolo_id FROM utente WHERE username = $1',
                    [userData.username]
                );
                console.log('User in database:', user.rows);
            }
    
            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                success: true,
                token: expect.any(String),
                user: expect.objectContaining({
                    username: userData.username,
                    email: userData.email
                })
            });
    
            // Verify user was created with correct data
            const savedUser = await pool.query(
                'SELECT username, email, stato, ruolo_id FROM utente WHERE username = $1',
                [userData.username]
            );
            expect(savedUser.rows[0]).toMatchObject({
                username: userData.username,
                email: userData.email,
                stato: 'attivo',
                ruolo_id: 1
            });
        });
    });

    afterAll(async () => {
        await pool.query('TRUNCATE TABLE utente CASCADE');
    });
});