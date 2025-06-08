// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'artigianato_online_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

console.log('Environment variables set for testing');