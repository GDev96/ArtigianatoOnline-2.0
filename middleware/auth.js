const jwt = require('jsonwebtoken');


const createAuthMiddleware = () => {
    return (req, res, next) => {
        // Check for API endpoints that require authentication
        if (req.path === '/reviews' && req.method === 'POST') {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Autenticazione richiesta'
                });
            }

            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Set user info in request
                req.user = {
                    id: decoded.id,
                    username: decoded.username,
                    ruolo_id: decoded.ruolo_id
                };
                
                return next();
            } catch (error) {
                console.error('Token verification error:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Token non valido o scaduto'
                });
            }

        }

        // Allow public paths
        const publicPaths = [
            '/login.html',
            '/signup.html',
            '/auth/login',
            '/auth/signup',
            '/auth/logout',
            '/css/',
            '/js/',
            '/assets/',
            '/categories',
            '/products',        
            '/reviews',         
            '/index.html',
            '/'
        ];

        if (publicPaths.some(path => req.path.startsWith(path)) && req.method === 'GET') {
            return next();
        }

        // Check for API endpoints that require authentication
        if (req.path === '/reviews' && req.method === 'POST') {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Autenticazione richiesta'
                });
            }

            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Set user info in request
                req.user = {
                    id: decoded.id,
                    username: decoded.username,
                    ruolo_id: decoded.ruolo_id
                };
                
                return next();
            } catch (error) {
                console.error('Token verification error:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Token non valido o scaduto'
                });
            }
        }

        let token = null;
        
        // Check authorization header
        if (req.headers?.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
            }
        }

        // Check cookies and query if no token in header
        token = token || req.cookies?.token || req.query?.token;

        if (!token) {
            return res.redirect('/login.html');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Check role-based access
            const currentPath = req.path;
            const isProfilePage = currentPath.includes('profile.html');
            const isDashboardPage = currentPath.includes('dashboard.html');
            const isAdminPage = currentPath.includes('admin.html');

            if ((isProfilePage && decoded.ruolo_id !== 1) ||
                (isDashboardPage && decoded.ruolo_id !== 2) ||
                (isAdminPage && decoded.ruolo_id !== 3)) {
                return res.redirect('/index.html');
            }

            return next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.redirect('/login.html');
        }
    };
};

module.exports = createAuthMiddleware;