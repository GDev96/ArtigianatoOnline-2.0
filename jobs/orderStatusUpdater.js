const { pool } = require('../db/db');

const STATI = {
    IN_PREPARAZIONE: 'in preparazione',
    SPEDITO: 'spedito',
    CONSEGNATO: 'consegnato',
    CONTROVERSIA: 'controversia aperta'
};

async function updateOrderStatuses() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: aggiorna "spedito" per ordini in preparazione da più di 1 giorno
        await client.query(`
            UPDATE ordini 
            SET stato = $1
            WHERE stato = $2 
            AND data_ordine <= NOW() - INTERVAL '1 day'
            AND data_ordine > NOW() - INTERVAL '4 days'
            AND NOT has_reports`,
            [STATI.SPEDITO, STATI.IN_PREPARAZIONE]
        );

        // Step 2: aggiorna "consegnato" per ordini spediti da più di 4 giorni
        await client.query(`
            UPDATE ordini 
            SET stato = $1
            WHERE stato = $2
            AND data_ordine <= NOW() - INTERVAL '4 days'
            AND NOT has_reports`,
            [STATI.CONSEGNATO, STATI.SPEDITO]
        );

        // Step 3: aggiorna controversia per ordini con segnalazioni in attesa
        await client.query(`
            UPDATE ordini o
            SET stato = $1
            WHERE EXISTS (
                SELECT 1 
                FROM segnalazioni s 
                WHERE s.ordine_id = o.ordine_id 
                AND s.stato_segnalazione = 'in attesa'
            )
            AND NOT EXISTS (
                SELECT 1
                FROM segnalazioni s
                WHERE s.ordine_id = o.ordine_id
                AND s.stato_segnalazione = 'risolta'
            )
            AND stato != $1`,
            [STATI.CONTROVERSIA]
        );

        await client.query('COMMIT');
        console.log('Order statuses updated successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating order statuses:', error);
    } finally {
        client.release();
    }
}

module.exports = { updateOrderStatuses };