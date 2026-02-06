const express = require('express');
const bcrypt = require('bcryptjs');
const { createDatabase } = require('../utils/database');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const router = express.Router();

// R2 client configuration
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/trainers
// Get all active trainers
router.get('/trainers', (req, res) => {
    const db = createDatabase();

    db.allCallback(
        'SELECT id, name, email, created_at FROM trainers WHERE is_active = 1 ORDER BY id ASC',
        [],
        (err, trainers) => {
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
                    trainers: trainers.map(t => ({
                        id: t.id,
                        name: t.name,
                        email: t.email,
                        createdAt: t.created_at
                    }))
                }
            });
        }
    );
});

// Generate login link token for users (no expiration)
const generateLoginLinkToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            email: user.email,
            type: 'login_link'
        },
        process.env.JWT_SECRET
    );
};

// POST /api/admin/users
// Create a new user (or reactivate if previously deleted)
router.post('/users', async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            firstName,
            lastName,
            isPaying,
            trainerId
        } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }

        // Hash password only if provided
        const passwordHash = password ? await bcrypt.hash(password, 10) : null;

        // Default to paying user if not specified
        const isPayingValue = isPaying !== undefined ? (isPaying ? 1 : 0) : 1;

        // Default to trainer 1 (Joshua) if not specified
        const trainerIdValue = trainerId || 1;

        const db = createDatabase();

        // First check if user exists but is inactive (soft deleted)
        db.getCallback(
            'SELECT id, username FROM users WHERE username = ? AND is_active = 0',
            [username],
            (err, existingUser) => {
                if (err) {
                    db.close();
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }

                if (existingUser) {
                    // Reactivate the existing user with new data
                    db.runCallback(`
                        UPDATE users
                        SET email = ?, password_hash = COALESCE(?, password_hash), first_name = ?, last_name = ?,
                            is_paying = ?, trainer_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [email || null, passwordHash, firstName, lastName, isPayingValue, trainerIdValue, existingUser.id], function(err) {
                        if (err) {
                            db.close();
                            // Handle UNIQUE constraint on email
                            const isUniqueConstraint =
                                err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                                err.code === 'SQLITE_CONSTRAINT' ||
                                (err.message && err.message.toLowerCase().includes('unique')) ||
                                (err.message && err.message.toLowerCase().includes('constraint'));

                            if (isUniqueConstraint) {
                                return res.status(409).json({
                                    success: false,
                                    error: 'Email already exists'
                                });
                            }
                            console.error('Database error:', err.message);
                            return res.status(500).json({
                                success: false,
                                error: 'Database error: ' + (err.message || 'Unknown error')
                            });
                        }

                        // Also reactivate user's video permissions
                        db.runCallback(
                            'UPDATE user_video_permissions SET is_active = 1 WHERE user_id = ?',
                            [existingUser.id],
                            (err) => {
                                if (err) {
                                    console.error('Error reactivating video permissions:', err.message);
                                }

                                // Get the reactivated user with trainer info
                                db.getCallback(
                                    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.is_paying, u.trainer_id, u.created_at, t.name as trainer_name
                                     FROM users u
                                     LEFT JOIN trainers t ON u.trainer_id = t.id
                                     WHERE u.id = ?`,
                                    [existingUser.id],
                                    (err, user) => {
                                        db.close();

                                        if (err) {
                                            console.error('Database error:', err.message);
                                            return res.status(500).json({
                                                success: false,
                                                error: 'User reactivated but failed to retrieve details'
                                            });
                                        }

                                        // Generate login link token
                                        const loginToken = generateLoginLinkToken(user);
                                        const loginUrl = `https://www.esercizifacili.com/dashboard/${loginToken}`;

                                        console.log(`Admin ${req.user.username} reactivated user: ${user.username}`);

                                        res.status(201).json({
                                            success: true,
                                            message: 'User reactivated successfully',
                                            data: {
                                                user: {
                                                    id: user.id,
                                                    username: user.username,
                                                    email: user.email,
                                                    firstName: user.first_name,
                                                    lastName: user.last_name,
                                                    isPaying: Number(user.is_paying) === 1,
                                                    trainerId: user.trainer_id,
                                                    trainerName: user.trainer_name,
                                                    createdAt: user.created_at
                                                },
                                                loginToken,
                                                loginUrl,
                                                reactivated: true
                                            }
                                        });
                                    }
                                );
                            }
                        );
                    });
                } else {
                    // Create new user
                    db.runCallback(`
                        INSERT INTO users (username, email, password_hash, first_name, last_name, is_paying, trainer_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [username, email || null, passwordHash, firstName, lastName, isPayingValue, trainerIdValue], function(err) {
                        if (err) {
                            db.close();
                            // Handle UNIQUE constraint errors for both SQLite and Turso
                            const isUniqueConstraint =
                                err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                                err.code === 'SQLITE_CONSTRAINT' ||
                                (err.message && err.message.toLowerCase().includes('unique')) ||
                                (err.message && err.message.toLowerCase().includes('constraint'));

                            if (isUniqueConstraint) {
                                const isEmailError = err.message && err.message.toLowerCase().includes('email');
                                return res.status(409).json({
                                    success: false,
                                    error: isEmailError ? 'Email already exists' : 'Username already exists'
                                });
                            }
                            console.error('Database error:', err.message);
                            return res.status(500).json({
                                success: false,
                                error: 'Database error: ' + (err.message || 'Unknown error')
                            });
                        }

                        const userId = this.lastID;

                        // Get the created user with trainer info
                        db.getCallback(
                            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.is_paying, u.trainer_id, u.created_at, t.name as trainer_name
                             FROM users u
                             LEFT JOIN trainers t ON u.trainer_id = t.id
                             WHERE u.id = ?`,
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
                                const loginUrl = `https://www.esercizifacili.com/dashboard/${loginToken}`;

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
                                            isPaying: Number(user.is_paying) === 1,
                                            trainerId: user.trainer_id,
                                            trainerName: user.trainer_name,
                                            createdAt: user.created_at
                                        },
                                        loginToken,
                                        loginUrl
                                    }
                                });
                            }
                        );
                    });
                }
            }
        );
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
    const db = createDatabase();

    db.allCallback(`
        SELECT
            u.id,
            u.username,
            u.email,
            u.first_name,
            u.last_name,
            u.is_active,
            u.is_paying,
            u.trainer_id,
            t.name as trainer_name,
            u.created_at,
            u.last_login,
            COUNT(uvp.video_id) as video_count,
            upf.id as pdf_id,
            upf.original_name as pdf_original_name,
            upf.file_size as pdf_file_size,
            upf.mime_type as pdf_mime_type,
            upf.uploaded_at as pdf_uploaded_at,
            upf.uploaded_by as pdf_uploaded_by,
            upf.updated_at as pdf_updated_at,
            upf.duration_months as pdf_duration_months,
            upf.duration_days as pdf_duration_days,
            upf.expiration_date as pdf_expiration_date
        FROM users u
        LEFT JOIN trainers t ON u.trainer_id = t.id
        LEFT JOIN user_video_permissions uvp ON u.id = uvp.user_id AND uvp.is_active = 1
        LEFT JOIN user_pdf_files upf ON u.id = upf.user_id
        WHERE u.is_active = 1
        GROUP BY u.id
        ORDER BY
            CASE
                WHEN upf.expiration_date IS NULL THEN 1
                ELSE 0
            END,
            upf.expiration_date ASC,
            u.created_at DESC
    `, [], (err, users) => {
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
                    isActive: Number(user.is_active) === 1,
                    isPaying: Number(user.is_paying) === 1,
                    trainerId: user.trainer_id,
                    trainerName: user.trainer_name,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    videoCount: user.video_count,
                    pdf: user.pdf_id ? {
                        id: user.pdf_id,
                        userId: user.id,
                        originalName: user.pdf_original_name,
                        fileSize: user.pdf_file_size,
                        mimeType: user.pdf_mime_type,
                        uploadedAt: user.pdf_uploaded_at,
                        uploadedBy: user.pdf_uploaded_by,
                        updatedAt: user.pdf_updated_at,
                        durationMonths: user.pdf_duration_months,
                        durationDays: user.pdf_duration_days,
                        expirationDate: user.pdf_expiration_date
                    } : null
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

    const db = createDatabase();

    db.allCallback(`
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

    const db = createDatabase();

    db.getCallback(
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
            const loginUrl = `https://www.esercizifacili.com/dashboard/${loginToken}`;

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

    const db = createDatabase();

    // First verify user and video exist
    db.getCallback(
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

            db.getCallback(
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

                    // Check if permission already exists
                    db.getCallback(
                        'SELECT id, is_active FROM user_video_permissions WHERE user_id = ? AND video_id = ?',
                        [userId, videoId],
                        (err, existingPermission) => {
                            if (err) {
                                db.close();
                                return res.status(500).json({
                                    success: false,
                                    error: 'Database error'
                                });
                            }

                            if (existingPermission) {
                                // Permission exists, update it if needed
                                if (Number(existingPermission.is_active) === 0) {
                                    db.runCallback(
                                        'UPDATE user_video_permissions SET is_active = 1, granted_by = ?, expires_at = ? WHERE user_id = ? AND video_id = ?',
                                        [req.user.username, expiresAt || null, userId, videoId],
                                        function(err) {
                                            db.close();

                                            if (err) {
                                                console.error('Database error:', err.message);
                                                return res.status(500).json({
                                                    success: false,
                                                    error: 'Database error'
                                                });
                                            }

                                            console.log(`Admin ${req.user.username} reactivated video ${videoId} access for user ${userId}`);

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
                                        }
                                    );
                                } else {
                                    // Already has active access
                                    db.close();
                                    return res.status(400).json({
                                        success: false,
                                        error: 'User already has access to this video'
                                    });
                                }
                            } else {
                                // Create new permission
                                db.runCallback(`
                                    INSERT INTO user_video_permissions
                                    (user_id, video_id, granted_by, expires_at, is_active)
                                    VALUES (?, ?, ?, ?, 1)
                                `, [userId, videoId, req.user.username, expiresAt || null], function(err) {
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
                        }
                    );
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

    const db = createDatabase();

    // First, remove video from all training days for this user
    db.runCallback(`
        DELETE FROM training_day_videos
        WHERE video_id = ? AND training_day_id IN (
            SELECT id FROM user_training_days WHERE user_id = ?
        )
    `, [videoId, userId], function(err) {
        if (err) {
            db.close();
            console.error('Remove from training days error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        // Then revoke general video permission
        db.runCallback(
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

                console.log(`Admin ${req.user.username} revoked video ${videoId} access from user ${userId} and removed from all training days`);

                res.json({
                    success: true,
                    message: 'Video access revoked successfully'
                });
            }
        );
    });
});

// GET /api/admin/videos/:id/preview
// Get video with signed URL for admin preview (no permission check)
router.get('/videos/:id/preview', async (req, res) => {
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
            v.created_at
        FROM videos v
        WHERE v.id = ?
        AND v.is_active = 1
    `;

    db.getCallback(query, [videoId], async (err, video) => {
        db.close();

        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }

        console.log(`Admin ${req.user.username} previewing video: ${video.title}`);

        // Generate signed URL
        let signedUrl = null;
        try {
            const { getSignedVideoUrl } = require('../utils/r2');
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
                    createdAt: video.created_at
                }
            }
        });
    });
});

// GET /api/admin/videos
// Get all videos (admin view)
router.get('/videos', (req, res) => {
    const db = createDatabase();

    db.allCallback(`
        SELECT
            v.*,
            COUNT(uvp.user_id) as user_count
        FROM videos v
        LEFT JOIN user_video_permissions uvp ON v.id = uvp.video_id AND uvp.is_active = 1
        WHERE v.is_active = 1
        GROUP BY v.id
        ORDER BY v.created_at DESC
    `, [], (err, videos) => {
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

// POST /api/admin/videos/upload-url
// Generate presigned URL for direct upload to R2 from frontend
router.post('/videos/upload-url', async (req, res) => {
    try {
        const { fileName, fileType, category } = req.body;

        if (!fileName || !category) {
            return res.status(400).json({
                success: false,
                error: 'fileName and category are required'
            });
        }

        // Sanitize filename and create R2 key
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        const timestamp = Date.now();
        const r2Key = `${category}/${baseName}${fileExtension}`;

        // Determine content type
        const contentType = fileType || 'video/mp4';

        console.log(`Generating presigned URL for: ${r2Key}`);

        // Create presigned URL for PUT operation (30 minutes expiry)
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key,
            ContentType: contentType,
        });

        const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 1800 }); // 30 min

        console.log(`Admin ${req.user.username} generated upload URL for: ${r2Key}`);

        res.json({
            success: true,
            data: {
                uploadUrl: presignedUrl,
                filePath: r2Key,
                expiresIn: 1800
            }
        });

    } catch (error) {
        console.error('Presigned URL generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate upload URL: ' + error.message
        });
    }
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

    const db = createDatabase();

    db.runCallback(`
        INSERT INTO videos (title, description, file_path, duration, thumbnail_path, category)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description || null, filePath, duration || null, thumbnailPath || null, category || null], function(err) {
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
                id: Number(this.lastID),
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

// PUT /api/admin/videos/:id
// Update video metadata (title, description, thumbnail)
router.put('/videos/:id', (req, res) => {
    const videoId = req.params.id;
    const { title, description, thumbnailPath } = req.body;

    if (!videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid video ID is required'
        });
    }

    if (!title) {
        return res.status(400).json({
            success: false,
            error: 'Title is required'
        });
    }

    const db = createDatabase();

    db.runCallback(`
        UPDATE videos
        SET title = ?,
            description = ?,
            thumbnail_path = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_active = 1
    `, [title, description || null, thumbnailPath || null, videoId], function(err) {
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
                error: 'Video not found'
            });
        }

        console.log(`Admin ${req.user.username} updated video ${videoId}: ${title}`);

        res.json({
            success: true,
            message: 'Video updated successfully',
            data: {
                id: parseInt(videoId),
                title,
                description,
                thumbnailPath
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

    const db = createDatabase();

    db.runCallback(
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
            db.runCallback(
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
    const db = createDatabase();

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

    db.allCallback(query, [], (err, reviews) => {
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

    const db = createDatabase();

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

    db.runCallback(updateQuery, params, function(err) {
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

    const db = createDatabase();

    db.runCallback(`
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

    const db = createDatabase();

    db.runCallback('DELETE FROM reviews WHERE id = ?', [reviewId], function(err) {
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

// PUT /api/admin/users/:id
// Update user details
router.put('/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { firstName, lastName, email, isPaying, trainerId } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID is required'
        });
    }

    const db = createDatabase();

    // Build dynamic update query based on provided fields
    const updates = [];
    const params = [];

    if (firstName !== undefined) {
        updates.push('first_name = ?');
        params.push(firstName);
    }
    if (lastName !== undefined) {
        updates.push('last_name = ?');
        params.push(lastName);
    }
    if (email !== undefined) {
        updates.push('email = ?');
        // Convert empty string to null to avoid UNIQUE constraint issues
        params.push(email === '' ? null : email);
    }
    if (isPaying !== undefined) {
        updates.push('is_paying = ?');
        params.push(isPaying ? 1 : 0);
    }
    if (trainerId !== undefined) {
        updates.push('trainer_id = ?');
        params.push(trainerId);
    }

    if (updates.length === 0) {
        db.close();
        return res.status(400).json({
            success: false,
            error: 'No fields to update'
        });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND is_active = 1`;

    db.runCallback(query, params, function(err) {
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
                error: 'User not found or inactive'
            });
        }

        // Return updated user with trainer info
        db.getCallback(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.is_paying, u.is_active, u.trainer_id, u.created_at, u.updated_at, t.name as trainer_name
             FROM users u
             LEFT JOIN trainers t ON u.trainer_id = t.id
             WHERE u.id = ?`,
            [userId],
            (err, user) => {
                db.close();

                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'User updated but failed to retrieve details'
                    });
                }

                console.log(`Admin ${req.user.username} updated user: ${user.username}`);

                res.json({
                    success: true,
                    message: 'User updated successfully',
                    data: {
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            isPaying: Number(user.is_paying) === 1,
                            isActive: Number(user.is_active) === 1,
                            trainerId: user.trainer_id,
                            trainerName: user.trainer_name,
                            createdAt: user.created_at,
                            updatedAt: user.updated_at
                        }
                    }
                });
            }
        );
    });
});

// DELETE /api/admin/users/:id
// Delete user (soft delete - marks as inactive)
router.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID is required'
        });
    }

    const db = createDatabase();

    db.runCallback(
        'UPDATE users SET is_active = 0 WHERE id = ?',
        [userId],
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
                    error: 'User not found'
                });
            }

            // Also deactivate all user permissions for this user
            db.runCallback(
                'UPDATE user_video_permissions SET is_active = 0 WHERE user_id = ?',
                [userId],
                function(err) {
                    db.close();

                    if (err) {
                        console.error('Database error:', err.message);
                        return res.status(500).json({
                            success: false,
                            error: 'Database error'
                        });
                    }

                    console.log(`Admin ${req.user.username} deleted user ID: ${userId}`);

                    res.json({
                        success: true,
                        message: 'User deleted successfully'
                    });
                }
            );
        }
    );
});

module.exports = router;