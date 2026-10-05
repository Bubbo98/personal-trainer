const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { route, id, badRequest, notFound, conflict, isUniqueViolation } = require('../utils/http');
const { loadDaysWithVideos } = require('../services/trainingDays');
const { grantAccess, revokeUnusedAccess } = require('../services/videoAccess');

// Admin: a user's training days and the videos in them
const router = express.Router();
router.use(authenticateToken, requireAdmin);

const DAYS = '/users/:userId/training-days';
const DAY = `${DAYS}/:dayId`;

/** The day, checked to belong to the user; 404 otherwise. */
async function findDay(userIdParam, dayIdParam, exec = db) {
    const userId = id(userIdParam, 'user ID');
    const dayId = id(dayIdParam, 'day ID');
    const day = await exec.get(
        'SELECT id FROM user_training_days WHERE id = ? AND user_id = ? AND is_active = 1',
        [dayId, userId]
    );
    if (!day) throw notFound('Training day not found');
    return { userId, dayId };
}

// GET /api/training-days/users/:userId/training-days
router.get(DAYS, route(async (req, res) => {
    const trainingDays = await loadDaysWithVideos(id(req.params.userId, 'user ID'));
    res.json({ success: true, data: { trainingDays, totalDays: trainingDays.length } });
}));

// POST /api/training-days/users/:userId/training-days  Body: { dayNumber, dayName? }
router.post(DAYS, route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    const dayNumber = id(req.body.dayNumber, 'day number');
    const { dayName } = req.body;
    try {
        const { lastId } = await db.run(
            'INSERT INTO user_training_days (user_id, day_number, day_name) VALUES (?, ?, ?)',
            [userId, dayNumber, dayName || null]
        );
        res.status(201).json({
            success: true,
            message: 'Training day created successfully',
            data: { id: lastId, userId, dayNumber, dayName },
        });
    } catch (err) {
        if (isUniqueViolation(err)) throw conflict('This day number already exists for this user');
        throw err;
    }
}));

// PUT /api/training-days/users/:userId/training-days/:dayId  Body: { dayName }
router.put(DAY, route(async (req, res) => {
    const { userId, dayId } = await findDay(req.params.userId, req.params.dayId);
    const { dayName } = req.body;
    await db.run(
        'UPDATE user_training_days SET day_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [dayName || null, dayId, userId]
    );
    res.json({ success: true, message: 'Training day updated successfully', data: { id: dayId, dayName } });
}));

// DELETE /api/training-days/users/:userId/training-days/:dayId
// Deletes the day and its videos; access is revoked for videos in no other day.
router.delete(DAY, route(async (req, res) => {
    const revoked = await db.transaction(async (tx) => {
        const { userId, dayId } = await findDay(req.params.userId, req.params.dayId, tx);
        const videos = await tx.query('SELECT video_id FROM training_day_videos WHERE training_day_id = ?', [dayId]);
        // Techniques go with their videos (ON DELETE CASCADE)
        await tx.run('DELETE FROM training_day_videos WHERE training_day_id = ?', [dayId]);
        await tx.run('DELETE FROM user_training_days WHERE id = ?', [dayId]);
        return revokeUnusedAccess(userId, videos.map((v) => v.video_id), tx);
    });
    res.json({ success: true, message: 'Training day deleted successfully', data: { revokedVideos: revoked } });
}));

// PUT /api/training-days/users/:userId/training-days/:dayId/videos/reorder
// Body: { videoOrders: [{ videoId, orderIndex }] }
router.put(`${DAY}/videos/reorder`, route(async (req, res) => {
    const { videoOrders } = req.body;
    if (!Array.isArray(videoOrders)) throw badRequest('videoOrders must be an array');
    const { dayId } = await findDay(req.params.userId, req.params.dayId);
    await db.batch(videoOrders.map(({ videoId, orderIndex }) => ({
        sql: 'UPDATE training_day_videos SET order_index = ? WHERE training_day_id = ? AND video_id = ?',
        params: [orderIndex, dayId, videoId],
    })));
    res.json({ success: true, message: 'Videos reordered successfully' });
}));

// PUT /api/training-days/users/:userId/training-days/:dayId/videos/group
// Body: { assignmentIds: number[] (2+), groupLabel }
router.put(`${DAY}/videos/group`, route(async (req, res) => {
    const { assignmentIds, groupLabel } = req.body;
    if (!Array.isArray(assignmentIds) || assignmentIds.length < 2) {
        throw badRequest('At least 2 assignment IDs are required to group');
    }
    const { dayId } = await findDay(req.params.userId, req.params.dayId);
    const label = groupLabel || 'Superset';
    const groupId = await db.transaction(async (tx) => {
        const { maxGroup } = await tx.get(
            'SELECT COALESCE(MAX(group_id), 0) AS maxGroup FROM training_day_videos WHERE training_day_id = ?',
            [dayId]
        );
        const next = Number(maxGroup) + 1;
        await tx.run(
            `UPDATE training_day_videos SET group_id = ?, group_label = ?
             WHERE training_day_id = ? AND id IN (${assignmentIds.map(() => '?').join(',')})`,
            [next, label, dayId, ...assignmentIds]
        );
        return next;
    });
    res.json({ success: true, message: 'Videos grouped successfully', data: { groupId, groupLabel: label } });
}));

