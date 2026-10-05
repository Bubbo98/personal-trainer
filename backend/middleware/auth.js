const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../utils/database');

/** True when the authenticated user is the admin account. */
const isAdmin = (user) => !!user && user.username === config.adminUsername;

/**
 * Bearer session token → req.user ({ userId, username, email }).
 * Login-link tokens (type "login_link") are only valid for POST /api/auth/login-link,
 * which exchanges them for a session token.
 */
function authenticateToken(req, res, next) {
    const header = req.headers.authorization;
    const token = header && header.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, config.jwtSecret, (err, payload) => {
        if (err || payload.type === 'login_link') {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = payload;
        next();
    });
}

/** Admin-only routes (after authenticateToken). */
function requireAdmin(req, res, next) {
    if (!isAdmin(req.user)) {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    req.user.role = 'admin';
    next();
}

/** Rejects tokens of users that were deleted or deactivated. */
async function verifyActiveUser(req, res, next) {
    try {
        const user = await db.get(
            'SELECT id, username, email FROM users WHERE id = ? AND is_active = 1',
            [req.user.userId]
        );
        if (!user) {
            return res.status(403).json({ success: false, error: 'User not found or inactive' });
        }
        req.user.userData = user;
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = { authenticateToken, requireAdmin, verifyActiveUser, isAdmin };
