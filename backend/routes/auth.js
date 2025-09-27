const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createDatabase } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token expires in 7 days
    );
};

// Generate login link token (longer expiration for email links)
const generateLoginLinkToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            email: user.email,
            type: 'login_link'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Login link expires in 30 days
    );
};

// POST /api/auth/login
// Traditional login with username/password
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const db = createDatabase();

        db.getCallback(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username],
            async (err, user) => {
                db.close();

                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid credentials'
                    });
                }

                // Verify password
                const validPassword = await bcrypt.compare(password, user.password_hash);
                if (!validPassword) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid credentials'
                    });
                }

                // Generate JWT token
                const token = generateToken(user);

                // Update last login
                const updateDb = createDatabase();
                updateDb.runCallback(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    [user.id],
                    function(err) {
                        updateDb.close();
                        if (err) {
                            console.error('Error updating last login:', err);
                        }
                    }
                );

                res.json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            firstName: user.first_name,
                            lastName: user.last_name
                        }
                    }
                });
            }
        );
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// POST /api/auth/login-link
// Verify login link token (for direct access via email/link)
router.post('/login-link', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('Token verification failed:', err.message);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            if (decoded.type !== 'login_link') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token type'
                });
            }

            const db = createDatabase();

            db.getCallback(
                'SELECT * FROM users WHERE id = ? AND is_active = 1',
                [decoded.userId],
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
                        return res.status(401).json({
                            success: false,
                            error: 'User not found or inactive'
                        });
                    }

                    // Generate a new regular token for the session
                    const sessionToken = generateToken(user);

                    // Update last login
                    const updateDb = createDatabase();
                    updateDb.runCallback(
                        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                        [user.id],
                        function(err) {
                            updateDb.close();
                            if (err) {
                                console.error('Error updating last login:', err);
                            }
                        }
                    );

                    res.json({
                        success: true,
                        message: 'Login successful',
                        data: {
                            token: sessionToken,
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                firstName: user.first_name,
                                lastName: user.last_name
                            }
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Login link error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// GET /api/auth/verify
// Verify current token and return user info
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'No token provided'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        const db = createDatabase();

        db.getCallback(
            'SELECT id, username, email, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
            [decoded.userId],
            (err, user) => {
                db.close();

                if (err || !user) {
                    return res.status(401).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            firstName: user.first_name,
                            lastName: user.last_name
                        }
                    }
                });
            }
        );
    });
});

module.exports = router;