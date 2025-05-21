const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ecommerce_artigiani',
    password: 'postgres',
    port: 5432,
});

pool.connect(async (err, client, done) => {
    if (err) {
        console.error('Errore di connessione al database', err);
        return;
    }

    console.log(' Connessione al database avvenuta con successo');

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await client.query(schema);
        console.log(' Schema eseguito correttamente');

        // 👇 Importa ed esegui il seed dopo lo schema
        const seed = require('./seed');
        //await seed(); // Assicurati che seed.js esporti una funzione async
        console.log(' Seed eseguito correttamente');

    } catch (schemaErr) {
        console.error(' Errore nell\'esecuzione dello schema o del seed:', schemaErr);
    } finally {
        done(); // release client
    }
});

module.exports = pool;