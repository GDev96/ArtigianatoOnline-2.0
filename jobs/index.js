const { updateOrderStatuses } = require('./orderStatusUpdater');
const { checkAndRemoveSuspensions } = require('./userSuspensionManager');

async function initializeJobs() {
    try {
        // Schedule order status updates (every hour)
        setInterval(updateOrderStatuses, 60 * 60 * 1000);
        
        // Schedule suspension checks (every hour)
        setInterval(checkAndRemoveSuspensions, 60 * 60 * 1000);
        
        console.log('All scheduled jobs initialized successfully');
    } catch (error) {
        console.error('Error initializing jobs:', error);
        throw error;
    }
}

module.exports = {
    initializeJobs
};