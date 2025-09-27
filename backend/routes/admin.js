const express = require('express');
const bcrypt = require('bcryptjs');
const { createDatabase } = require('../utils/database');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Generate login link token for users
const generateLoginLinkToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            email: user.email,
            type: 'login_link'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// POST /api/admin/users
// Create a new user
router.post('/users', async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            firstName,
            lastName
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const db = new sqlite3.Database(dbPath);

        db.run(`
            INSERT INTO users (username, email, password_hash, first_name, last_name)
            VALUES (?, ?, ?, ?, ?)
        `, [username, email, passwordHash, firstName, lastName], function(err) {
            if (err) {
                db.close();
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(409).json({
                        success: false,
                        error: 'Username or email already exists'
                    });
                }
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            const userId = this.lastID;

            // Get the created user
            db.get(
                'SELECT id, username, email, first_name, last_name, created_at FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    db.close();

                    if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({
                            success: false,
                            error: 'User created but failed to retrieve details'
                        });
                    }

                    // Generate login link token
                    const loginToken = generateLoginLinkToken(user);
                    const loginUrl = `${process.env.FRONTEND_URL}/dashboard/${loginToken}`;

                    console.log(`Admin ${req.user.username} created user: ${user.username}`);

                    res.status(201).json({
                        success: true,
                        message: 'User created successfully',
                        data: {
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                firstName: user.first_name,
                                lastName: user.last_name,
                                createdAt: user.created_at
                            },
                            loginToken,
                            loginUrl
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// GET /api/admin/users
// Get all users
router.get('/users', (req, res) => {
    const db = new sqlite3.Database(dbPath);

    db.all(`
        SELECT
            u.id,
            u.username,
            u.email,
            u.first_name,
            u.last_name,
            u.is_active,
            u.created_at,
            u.last_login,
            COUNT(uvp.video_id) as video_count
        FROM users u
        LEFT JOIN user_video_permissions uvp ON u.id = uvp.user_id AND uvp.is_active = 1
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `, (err, users) => {
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
                users: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isActive: user.is_active,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    videoCount: user.video_count
                })),
                totalCount: users.length
            }
        });
    });
});

// GET /api/admin/users/:id/videos
// Get videos assigned to specific user
router.get('/users/:id/videos', (req, res) => {
    const userId = req.params.id;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID is required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.all(`
        SELECT
            v.id,
            v.title,
            v.description,
            v.file_path,
            v.duration,
            v.category,
            uvp.granted_at,
            uvp.expires_at
        FROM videos v
        INNER JOIN user_video_permissions uvp ON v.id = uvp.video_id
        WHERE uvp.user_id = ?
        AND v.is_active = 1
        AND uvp.is_active = 1
        ORDER BY uvp.granted_at DESC
    `, [userId], (err, videos) => {
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
                videos: videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    duration: video.duration,
                    category: video.category,
                    grantedAt: video.granted_at,
                    expiresAt: video.expires_at
                }))
            }
        });
    });
});

// POST /api/admin/users/:id/generate-link
// Generate new login link for user
router.post('/users/:id/generate-link', (req, res) => {
    const userId = req.params.id;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID is required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.get(
        'SELECT id, username, email, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
        [userId],
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
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Generate new login token
            const loginToken = generateLoginLinkToken(user);
            const loginUrl = `${process.env.FRONTEND_URL}/dashboard/${loginToken}`;

            console.log(`Admin ${req.user.username} generated login link for user: ${user.username}`);

            res.json({
                success: true,
                message: 'Login link generated successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name
                    },
                    loginToken,
                    loginUrl
                }
            });
        }
    );
});

