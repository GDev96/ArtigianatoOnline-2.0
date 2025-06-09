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
            
            try {
                // Usa lo stesso fallback del sistema di login
                const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-for-development';
                const decoded = jwt.verify(token, jwtSecret);
                
                req.user = {
                    id: decoded.id,
                    username: decoded.username,
                    ruolo_id: decoded.ruolo_id
                };
                next();
            } catch (jwtError) {
                console.log('JWT Error:', jwtError.name, jwtError.message);
                
                if (jwtError.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        message: 'Sessione scaduta',
                        code: 'SESSION_EXPIRED'
                    });
                }
                
                if (jwtError.name === 'JsonWebTokenError') {
                    return res.status(401).json({
                        success: false,
                        message: 'Token non valido',
                        code: 'INVALID_TOKEN'
                    });
                }
                
                // Altri errori JWT
                return res.status(401).json({
                    success: false,
                    message: 'Errore di autenticazione',
                    code: 'AUTH_ERROR'
                });
            }
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({
                success: false,
                message: 'Token non valido',
                code: 'AUTH_ERROR'
            });
        }
    };
}

module.exports = createAuthMiddleware;