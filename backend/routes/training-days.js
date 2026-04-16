const express = require('express');
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/users/:userId/training-days
 * Get all training days for a specific user with their videos
 */
router.get('/users/:userId/training-days', async (req, res) => {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID is required'
        });
    }

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

        // For each day, get its videos
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
                        WHERE tdv.training_day_id = ? AND tdv.is_active = 1 AND v.is_active = 1
                        ORDER BY tdv.order_index ASC
                    `, [day.id], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                return {
                    id: day.id,
                    userId: day.user_id,
                    dayNumber: day.day_number,
                    dayName: day.day_name,
                    createdAt: day.created_at,
                    updatedAt: day.updated_at,
                    videos: videos.map(v => ({
                        assignmentId: v.assignment_id,
                        orderIndex: v.order_index,
                        addedAt: v.added_at,
                        id: v.id,
                        title: v.title,
                        description: v.description,
                        filePath: v.file_path,
                        duration: v.duration,
                        thumbnailPath: v.thumbnail_path,
                        category: v.category
                    }))
                };
            })
        );

        db.close();

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

/**
 * POST /api/admin/users/:userId/training-days
 * Create a new training day for a user
 */
router.post('/users/:userId/training-days', (req, res) => {
    const { userId } = req.params;
    const { dayNumber, dayName } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID is required'
        });
    }

    if (!dayNumber || isNaN(dayNumber)) {
        return res.status(400).json({
            success: false,
            error: 'Valid day number is required'
        });
    }

    const db = createDatabase();

    db.runCallback(`
        INSERT INTO user_training_days (user_id, day_number, day_name)
        VALUES (?, ?, ?)
    `, [userId, dayNumber, dayName || null], function(err) {
        if (err) {
            db.close();
            if (err.message && err.message.includes('UNIQUE')) {
                return res.status(409).json({
                    success: false,
                    error: 'This day number already exists for this user'
                });
            }
            console.error('Create training day error:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        const dayId = this.lastID;
        db.close();

        console.log(`Admin ${req.user?.username || 'unknown'} created training day ${dayNumber} for user ${userId}`);

        res.status(201).json({
            success: true,
            message: 'Training day created successfully',
            data: {
                id: dayId,
                userId: parseInt(userId),
                dayNumber: parseInt(dayNumber),
                dayName
            }
        });
    });
});

/**
 * PUT /api/admin/users/:userId/training-days/:dayId
 * Update a training day (name only)
 */
router.put('/users/:userId/training-days/:dayId', (req, res) => {
    const { userId, dayId } = req.params;
    const { dayName } = req.body;

    if (!userId || isNaN(userId) || !dayId || isNaN(dayId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID and day ID are required'
        });
    }

    const db = createDatabase();

    db.runCallback(`
        UPDATE user_training_days
        SET day_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND is_active = 1
    `, [dayName || null, dayId, userId], function(err) {
        db.close();

        if (err) {
            console.error('Update training day error:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Training day not found'
            });
        }

        console.log(`Admin ${req.user.username} updated training day ${dayId}`);

        res.json({
            success: true,
            message: 'Training day updated successfully',
            data: {
                id: parseInt(dayId),
                dayName
            }
        });
    });
});

/**
 * DELETE /api/admin/users/:userId/training-days/:dayId
 * Delete a training day (hard delete)
 */
router.delete('/users/:userId/training-days/:dayId', (req, res) => {
    const { userId, dayId } = req.params;

    if (!userId || isNaN(userId) || !dayId || isNaN(dayId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID and day ID are required'
        });
    }

    const db = createDatabase();

    // First verify the training day belongs to the user
    db.getCallback(
        'SELECT id FROM user_training_days WHERE id = ? AND user_id = ? AND is_active = 1',
        [dayId, userId],
        (err, day) => {
            if (err || !day) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'Training day not found'
                });
            }

            // Get all videos in this day before deleting
            db.allCallback(
                'SELECT video_id FROM training_day_videos WHERE training_day_id = ?',
                [dayId],
                (err, videosInDay) => {
                    if (err) {
                        db.close();
                        console.error('Get training day videos error:', err);
                        return res.status(500).json({
                            success: false,
                            error: 'Database error'
                        });
                    }

                    const videoIds = videosInDay.map(v => v.video_id);

                    // Hard delete all videos in this day
                    db.runCallback(`
                        DELETE FROM training_day_videos
                        WHERE training_day_id = ?
                    `, [dayId], function(err) {
                        if (err) {
                            db.close();
                            console.error('Delete training day videos error:', err);
                            return res.status(500).json({
                                success: false,
                                error: 'Database error'
                            });
                        }

                        // Hard delete the day itself
                        db.runCallback(`
                            DELETE FROM user_training_days
                            WHERE id = ? AND user_id = ?
                        `, [dayId, userId], function(err) {
                            if (err) {
                                db.close();
                                console.error('Delete training day error:', err);
                                return res.status(500).json({
                                    success: false,
                                    error: 'Database error'
                                });
                            }

                            // Check each video to see if it should be removed from user_video_permissions
                            if (videoIds.length === 0) {
                                db.close();
                                console.log(`Admin ${req.user?.username || 'unknown'} deleted training day ${dayId}`);
                                return res.json({
                                    success: true,
                                    message: 'Training day deleted successfully'
                                });
                            }

                            // For each video, check if it's still in other training days
                            let processed = 0;
                            const videosToRevoke = [];

                            videoIds.forEach(videoId => {
                                db.getCallback(`
                                    SELECT COUNT(*) as count
                                    FROM training_day_videos tdv
                                    INNER JOIN user_training_days utd ON tdv.training_day_id = utd.id
                                    WHERE utd.user_id = ? AND tdv.video_id = ? AND tdv.is_active = 1
                                `, [userId, videoId], (err, result) => {
                                    processed++;

                                    if (!err && result.count === 0) {
                                        videosToRevoke.push(videoId);
                                    }

                                    // When all videos are processed
                                    if (processed === videoIds.length) {
                                        // Revoke permissions for videos not in other days
                                        if (videosToRevoke.length > 0) {
                                            const placeholders = videosToRevoke.map(() => '?').join(',');
                                            db.runCallback(
                                                `UPDATE user_video_permissions SET is_active = 0 WHERE user_id = ? AND video_id IN (${placeholders})`,
                                                [userId, ...videosToRevoke],
                                                function(err) {
                                                    db.close();
                                                    if (err) {
                                                        console.error('Revoke video permissions error:', err);
                                                    }
                                                    console.log(`Admin ${req.user?.username || 'unknown'} deleted training day ${dayId} and revoked ${videosToRevoke.length} video(s)`);
                                                    res.json({
                                                        success: true,
                                                        message: 'Training day deleted successfully'
                                                    });
                                                }
                                            );
                                        } else {
                                            db.close();
                                            console.log(`Admin ${req.user?.username || 'unknown'} deleted training day ${dayId}`);
                                            res.json({
                                                success: true,
                                                message: 'Training day deleted successfully'
                                            });
                                        }
                                    }
                                });
                            });
                        });
                    });
                }
            );
        }
    );
});

/**
 * POST /api/admin/users/:userId/training-days/:dayId/videos/:videoId
 * Assign a video to a training day
 */
router.post('/users/:userId/training-days/:dayId/videos/:videoId', (req, res) => {
    const { userId, dayId, videoId } = req.params;

    if (!userId || isNaN(userId) || !dayId || isNaN(dayId) || !videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID, day ID, and video ID are required'
        });
    }

    const db = createDatabase();

    // First verify the training day belongs to the user
    db.getCallback(
        'SELECT id FROM user_training_days WHERE id = ? AND user_id = ? AND is_active = 1',
        [dayId, userId],
        (err, day) => {
            if (err || !day) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'Training day not found'
                });
            }

            // Get the next order index
            db.getCallback(
                'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM training_day_videos WHERE training_day_id = ? AND is_active = 1',
                [dayId],
                (err, result) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({
                            success: false,
                            error: 'Database error'
                        });
                    }

                    const nextOrder = result.next_order;

                    // Check if video already exists in this training day
                    db.getCallback(
                        'SELECT id FROM training_day_videos WHERE training_day_id = ? AND video_id = ? AND is_active = 1',
                        [dayId, videoId],
                        (err, existingAssignment) => {
                            if (err) {
                                db.close();
                                return res.status(500).json({
                                    success: false,
                                    error: 'Database error'
                                });
                            }

                            // If video already exists in this day, don't add it again
                            if (existingAssignment) {
                                db.close();
                                return res.status(400).json({
                                    success: false,
                                    error: 'Video already assigned to this training day'
                                });
                            }

                            // Insert the video assignment
                            db.runCallback(`
                                INSERT INTO training_day_videos
                                (training_day_id, video_id, order_index, added_by)
                                VALUES (?, ?, ?, ?)
                            `, [dayId, videoId, nextOrder, req.user.username], function(err) {
                                if (err) {
                                    db.close();
                                    console.error('Assign video to day error:', err);
                                    return res.status(500).json({
                                        success: false,
                                        error: 'Database error'
                                    });
                                }

                                const assignmentId = this.lastID;

                                // Check if user already has access to this video
                                db.getCallback(
                                    'SELECT id, is_active FROM user_video_permissions WHERE user_id = ? AND video_id = ?',
                                    [userId, videoId],
                                    (err, permission) => {
                                        if (err) {
                                            db.close();
                                            console.error('Check permission error:', err);
                                            return res.json({
                                                success: true,
                                                message: 'Video assigned to training day successfully',
                                                data: {
                                                    assignmentId,
                                                    dayId: parseInt(dayId),
                                                    videoId: parseInt(videoId),
                                                    orderIndex: nextOrder
                                                }
                                            });
                                        }

                                        if (permission) {
                                            // Permission exists, activate it if needed
                                            if (Number(permission.is_active) === 0) {
                                                db.runCallback(
                                                    'UPDATE user_video_permissions SET is_active = 1 WHERE user_id = ? AND video_id = ?',
                                                    [userId, videoId],
                                                    function(err) {
                                                        db.close();
                                                        console.log(`Admin ${req.user.username} assigned video ${videoId} to training day ${dayId} and reactivated permission`);
                                                        res.json({
                                                            success: true,
                                                            message: 'Video assigned to training day successfully',
                                                            data: {
                                                                assignmentId,
                                                                dayId: parseInt(dayId),
                                                                videoId: parseInt(videoId),
                                                                orderIndex: nextOrder
                                                            }
                                                        });
                                                    }
                                                );
                                            } else {
                                                // Already has access
                                                db.close();
                                                console.log(`Admin ${req.user.username} assigned video ${videoId} to training day ${dayId}`);
                                                res.json({
                                                    success: true,
                                                    message: 'Video assigned to training day successfully',
                                                    data: {
                                                        assignmentId,
                                                        dayId: parseInt(dayId),
                                                        videoId: parseInt(videoId),
                                                        orderIndex: nextOrder
                                                    }
                                                });
                                            }
                                        } else {
                                            // Create new permission
                                            db.runCallback(
                                                'INSERT INTO user_video_permissions (user_id, video_id, granted_by, is_active) VALUES (?, ?, ?, 1)',
                                                [userId, videoId, req.user.username],
                                                function(err) {
                                                    db.close();
                                                    console.log(`Admin ${req.user.username} assigned video ${videoId} to training day ${dayId} and granted access`);
                                                    res.json({
                                                        success: true,
                                                        message: 'Video assigned to training day successfully',
                                                        data: {
                                                            assignmentId,
                                                            dayId: parseInt(dayId),
                                                            videoId: parseInt(videoId),
                                                            orderIndex: nextOrder
                                                        }
                                                    });
                                                }
                                            );
                                        }
                                    }
                                );
                            });
                        }
                    );
                }
            );
        }
    );
});

/**
 * PUT /api/admin/users/:userId/training-days/:dayId/videos/reorder
 * Reorder videos in a training day
 * Body: { videoOrders: [{ videoId: number, orderIndex: number }] }
 */
router.put('/users/:userId/training-days/:dayId/videos/reorder', async (req, res) => {
    const { userId, dayId } = req.params;
    const { videoOrders } = req.body;

    if (!userId || isNaN(userId) || !dayId || isNaN(dayId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID and day ID are required'
        });
    }

    if (!Array.isArray(videoOrders)) {
        return res.status(400).json({
            success: false,
            error: 'videoOrders must be an array'
        });
    }

    const db = createDatabase();

    try {
        // Verify the training day belongs to the user
        const day = await new Promise((resolve, reject) => {
            db.getCallback(
                'SELECT id FROM user_training_days WHERE id = ? AND user_id = ? AND is_active = 1',
                [dayId, userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!day) {
            db.close();
            return res.status(404).json({
                success: false,
                error: 'Training day not found'
            });
        }

        // Update each video's order
        for (const { videoId, orderIndex } of videoOrders) {
            await new Promise((resolve, reject) => {
                db.runCallback(`
                    UPDATE training_day_videos
                    SET order_index = ?
                    WHERE training_day_id = ? AND video_id = ? AND is_active = 1
                `, [orderIndex, dayId, videoId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        db.close();

        console.log(`Admin ${req.user.username} reordered videos in training day ${dayId}`);

        res.json({
            success: true,
            message: 'Videos reordered successfully'
        });
    } catch (error) {
        db.close();
        console.error('Reorder videos error:', error);
        res.status(500).json({
            success: false,
            error: 'Database error'
        });
    }
});

/**
 * DELETE /api/admin/users/:userId/training-days/:dayId/videos/:videoId
 * Remove a video from a training day
 */
router.delete('/users/:userId/training-days/:dayId/videos/:videoId', (req, res) => {
    const { userId, dayId, videoId } = req.params;

    if (!userId || isNaN(userId) || !dayId || isNaN(dayId) || !videoId || isNaN(videoId)) {
        return res.status(400).json({
            success: false,
            error: 'Valid user ID, day ID, and video ID are required'
        });
    }

    const db = createDatabase();

    // Verify the training day belongs to the user
    db.getCallback(
        'SELECT id FROM user_training_days WHERE id = ? AND user_id = ? AND is_active = 1',
        [dayId, userId],
        (err, day) => {
            if (err || !day) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'Training day not found'
                });
            }

            // Remove the video (hard delete)
            db.runCallback(`
                DELETE FROM training_day_videos
                WHERE training_day_id = ? AND video_id = ?
            `, [dayId, videoId], function(err) {
                if (err) {
                    db.close();
                    console.error('Remove video from day error:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }

                if (this.changes === 0) {
                    db.close();
                    return res.status(404).json({
                        success: false,
                        error: 'Video assignment not found'
                    });
                }

                // Check if video still exists in other training days for this user
                db.getCallback(`
                    SELECT COUNT(*) as count
                    FROM training_day_videos tdv
                    INNER JOIN user_training_days utd ON tdv.training_day_id = utd.id
                    WHERE utd.user_id = ? AND tdv.video_id = ? AND tdv.is_active = 1
                `, [userId, videoId], (err, result) => {
                    if (err) {
                        db.close();
                        console.error('Check video in other days error:', err);
                        return res.json({
                            success: true,
                            message: 'Video removed from training day successfully'
                        });
                    }

                    // If video is not in any other training day, remove from user_video_permissions
                    if (result.count === 0) {
                        db.runCallback(
                            'UPDATE user_video_permissions SET is_active = 0 WHERE user_id = ? AND video_id = ?',
                            [userId, videoId],
                            function(err) {
                                db.close();
                                if (err) {
                                    console.error('Revoke video permission error:', err);
                                }
                                console.log(`Admin ${req.user?.username || 'unknown'} removed video ${videoId} from training day ${dayId} and revoked access (not in other days)`);
                                res.json({
                                    success: true,
                                    message: 'Video removed from training day successfully'
                                });
                            }
                        );
                    } else {
                        db.close();
                        console.log(`Admin ${req.user?.username || 'unknown'} removed video ${videoId} from training day ${dayId} (still in ${result.count} other day(s))`);
                        res.json({
                            success: true,
                            message: 'Video removed from training day successfully'
                        });
                    }
                });
            });
        }
    );
});

module.exports = router;
