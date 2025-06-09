const cron = require('node-cron');
const { updateOrderStatuses } = require('./orderStatusUpdater');
const { checkAndRemoveSuspensions } = require('./userSuspensionManager');

async function initializeJobs() {
    try {
        // Schedule per aggiornare gli stati degli ordini (ogni ora)
        cron.schedule('0 * * * *', async () => {
            try {
                await updateOrderStatuses();
            } catch (error) {
                console.error('Error in order status update job:', error);
            }
        });
        
        // Schedule per controllare e rimuovere sospensioni utenti (ogni ora)
        cron.schedule('0 * * * *', async () => {
            try {
                await checkAndRemoveSuspensions();
            } catch (error) {
                console.error('Error in suspension check job:', error);
            }
        });
        
        console.log('All scheduled jobs initialized successfully');
    } catch (error) {
        console.error('Error initializing jobs:', error);
        throw error;
    }
}

module.exports = {
    initializeJobs
};