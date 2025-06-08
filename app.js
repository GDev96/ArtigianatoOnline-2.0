require('dotenv').config();
const express = require('express');
const { getPool } = require('./db/pool');

const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const createAuthMiddleware = require('./middleware/auth');
const PORT = process.env.PORT || 3000;

// Create auth middleware
const requireAuth = createAuthMiddleware();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const reviewsRouter = require('./routes/reviews');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');

// Routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/products', productsRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);
app.use('/reviews', reviewsRouter);
app.use('/reports', reportsRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);

// Protected routes
app.get('/profile.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/profile.html'));
});

app.get('/cart.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/cart.html'));
});

app.get('/dashboard.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Si è verificato un errore interno del server',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const { networkInterfaces } = require('os');

function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost'; // Fallback to localhost if no network interface found
}

const startServer = async () => {
    try {
        console.log('Starting server...');
        
        // Test database connection
        const pool = getPool();
        await pool.query('SELECT NOW()');
        console.log('Database connection successful');
        
        // Check if tables exist and create them if needed
        try {
            const result = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'utente'
            `);
            
            if (result.rows.length === 0) {
                console.log('Tables not found, running schema creation...');
                const fs = require('fs');
                const path = require('path');
                
                // Read and execute tables.sql
                const tablesSQL = fs.readFileSync(path.join(__dirname, 'db/tables.sql'), 'utf8');
                await pool.query(tablesSQL);
                console.log('Database schema created');
                
                // Run seed to populate initial data
                const seed = require('./db/seed');
                await seed();
                console.log('Database seeded successfully');
            } else {
                console.log('Database schema exists');
                
                // Check if we need to run seed (check if users exist)
                const userCheck = await pool.query('SELECT COUNT(*) FROM utente');
                const userCount = parseInt(userCheck.rows[0].count);
                
                if (userCount === 0) {
                    console.log('No users found, running seed...');
                    const seed = require('./db/seed');
                    await seed();
                    console.log('Database seeded successfully');
                } else {
                    console.log(`Database has ${userCount} users`);
                }
            }
        } catch (schemaError) {
            console.error('Database schema error:', schemaError.message);
            
            try {
                const fs = require('fs');
                const path = require('path');
                const tablesSQL = fs.readFileSync(path.join(__dirname, 'db/tables.sql'), 'utf8');
                await pool.query(tablesSQL);
                
                // Run seed
                const seed = require('./db/seed');
                await seed();
            } catch (createError) {
                console.error('Failed to create schema:', createError.message);
                throw createError;
            }
        }
        
        // Start the HTTP server
        const server = app.listen(PORT, () => {
            console.log('\nServer started successfully!');
            console.log('\x1b[32m%s\x1b[0m', `Server running on port ${PORT}`);
            console.log('\x1b[36m%s\x1b[0m', `➜ Local:   http://localhost:${PORT}`);
            console.log('\x1b[36m%s\x1b[0m', `➜ Network: http://${getLocalIP()}:${PORT}`);
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down server...');
            server.close(async () => {
                try {
                    const { closePool } = require('./db/pool');
                    await closePool();
                    console.log('Database connections closed');
                } catch (error) {
                    console.error('Error closing database:', error);
                }
                console.log('Server stopped');
                process.exit(0);
            });
        });
        
        return server;
    } catch (error) {
        console.error('Server startup error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        
        // Provide helpful error messages
        if (error.message.includes('connect ECONNREFUSED')) {
            console.error('\n Suggestions:');
            console.error('   - Make sure PostgreSQL is running');
            console.error('   - Check your database configuration in .env');
            console.error('   - Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
            console.error('\n Suggestions:');
            console.error('   - Create the database manually in PostgreSQL');
            console.error('   - Run: CREATE DATABASE artigianato_online;');
        } else if (error.message.includes('permission denied')) {
            console.error('\n Suggestions:');
            console.error('   - Check database user permissions');
            console.error('   - Verify DB_USER has access to DB_NAME');
        }
        
        throw error;
    }
};

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    startServer().catch((error) => {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    });
}

module.exports = { app, startServer };