// POST /api/admin/users/:userId/videos/:videoId
// Grant video access to user
router.post('/users/:userId/videos/:videoId', (req, res) => {
    const { userId, videoId } = req.params;
    const { expiresAt } = req.body; // Optional expiration date

    if (!userId || isNaN(userId) || !videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID and video ID are required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    // First verify user and video exist
    db.get(
        'SELECT COUNT(*) as count FROM users WHERE id = ? AND is_active = 1',
        [userId],
        (err, userResult) => {
            if (err || userResult.count === 0) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            db.get(
                'SELECT COUNT(*) as count FROM videos WHERE id = ? AND is_active = 1',
                [videoId],
                (err, videoResult) => {
                    if (err || videoResult.count === 0) {
                        db.close();
                        return res.status(404).json({
                            success: false,
                            error: 'Video not found'
                        });
                    }

                    // Grant permission (INSERT OR REPLACE to handle duplicates)
                    db.run(`
                        INSERT OR REPLACE INTO user_video_permissions
                        (user_id, video_id, granted_by, expires_at, is_active)
                        VALUES (?, ?, ?, ?, 1)
                    `, [userId, videoId, req.user.username, expiresAt], function(err) {
                        db.close();

                        if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({
                                success: false,
                                error: 'Database error'
                            });
                        }

                        console.log(`Admin ${req.user.username} granted video ${videoId} access to user ${userId}`);

                        res.json({
                            success: true,
                            message: 'Video access granted successfully',
                            data: {
                                userId: parseInt(userId),
                                videoId: parseInt(videoId),
                                expiresAt,
                                grantedBy: req.user.username,
                                grantedAt: new Date().toISOString()
                            }
                        });
                    });
                }
            );
        }
    );
});

// DELETE /api/admin/users/:userId/videos/:videoId
// Revoke video access from user
router.delete('/users/:userId/videos/:videoId', (req, res) => {
    const { userId, videoId } = req.params;

    if (!userId || isNaN(userId) || !videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID and video ID are required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.run(
        'UPDATE user_video_permissions SET is_active = 0 WHERE user_id = ? AND video_id = ?',
        [userId, videoId],
        function(err) {
            db.close();

            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Permission not found'
                });
            }

            console.log(`Admin ${req.user.username} revoked video ${videoId} access from user ${userId}`);

            res.json({
                success: true,
                message: 'Video access revoked successfully'
            });
        }
    );
});

// GET /api/admin/videos
// Get all videos (admin view)
router.get('/videos', (req, res) => {
    const db = new sqlite3.Database(dbPath);

    db.all(`
        SELECT
            v.*,
            COUNT(uvp.user_id) as user_count
        FROM videos v
        LEFT JOIN user_video_permissions uvp ON v.id = uvp.video_id AND uvp.is_active = 1
        WHERE v.is_active = 1
        GROUP BY v.id
        ORDER BY v.created_at DESC
    `, (err, videos) => {
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
                videos: videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    filePath: video.file_path,
                    duration: video.duration,
                    thumbnailPath: video.thumbnail_path,
                    category: video.category,
                    createdAt: video.created_at,
                    updatedAt: video.updated_at,
                    userCount: video.user_count
                })),
                totalCount: videos.length
            }
        });
    });
});

// POST /api/admin/videos
// Create new video entry
router.post('/videos', (req, res) => {
    const {
        title,
        description,
        filePath,
        duration,
        thumbnailPath,
        category
    } = req.body;

    if (!title || !filePath) {
        return res.status(400).json({
            success: false,
            error: 'Title and file path are required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.run(`
        INSERT INTO videos (title, description, file_path, duration, thumbnail_path, category)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description, filePath, duration, thumbnailPath, category], function(err) {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        console.log(`Admin ${req.user.username} created video: ${title}`);

        res.status(201).json({
            success: true,
            message: 'Video created successfully',
            data: {
                id: this.lastID,
                title,
                description,
                filePath,
                duration,
                thumbnailPath,
                category
            }
        });
    });
});

// DELETE /api/admin/videos/:id
// Delete video (soft delete - marks as inactive)
router.delete('/videos/:id', (req, res) => {
    const videoId = req.params.id;

    if (!videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid video ID is required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.run(
        'UPDATE videos SET is_active = 0 WHERE id = ?',
        [videoId],
        function(err) {
            if (err) {
                db.close();
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (this.changes === 0) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'Video not found'
                });
            }

            // Also deactivate all user permissions for this video
            db.run(
                'UPDATE user_video_permissions SET is_active = 0 WHERE video_id = ?',
                [videoId],
                function(err) {
                    db.close();

                    if (err) {
                        console.error('Database error updating permissions:', err.message);
                        // Still return success for video deletion even if permission update fails
                    }

                    console.log(`Admin ${req.user.username} deleted video ${videoId}`);

                    res.json({
                        success: true,
                        message: 'Video deleted successfully'
                    });
                }
            );
        }
    );
});

