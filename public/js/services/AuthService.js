class AuthService {
    static setSession(token, user, expiresIn) {
        const expiresAt = new Date().getTime() + expiresIn;
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('expiresAt', expiresAt.toString());

        // Set timeout for auto logout
        setTimeout(() => this.logout(), expiresIn);
    }

    static logout() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('expiresAt');
        window.location.href = '/login.html';
    }

    static isAuthenticated() {
        const expiresAt = sessionStorage.getItem('expiresAt');
        return expiresAt && new Date().getTime() < parseInt(expiresAt);
    }

    static getUser() {
        if (!this.isAuthenticated()) {
            this.logout();
            return null;
        }
        return JSON.parse(sessionStorage.getItem('user'));
    }

    static getToken() {
        if (!this.isAuthenticated()) {
            this.logout();
            return null;
        }
        return sessionStorage.getItem('token');
    }

    static checkAuth() {
        if (this.isAuthenticated()) {
            const expiresAt = parseInt(sessionStorage.getItem('expiresAt'));
            const remaining = expiresAt - new Date().getTime();
            setTimeout(() => this.logout(), remaining);
            return true;
        }
        return false;
    }

        static getAuthorizationHeader() {
        const token = this.getToken();
        return token ? `Bearer ${token}` : null;
    }

    static async fetch(url, options = {}) {
        const token = this.getToken();
        if (token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }
        return fetch(url, options);
    }
}

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    // Public paths that don't need authentication
    const publicPaths = [
        '/login.html',
        '/signup.html',
        '/users/login',
        '/users/signup',
        '/css/',
        '/js/',
        '/assets/'
    ];

    // Get the current path, ensuring it exists
    const currentPath = req.originalUrl || req.url || '';

    // Check if path is public
    if (publicPaths.some(path => currentPath.startsWith(path))) {
        return next();
    }

    // Check for token in different places
    const token = req.headers.authorization?.split(' ')[1] || 
                 req.cookies?.token ||
                 req.query?.token;

    if (!token) {
        // Handle API requests differently from page requests
        if (req.xhr || currentPath.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (req.xhr || currentPath.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid or expired token' 
            });
        }
        res.redirect('/login.html');
    }
}

module.exports = requireAuth;