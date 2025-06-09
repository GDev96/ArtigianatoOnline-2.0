const { pool } = require('../db/db');

async function checkAndRemoveSuspensions() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get utenti con sospensioni scadute
        const expiredSuspensions = await client.query(`
            SELECT DISTINCT u.id
            FROM utente u
            JOIN sospensioni_utenti s ON u.id = s.utente_id
            WHERE u.stato = 'sospeso'
            AND s.data_fine IS NULL
            AND s.data_fine_prevista <= CURRENT_TIMESTAMP
            AND s.rimossa_da_admin = false
            AND NOT EXISTS (
                SELECT 1 
                FROM segnalazioni sg
                JOIN recensioni r ON sg.recensione_id = r.recensione_id
                WHERE r.cliente_id = u.id 
                AND sg.stato_segnalazione = 'in attesa'
                GROUP BY r.cliente_id
                HAVING COUNT(*) > 3
            )
        `);

        // Riattiva gli utenti con sospensioni scadute
        for (const row of expiredSuspensions.rows) {
            await client.query(`
                UPDATE utente 
                SET stato = 'attivo' 
                WHERE id = $1
            `, [row.id]);

            await client.query(`
                UPDATE sospensioni_utenti
                SET data_fine = CURRENT_TIMESTAMP
                WHERE utente_id = $1 
                AND data_fine IS NULL
            `, [row.id]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error checking suspensions:', error);
    } finally {
        client.release();
    }
}

module.exports = { checkAndRemoveSuspensions };