// GET /api/admin/reviews
// Get all reviews (admin view)
router.get('/reviews', (req, res) => {
    const db = new sqlite3.Database(dbPath);

    const query = `
        SELECT
            r.id,
            r.rating,
            r.title,
            r.comment,
            r.is_approved,
            r.is_featured,
            r.approved_at,
            r.approved_by,
            r.created_at,
            r.updated_at,
            u.first_name,
            u.last_name,
            u.username,
            u.email
        FROM reviews r
        INNER JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
    `;

    db.all(query, [], (err, reviews) => {
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
                reviews: reviews.map(review => ({
                    id: review.id,
                    rating: review.rating,
                    title: review.title,
                    comment: review.comment,
                    isApproved: review.is_approved,
                    isFeatured: review.is_featured,
                    approvedAt: review.approved_at,
                    approvedBy: review.approved_by,
                    createdAt: review.created_at,
                    updatedAt: review.updated_at,
                    user: {
                        firstName: review.first_name,
                        lastName: review.last_name,
                        username: review.username,
                        email: review.email
                    }
                })),
                totalCount: reviews.length,
                pendingCount: reviews.filter(r => !r.is_approved).length,
                approvedCount: reviews.filter(r => r.is_approved).length,
                featuredCount: reviews.filter(r => r.is_featured).length
            }
        });
    });
});

// PUT /api/admin/reviews/:id/approve
// Approve or disapprove a review
router.put('/reviews/:id/approve', (req, res) => {
    const reviewId = req.params.id;
    const { approved } = req.body;

    if (!reviewId || isNaN(reviewId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid review ID is required'
        });
    }

    if (typeof approved !== 'boolean') {
        return res.status(400).json({
            success: false,
            error: 'Approved status must be true or false'
        });
    }

    const db = new sqlite3.Database(dbPath);

    const updateQuery = approved
        ? `UPDATE reviews
           SET is_approved = 1,
               approved_at = CURRENT_TIMESTAMP,
               approved_by = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        : `UPDATE reviews
           SET is_approved = 0,
               approved_at = NULL,
               approved_by = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`;

    const params = approved
        ? [req.user.username, reviewId]
        : [reviewId];

    db.run(updateQuery, params, function(err) {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        console.log(`Admin ${req.user.username} ${approved ? 'approved' : 'disapproved'} review ${reviewId}`);

        res.json({
            success: true,
            message: `Review ${approved ? 'approved' : 'disapproved'} successfully`,
            data: {
                reviewId: parseInt(reviewId),
                isApproved: approved,
                approvedBy: approved ? req.user.username : null,
                approvedAt: approved ? new Date().toISOString() : null
            }
        });
    });
});

// PUT /api/admin/reviews/:id/feature
// Feature or unfeature a review
router.put('/reviews/:id/feature', (req, res) => {
    const reviewId = req.params.id;
    const { featured } = req.body;

    if (!reviewId || isNaN(reviewId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid review ID is required'
        });
    }

    if (typeof featured !== 'boolean') {
        return res.status(400).json({
            success: false,
            error: 'Featured status must be true or false'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.run(`
        UPDATE reviews
        SET is_featured = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [featured ? 1 : 0, reviewId], function(err) {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        console.log(`Admin ${req.user.username} ${featured ? 'featured' : 'unfeatured'} review ${reviewId}`);

        res.json({
            success: true,
            message: `Review ${featured ? 'featured' : 'unfeatured'} successfully`,
            data: {
                reviewId: parseInt(reviewId),
                isFeatured: featured
            }
        });
    });
});

// DELETE /api/admin/reviews/:id
// Delete a review (admin only)
router.delete('/reviews/:id', (req, res) => {
    const reviewId = req.params.id;

    if (!reviewId || isNaN(reviewId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid review ID is required'
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.run('DELETE FROM reviews WHERE id = ?', [reviewId], function(err) {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        console.log(`Admin ${req.user.username} deleted review ${reviewId}`);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    });
});

module.exports = router;