const jwt = require('jsonwebtoken');

// Export a function that returns the middleware
module.exports = function createAuthMiddleware() {
    return function requireAuth(req, res, next) {
        const publicPaths = [
            '/',
            '/index.html',
            '/login.html',
            '/signup.html',
            '/users/login',
            '/users/signup',
            '/css/',
            '/js/',
            '/assets/',
            '/categories'
        ];

        const currentPath = req.originalUrl || req.url || '';

        // Skip auth for public paths
        if (publicPaths.some(path => currentPath.startsWith(path))) {
            return next();
        }

        let token = null;

        // Get token from different sources
        if (req.headers?.authorization) {
            const [bearer, authToken] = req.headers.authorization.split(' ');
            if (bearer === 'Bearer' && authToken) {
                token = authToken;
            }
        }

        token = token || req.cookies?.token || req.query?.token;

        if (!token) {
            const isApiRequest = req.xhr || currentPath.startsWith('/api/');
            const response = {
                success: false,
                error: 'Authentication required'
            };

            if (!isApiRequest) {
                response.redirect = '/login.html';
            }

            return res.status(401).json(response);
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                redirect: '/login.html'
            });
        }
    };
};