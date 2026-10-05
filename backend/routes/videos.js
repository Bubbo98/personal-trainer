const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, verifyActiveUser } = require('../middleware/auth');
const { signedUrlOrNull } = require('../utils/r2');
const { route, id, notFound } = require('../utils/http');
const { loadDaysWithVideos } = require('../services/trainingDays');

// Client video library
const router = express.Router();
router.use(authenticateToken, verifyActiveUser);

/** Videos the user may watch (active permission, not expired), newest first. */
async function permittedVideos(userId, { videoId, category } = {}) {
    const rows = await db.query(
        `SELECT v.id, v.title, v.description, v.file_path, v.duration, v.thumbnail_path, v.thumbnail_key,
                v.category, v.created_at, uvp.granted_at, uvp.expires_at
         FROM videos v
         JOIN user_video_permissions uvp ON uvp.video_id = v.id
         WHERE uvp.user_id = ? AND v.is_active = 1 AND uvp.is_active = 1
           AND (uvp.expires_at IS NULL OR uvp.expires_at > CURRENT_TIMESTAMP)
           ${videoId ? 'AND v.id = ?' : ''}
           ${category ? 'AND v.category = ?' : ''}
         ORDER BY v.created_at DESC`,
        [userId, ...(videoId ? [videoId] : []), ...(category ? [category] : [])]
    );
    return Promise.all(rows.map(async (v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        filePath: v.file_path,
        signedUrl: await signedUrlOrNull(v.file_path),
        duration: v.duration,
        thumbnailPath: v.thumbnail_path,
        thumbnailKey: v.thumbnail_key || null,
        category: v.category,
        createdAt: v.created_at,
        grantedAt: v.granted_at,
        expiresAt: v.expires_at,
    })));
}

// GET /api/videos
router.get('/', route(async (req, res) => {
    const videos = await permittedVideos(req.user.userId);
    res.json({ success: true, data: { videos, totalCount: videos.length } });
}));

// GET /api/videos/categories
router.get('/categories', route(async (req, res) => {
    const rows = await db.query(
        `SELECT v.category, COUNT(*) AS video_count
         FROM videos v
         JOIN user_video_permissions uvp ON uvp.video_id = v.id
         WHERE uvp.user_id = ? AND v.is_active = 1 AND uvp.is_active = 1
           AND (uvp.expires_at IS NULL OR uvp.expires_at > CURRENT_TIMESTAMP)
           AND v.category IS NOT NULL
         GROUP BY v.category
         ORDER BY v.category`,
        [req.user.userId]
    );
    res.json({ success: true, data: { categories: rows.map((c) => ({ name: c.category, videoCount: c.video_count })) } });
}));

// GET /api/videos/training-days — the user's days with their videos (signed) and techniques
router.get('/training-days', route(async (req, res) => {
    const trainingDays = await loadDaysWithVideos(req.user.userId, { signed: true });
    res.json({ success: true, data: { trainingDays, totalDays: trainingDays.length } });
}));

// GET /api/videos/category/:category
router.get('/category/:category', route(async (req, res) => {
    const { category } = req.params;
    const videos = await permittedVideos(req.user.userId, { category });
    res.json({ success: true, data: { category, videos, totalCount: videos.length } });
}));

// GET /api/videos/:id — one video; the access is logged
router.get('/:id', route(async (req, res) => {
    const videoId = id(req.params.id, 'video ID');
    const [video] = await permittedVideos(req.user.userId, { videoId });
    if (!video) throw notFound('Video not found or access denied');

    db.run(
        'INSERT INTO access_logs (user_id, video_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [req.user.userId, videoId, req.ip, req.get('User-Agent')]
    ).catch((err) => console.error('Failed to log video access:', err.message));

    res.json({ success: true, data: { video } });
}));

module.exports = router;
