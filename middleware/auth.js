const jwt = require('jsonwebtoken');

const createAuthMiddleware = () => {
    return (req, res, next) => {
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
        const currentPath = req.originalUrl || req.url || '';

        // Allow public paths
        if (publicPaths.some(path => currentPath.startsWith(path))) {
            return next();
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