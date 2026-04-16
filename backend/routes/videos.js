const express = require('express');
const { createDatabase } = require('../utils/database');
const path = require('path');
const fs = require('fs');
const { verifyActiveUser } = require('../middleware/auth');
const { getSignedVideoUrl } = require('../utils/r2');
require('dotenv').config();

const router = express.Router();

// Apply user verification middleware to all routes
router.use(verifyActiveUser);

// GET /api/videos
// Get all videos available to the authenticated user
router.get('/', (req, res) => {
    const userId = req.user.userId;

    const db = createDatabase();

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

    db.allCallback(query, [userId], async (err, videos) => {
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

        // Generate signed URLs for all videos
        const videosWithUrls = await Promise.all(videos.map(async (video) => {
            try {
                const signedUrl = await getSignedVideoUrl(video.file_path, 3600); // 1 hour expiry
                return {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    signedUrl: signedUrl, // Add signed URL
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                };
            } catch (error) {
                console.error(`Failed to generate signed URL for video ${video.id}:`, error.message);
                return {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    signedUrl: null,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                };
            }
        }));

        res.json({
            success: true,
            data: {
                videos: videosWithUrls,
                totalCount: videos.length
            }
        });
    });
});

// GET /api/videos/categories
// Get available video categories for the user
router.get('/categories', (req, res) => {
    const userId = req.user.userId;

    const db = createDatabase();

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

    db.allCallback(query, [userId], (err, categories) => {
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

// GET /api/videos/training-days
// Get user's training days with videos organized by day
router.get('/training-days', async (req, res) => {
    const userId = req.user.userId;

    const db = createDatabase();

    try {
        // Get all training days for the user
        const days = await new Promise((resolve, reject) => {
            db.allCallback(`
                SELECT id, user_id, day_number, day_name, created_at, updated_at
                FROM user_training_days
                WHERE user_id = ? AND is_active = 1
                ORDER BY day_number ASC
            `, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // For each day, get its videos with signed URLs
        const daysWithVideos = await Promise.all(
            days.map(async (day) => {
                const videos = await new Promise((resolve, reject) => {
                    db.allCallback(`
                        SELECT
                            tdv.id as assignment_id,
                            tdv.order_index,
                            tdv.added_at,
                            v.id,
                            v.title,
                            v.description,
                            v.file_path,
                            v.duration,
                            v.thumbnail_path,
                            v.category
                        FROM training_day_videos tdv
                        INNER JOIN videos v ON tdv.video_id = v.id
                        WHERE tdv.training_day_id = ? AND v.is_active = 1
                        ORDER BY tdv.order_index ASC
                    `, [day.id], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                // Generate signed URLs for all videos
                const videosWithUrls = await Promise.all(videos.map(async (video) => {
                    try {
                        const signedUrl = await getSignedVideoUrl(video.file_path, 3600);
                        return {
                            assignmentId: video.assignment_id,
                            orderIndex: video.order_index,
                            addedAt: video.added_at,
                            id: video.id,
                            title: video.title,
                            description: video.description,
                            filePath: video.file_path,
                            signedUrl: signedUrl,
                            duration: video.duration,
                            thumbnailPath: video.thumbnail_path,
                            category: video.category
                        };
                    } catch (error) {
                        console.error(`Failed to generate signed URL for video ${video.id}:`, error.message);
                        return {
                            assignmentId: video.assignment_id,
                            orderIndex: video.order_index,
                            addedAt: video.added_at,
                            id: video.id,
                            title: video.title,
                            description: video.description,
                            filePath: video.file_path,
                            signedUrl: null,
                            duration: video.duration,
                            thumbnailPath: video.thumbnail_path,
                            category: video.category
                        };
                    }
                }));

                return {
                    id: day.id,
                    userId: day.user_id,
                    dayNumber: day.day_number,
                    dayName: day.day_name,
                    createdAt: day.created_at,
                    updatedAt: day.updated_at,
                    videos: videosWithUrls
                };
            })
        );

        db.close();

        console.log(`User ${req.user.username} accessed training days (${daysWithVideos.length} days)`);

        res.json({
            success: true,
            data: {
                trainingDays: daysWithVideos,
                totalDays: daysWithVideos.length
            }
        });
    } catch (error) {
        db.close();
        console.error('Get training days error:', error);
        res.status(500).json({
            success: false,
            error: 'Database error'
        });
    }
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

    const db = createDatabase();

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

    db.getCallback(query, [userId, videoId], async (err, video) => {
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
        db.runCallback(`
            INSERT INTO access_logs (user_id, video_id, ip_address, user_agent)
            VALUES (?, ?, ?, ?)
        `, [
            userId,
            videoId,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent')
        ], function(logErr) {
            if (logErr) {
                console.error('Failed to log access:', logErr.message);
            }
        });

        db.close();

        console.log(`User ${req.user.username} accessed video: ${video.title}`);

        // Generate signed URL
        let signedUrl = null;
        try {
            signedUrl = await getSignedVideoUrl(video.file_path, 3600);
        } catch (error) {
            console.error(`Failed to generate signed URL for video ${video.id}:`, error.message);
        }

        res.json({
            success: true,
            data: {
                video: {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    signedUrl: signedUrl,
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

// GET /api/videos/category/:category
// Get videos by category for the authenticated user
router.get('/category/:category', (req, res) => {
    const userId = req.user.userId;
    const category = req.params.category;

    const db = createDatabase();

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

    db.allCallback(query, [userId, category], async (err, videos) => {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        // Generate signed URLs for all videos
        const videosWithUrls = await Promise.all(videos.map(async (video) => {
            try {
                const signedUrl = await getSignedVideoUrl(video.file_path, 3600);
                return {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    signedUrl: signedUrl,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                };
            } catch (error) {
                console.error(`Failed to generate signed URL for video ${video.id}:`, error.message);
                return {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    signedUrl: null,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                };
            }
        }));

        res.json({
            success: true,
            data: {
                category,
                videos: videosWithUrls,
                totalCount: videos.length
            }
        });
    });
});

module.exports = router;