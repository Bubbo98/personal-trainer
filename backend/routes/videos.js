const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { verifyActiveUser } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const dbPath = process.env.DB_PATH || './database/app.db';

// Apply user verification middleware to all routes
router.use(verifyActiveUser);

// GET /api/videos
// Get all videos available to the authenticated user
router.get('/', (req, res) => {
    const userId = req.user.userId;

    const db = new sqlite3.Database(dbPath);

    const query = `
        SELECT
            v.id,
            v.title,
            v.description,
            v.file_path,
            v.duration,
            v.thumbnail_path,
            v.category,
            v.created_at,
            uvp.granted_at,
            uvp.expires_at
        FROM videos v
        INNER JOIN user_video_permissions uvp ON v.id = uvp.video_id
        WHERE uvp.user_id = ?
        AND v.is_active = 1
        AND uvp.is_active = 1
        AND (uvp.expires_at IS NULL OR uvp.expires_at > CURRENT_TIMESTAMP)
        ORDER BY v.created_at DESC
    `;

    db.all(query, [userId], (err, videos) => {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        // Log access for analytics
        console.log(`User ${req.user.username} accessed video list (${videos.length} videos)`);

        res.json({
            success: true,
            data: {
                videos: videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                })),
                totalCount: videos.length
            }
        });
    });
});

// GET /api/videos/:id
// Get specific video details and verify access
router.get('/:id', (req, res) => {
    const userId = req.user.userId;
    const videoId = req.params.id;

    if (!videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid video ID is required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    const query = `
        SELECT
            v.id,
            v.title,
            v.description,
            v.file_path,
            v.duration,
            v.thumbnail_path,
            v.category,
            v.created_at,
            uvp.granted_at,
            uvp.expires_at
        FROM videos v
        INNER JOIN user_video_permissions uvp ON v.id = uvp.video_id
        WHERE uvp.user_id = ?
        AND v.id = ?
        AND v.is_active = 1
        AND uvp.is_active = 1
        AND (uvp.expires_at IS NULL OR uvp.expires_at > CURRENT_TIMESTAMP)
    `;

    db.get(query, [userId, videoId], (err, video) => {
        if (err) {
            db.close();
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (!video) {
            db.close();
            return res.status(404).json({
                success: false,
                error: 'Video not found or access denied'
            });
        }

        // Log video access
        db.run(`
            INSERT INTO access_logs (user_id, video_id, ip_address, user_agent)
            VALUES (?, ?, ?, ?)
        `, [
            userId,
            videoId,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent')
        ], (logErr) => {
            if (logErr) {
                console.error('Failed to log access:', logErr.message);
            }
        });

        db.close();

        console.log(`User ${req.user.username} accessed video: ${video.title}`);

        res.json({
            success: true,
            data: {
                video: {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                }
            }
        });
    });
});

// GET /api/videos/categories
// Get available video categories for the user
router.get('/categories', (req, res) => {
    const userId = req.user.userId;

    const db = new sqlite3.Database(dbPath);

    const query = `
        SELECT DISTINCT v.category, COUNT(*) as video_count
        FROM videos v
        INNER JOIN user_video_permissions uvp ON v.id = uvp.video_id
        WHERE uvp.user_id = ?
        AND v.is_active = 1
        AND uvp.is_active = 1
        AND (uvp.expires_at IS NULL OR uvp.expires_at > CURRENT_TIMESTAMP)
        AND v.category IS NOT NULL
        GROUP BY v.category
        ORDER BY v.category
    `;

    db.all(query, [userId], (err, categories) => {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        res.json({
            success: true,
            data: {
                categories: categories.map(cat => ({
                    name: cat.category,
                    videoCount: cat.video_count
                }))
            }
        });
    });
});

// GET /api/videos/category/:category
// Get videos by category for the authenticated user
router.get('/category/:category', (req, res) => {
    const userId = req.user.userId;
    const category = req.params.category;

    const db = new sqlite3.Database(dbPath);

    const query = `
        SELECT
            v.id,
            v.title,
            v.description,
            v.file_path,
            v.duration,
            v.thumbnail_path,
            v.category,
            v.created_at,
            uvp.granted_at,
            uvp.expires_at
        FROM videos v
        INNER JOIN user_video_permissions uvp ON v.id = uvp.video_id
        WHERE uvp.user_id = ?
        AND v.category = ?
        AND v.is_active = 1
        AND uvp.is_active = 1
        AND (uvp.expires_at IS NULL OR uvp.expires_at > CURRENT_TIMESTAMP)
        ORDER BY v.created_at DESC
    `;

    db.all(query, [userId, category], (err, videos) => {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        res.json({
            success: true,
            data: {
                category,
                videos: videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                })),
                totalCount: videos.length
            }
        });
    });
});

module.exports = router;