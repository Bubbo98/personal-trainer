const jwt = require('jsonwebtoken');
const { createDatabase } = require('../utils/database');
require('dotenv').config();

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    });
};

// Middleware to verify user exists and is active
const verifyActiveUser = (req, res, next) => {
    const db = createDatabase();

    db.getCallback(
        'SELECT id, username, email, is_active FROM users WHERE id = ? AND is_active = 1',
        [req.user.userId],
        (err, user) => {
            db.close();

            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!user) {
                return res.status(403).json({
                    success: false,
                    error: 'User not found or inactive'
                });
            }

            req.user.userData = user;
            next();
        }
    );
};

// Middleware for admin-only routes
const requireAdmin = (req, res, next) => {
    // For now, we'll use a simple admin username check
    // In a more complex system, you'd have roles/permissions in the database
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    if (req.user.username !== adminUsername) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }

    // Set role to admin for use in other routes
    req.user.role = 'admin';

    next();
};

// Middleware to log access attempts
const logAccess = (req, res, next) => {
    const logData = {
        user_id: req.user ? req.user.userId : null,
        access_time: new Date().toISOString(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
    };

    // This is a simple access log - you could extend this for video-specific logging
    console.log('Access logged:', {
        user: req.user ? req.user.username : 'anonymous',
        endpoint: `${req.method} ${req.path}`,
        ip: logData.ip_address,
        time: logData.access_time
    });

    next();
};

module.exports = {
    authenticateToken,
    verifyActiveUser,
    requireAdmin,
    logAccess
};