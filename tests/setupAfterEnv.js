const { afterAll, afterEach } = require('@jest/globals');
const { pool } = require('../db/db');

// Aumenta timeout per tutti i test
jest.setTimeout(10000);

// Cleanup dopo ogni test
afterEach(async () => {
  // Aggiungi qui eventuali pulizie specifiche per test
});

// Cleanup finale
afterAll(async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('Database pool chiuso correttamente');
    }
  } catch (error) {
    console.error('Errore durante la chiusura del pool:', error);
  }
});