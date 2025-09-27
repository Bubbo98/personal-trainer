const express = require('express');
const { createDatabase } = require('../utils/database');
require('dotenv').config();

const router = express.Router();

// GET /api/debug/database
// Test database connection and basic functionality
router.get('/database', (req, res) => {
    console.log('=== DEBUG: Testing database connection ===');

    const db = createDatabase();

    // Try a simple query to test connectivity
    db.allCallback('SELECT 1 as test', [], (err, result) => {
        db.close();

        if (err) {
            console.error('❌ Database connection failed:', err);
            return res.status(500).json({
                success: false,
                error: 'Database connection failed',
                details: err.message
            });
        }

        console.log('✅ Database connection successful:', result);
        res.json({
            success: true,
            message: 'Database connection successful',
            data: result
        });
    });
});

// GET /api/debug/users
// Test users table access
router.get('/users', (req, res) => {
    console.log('=== DEBUG: Testing users table ===');

    const db = createDatabase();

    // Count users in the database
    db.allCallback('SELECT COUNT(*) as user_count FROM users', [], (err, result) => {
        if (err) {
            db.close();
            console.error('❌ Users table query failed:', err);
            return res.status(500).json({
                success: false,
                error: 'Users table query failed',
                details: err.message
            });
        }

        // Get first few users (without sensitive data)
        db.allCallback('SELECT id, username, email, first_name, last_name, is_active, created_at FROM users LIMIT 5', [], (err2, users) => {
            db.close();

            if (err2) {
                console.error('❌ Users list query failed:', err2);
                return res.status(500).json({
                    success: false,
                    error: 'Users list query failed',
                    details: err2.message
                });
            }

            console.log('✅ Users query successful:', { count: result[0]?.user_count, users });
            res.json({
                success: true,
                message: 'Users table accessible',
                data: {
                    userCount: result[0]?.user_count || 0,
                    users: users || []
                }
            });
        });
    });
});

module.exports = router;