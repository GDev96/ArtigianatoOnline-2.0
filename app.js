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
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Si è verificato un errore interno del server'
    });
});

const startServer = async () => {
    try {
        const pool = getPool();
        const server = app.listen(PORT, () => {
            console.log('\x1b[32m%s\x1b[0m', `🚀 Server running on port ${PORT}`);
            console.log('\x1b[36m%s\x1b[0m', `➜ Local:   http://localhost:${PORT}`);
            console.log('\x1b[36m%s\x1b[0m', `➜ Network: http://${getLocalIP()}:${PORT}`);
        });
        return server;
    } catch (error) {
        console.error('Server startup error:', error);
        throw error;
    }
};

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

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, startServer };