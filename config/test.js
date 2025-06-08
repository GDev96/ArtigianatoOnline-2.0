module.exports = {
    database: {
        host: 'localhost',
        port: 5432,
        name: 'artigianato_online_test',
        user: 'postgres',
        password: 'postgres'
    },
    server: {
        port: 3001 // Porta dedicata per test
    },
    jwt: {
        secret: 'test-secret-key'
    }
};