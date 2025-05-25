const jwt = require('jsonwebtoken');

const createAuthMiddleware = () => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Autenticazione richiesta'
                });
            }

            const token = authHeader.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token non fornito'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded || !decoded.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Token non valido'
                });
            }

            // Set user info in request
            req.user = {
                id: decoded.id,
                username: decoded.username,
                ruolo_id: decoded.ruolo_id
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({
                success: false,
                message: 'Token non valido o scaduto'
            });
        }
    };
};

module.exports = createAuthMiddleware;