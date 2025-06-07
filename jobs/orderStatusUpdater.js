const { pool } = require('../db/db');

const STATI = {
    IN_PREPARAZIONE: 'in preparazione',
    SPEDITO: 'spedito',
    CONSEGNATO: 'consegnato'
};

async function updateOrderStatuses() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update orders to "spedito" after 1 day
        await client.query(`
            UPDATE ordini 
            SET stato = $1
            WHERE stato = $2 
            AND data_ordine <= NOW() - INTERVAL '1 day'
            AND NOT has_reports`,
            [STATI.SPEDITO, STATI.IN_PREPARAZIONE]
        );

        // Update orders to "consegnato" after 4 days
        await client.query(`
            UPDATE ordini 
            SET stato = $1
            WHERE stato = $2
            AND data_ordine <= NOW() - INTERVAL '4 days'
            AND NOT has_reports`,
            [STATI.CONSEGNATO, STATI.SPEDITO]
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