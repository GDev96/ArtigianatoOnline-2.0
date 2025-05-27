const jwt = require('jsonwebtoken');

function createAuthMiddleware() {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Autenticazione richiesta',
                    code: 'AUTH_REQUIRED'
                });
            }

            const token = authHeader.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token non fornito',
                    code: 'TOKEN_MISSING'
                });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (!decoded || !decoded.id) {
                    return res.status(401).json({
                        success: false,
                        message: 'Token non valido',
                        code: 'TOKEN_INVALID'
                    });
                }

                req.user = {
                    id: decoded.id,
                    username: decoded.username,
                    ruolo_id: decoded.ruolo_id
                };

                next();
            } catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        message: 'Token scaduto',
                        code: 'TOKEN_EXPIRED'
                    });
                }
                throw jwtError;
            }
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({
                success: false,
                message: 'Token non valido o scaduto',
                code: 'AUTH_ERROR'
            });
        }
    };
}

// Export the function properly
module.exports = createAuthMiddleware;