// DELETE /api/training-days/users/:userId/training-days/:dayId/videos/group/:groupId
router.delete(`${DAY}/videos/group/:groupId`, route(async (req, res) => {
    const { dayId } = await findDay(req.params.userId, req.params.dayId);
    await db.run(
        'UPDATE training_day_videos SET group_id = NULL, group_label = NULL WHERE training_day_id = ? AND group_id = ?',
        [dayId, id(req.params.groupId, 'group ID')]
    );
    res.json({ success: true, message: 'Group removed successfully' });
}));

// POST /api/training-days/users/:userId/training-days/:dayId/videos/:videoId
// Appends the video to the day and grants the user access to it.
router.post(`${DAY}/videos/:videoId`, route(async (req, res) => {
    const videoId = id(req.params.videoId, 'video ID');
    const data = await db.transaction(async (tx) => {
        const { userId, dayId } = await findDay(req.params.userId, req.params.dayId, tx);
        const existing = await tx.get(
            'SELECT id FROM training_day_videos WHERE training_day_id = ? AND video_id = ?',
            [dayId, videoId]
        );
        if (existing) throw badRequest('Video already assigned to this training day');

        const { nextOrder } = await tx.get(
            'SELECT COALESCE(MAX(order_index), -1) + 1 AS nextOrder FROM training_day_videos WHERE training_day_id = ?',
            [dayId]
        );
        const { lastId } = await tx.run(
            'INSERT INTO training_day_videos (training_day_id, video_id, order_index, added_by) VALUES (?, ?, ?, ?)',
            [dayId, videoId, nextOrder, req.user.username]
        );
        await grantAccess(userId, videoId, req.user.username, tx);
        return { assignmentId: lastId, dayId, videoId, orderIndex: Number(nextOrder) };
    });
    res.json({ success: true, message: 'Video assigned to training day successfully', data });
}));

// DELETE /api/training-days/users/:userId/training-days/:dayId/videos/:videoId
// Access is revoked when the video is in no other day of the user.
router.delete(`${DAY}/videos/:videoId`, route(async (req, res) => {
    const videoId = id(req.params.videoId, 'video ID');
    await db.transaction(async (tx) => {
        const { userId, dayId } = await findDay(req.params.userId, req.params.dayId, tx);
        const { changes } = await tx.run(
            'DELETE FROM training_day_videos WHERE training_day_id = ? AND video_id = ?',
            [dayId, videoId]
        );
        if (changes === 0) throw notFound('Video assignment not found');
        await revokeUnusedAccess(userId, [videoId], tx);
    });
    res.json({ success: true, message: 'Video removed from training day successfully' });
}));

/** The day's assignment of a video, for technique changes; 404 otherwise. */
async function findAssignment(params) {
    const { dayId } = await findDay(params.userId, params.dayId);
    const assignment = await db.get(
        'SELECT id FROM training_day_videos WHERE training_day_id = ? AND video_id = ? AND is_active = 1',
        [dayId, id(params.videoId, 'video ID')]
    );
    if (!assignment) throw notFound('Video assignment not found');
    return { assignmentId: assignment.id, techniqueId: id(params.techniqueId, 'technique ID') };
}

// POST /api/training-days/users/:userId/training-days/:dayId/videos/:videoId/techniques/:techniqueId
router.post(`${DAY}/videos/:videoId/techniques/:techniqueId`, route(async (req, res) => {
    const { assignmentId, techniqueId } = await findAssignment(req.params);
    await db.run(
        `INSERT OR IGNORE INTO training_day_video_techniques (training_day_video_id, technique_id, order_index)
         SELECT ?, ?, COALESCE(MAX(order_index), -1) + 1 FROM training_day_video_techniques WHERE training_day_video_id = ?`,
        [assignmentId, techniqueId, assignmentId]
    );
    res.json({ success: true, message: 'Technique added successfully' });
}));

// DELETE /api/training-days/users/:userId/training-days/:dayId/videos/:videoId/techniques/:techniqueId
router.delete(`${DAY}/videos/:videoId/techniques/:techniqueId`, route(async (req, res) => {
    const { assignmentId, techniqueId } = await findAssignment(req.params);
    await db.run(
        'DELETE FROM training_day_video_techniques WHERE training_day_video_id = ? AND technique_id = ?',
        [assignmentId, techniqueId]
    );
    res.json({ success: true, message: 'Technique removed successfully' });
}));

module.exports = router;
