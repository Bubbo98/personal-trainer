const express = require('express');
const path = require('path');
const { db } = require('../../utils/database');
const r2 = require('../../utils/r2');
const { route, id, badRequest, notFound } = require('../../utils/http');

// Admin: video library, uploads to R2, thumbnails
const router = express.Router();

const VIDEO_CATEGORIES = ['palestra', 'corpoLibero'];
const THUMBNAIL_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

const toVideo = (v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    filePath: v.file_path,
    duration: v.duration,
    thumbnailKey: v.thumbnail_key || null,
    category: v.category,
    muscleGroup: v.muscle_group || null,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
});

/**
 * Rank for a numeric search: titles list several numbers ("(1°) - 30/34 ; (2°) - 38/41"),
 * so rank by the smallest number containing the searched digits (5, 15, 25…).
 * Numbers followed by "°" (angles, floor markers) are ignored.
 */
function numberMatchScore(title, digits) {
    const matching = (title.match(/\d+(?![\d°])/g) || []).filter((n) => n.includes(digits)).map(Number);
    return matching.length ? Math.min(...matching) : Infinity;
}

// GET /api/admin/videos — all videos; optional page/limit, search (title), muscleGroup ('__none__' = unset), missingThumbnail=1
router.get('/videos', route(async (req, res) => {
    const { page, limit, search, muscleGroup, missingThumbnail } = req.query;
    const isPaginated = page !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['v.is_active = 1'];
    const params = [];
    if (search) {
        conditions.push('v.title LIKE ?');
        params.push(`%${search}%`);
    }
    if (muscleGroup === '__none__') {
        conditions.push("(v.muscle_group IS NULL OR v.muscle_group = '')");
    } else if (muscleGroup) {
        conditions.push('v.muscle_group = ?');
        params.push(muscleGroup);
    }
    if (missingThumbnail === '1') conditions.push('v.thumbnail_key IS NULL');
    const where = conditions.join(' AND ');

    // A numeric search is sorted in JS (by the matching number), so it pages in JS too
    const numericSearch = search && /^\d+$/.test(search.trim()) ? search.trim() : null;
    const pageInSql = isPaginated && !numericSearch;

    const [counts, rows] = await Promise.all([
        db.get(
            `SELECT COUNT(*) AS total,
                    (SELECT COUNT(*) FROM videos WHERE is_active = 1 AND thumbnail_key IS NULL) AS missing
             FROM videos v WHERE ${where}`,
            params
        ),
        db.query(
            `SELECT v.*, (SELECT COUNT(*) FROM user_video_permissions uvp WHERE uvp.video_id = v.id AND uvp.is_active = 1) AS user_count
             FROM videos v WHERE ${where}
             ORDER BY v.created_at DESC
             ${pageInSql ? 'LIMIT ? OFFSET ?' : ''}`,
            pageInSql ? [...params, limitNum, offset] : params
        ),
    ]);

    let videos = rows;
    if (numericSearch) {
        videos = [...videos].sort((a, b) => numberMatchScore(a.title, numericSearch) - numberMatchScore(b.title, numericSearch));
        if (isPaginated) videos = videos.slice(offset, offset + limitNum);
    }

    const total = Number(counts.total);
    res.json({
        success: true,
        data: {
            videos: videos.map((v) => ({ ...toVideo(v), userCount: v.user_count })),
            totalCount: total,
            ...(isPaginated ? { totalPages: Math.ceil(total / limitNum), currentPage: pageNum } : {}),
            missingThumbnailCount: Number(counts.missing),
        },
    });
}));

// GET /api/admin/videos/:id/preview — the video with a signed URL (no permission check)
router.get('/videos/:id/preview', route(async (req, res) => {
    const video = await db.get('SELECT * FROM videos WHERE id = ? AND is_active = 1', [id(req.params.id, 'video ID')]);
    if (!video) throw notFound('Video not found');
    const { muscleGroup, updatedAt, ...preview } = toVideo(video);
    res.json({ success: true, data: { video: { ...preview, signedUrl: await r2.signedUrlOrNull(video.file_path) } } });
}));

// POST /api/admin/videos/upload-url — presigned PUT for a direct browser upload
// Body: { fileName, fileType?, category: 'palestra' | 'corpoLibero' }
// An existing file is never overwritten: a clashing name gets a timestamp suffix.
router.post('/videos/upload-url', route(async (req, res) => {
    const { fileName, fileType, category } = req.body;
    if (!fileName || !category) throw badRequest('fileName and category are required');
    if (!VIDEO_CATEGORIES.includes(category)) throw badRequest(`category must be one of: ${VIDEO_CATEGORIES.join(', ')}`);

    // Only the file's own name: no folders, no control characters
    const safeName = path.basename(String(fileName).replace(/\\/g, '/')).replace(/[\u0000-\u001f]/g, '').trim();
    if (!safeName || safeName === '.' || safeName === '..') throw badRequest('Invalid fileName');

    let key = `${category}/${safeName}`;
    if (await r2.objectExists(key)) {
        const ext = path.extname(safeName);
        key = `${category}/${path.basename(safeName, ext)}-${Date.now()}${ext}`;
    }

    const expiresIn = 1800;
    const uploadUrl = await r2.getVideoUploadUrl(key, fileType || 'video/mp4', expiresIn);
    res.json({ success: true, data: { uploadUrl, filePath: key, expiresIn } });
}));

// POST /api/admin/videos — Body: { title, filePath, description?, duration?, category?, muscleGroup? }
router.post('/videos', route(async (req, res) => {
    const { title, description, filePath, duration, category, muscleGroup } = req.body;
    if (!title || !filePath) throw badRequest('Title and file path are required');
    const { lastId } = await db.run(
        `INSERT INTO videos (title, description, file_path, duration, category, muscle_group)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, description || null, filePath, duration || null, category || null, muscleGroup || null]
    );
    res.status(201).json({
        success: true,
        message: 'Video created successfully',
        data: { id: lastId, title, description, filePath, duration, category, muscleGroup: muscleGroup || null },
    });
}));

// PUT /api/admin/videos/:id — Body: { title, description?, muscleGroup? } (thumbnail: see /thumbnail below)
router.put('/videos/:id', route(async (req, res) => {
    const videoId = id(req.params.id, 'video ID');
    const { title, description, muscleGroup } = req.body;
    if (!title) throw badRequest('Title is required');
    const { changes } = await db.run(
        `UPDATE videos SET title = ?, description = ?, muscle_group = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND is_active = 1`,
        [title, description || null, muscleGroup || null, videoId]
    );
    if (changes === 0) throw notFound('Video not found');
    res.json({
        success: true,
        message: 'Video updated successfully',
        data: { id: videoId, title, description, muscleGroup: muscleGroup || null },
    });
}));

// DELETE /api/admin/videos/:id — deactivates the video and every permission on it
router.delete('/videos/:id', route(async (req, res) => {
    const videoId = id(req.params.id, 'video ID');
    const [{ changes }] = await db.batch([
        { sql: 'UPDATE videos SET is_active = 0 WHERE id = ?', params: [videoId] },
        { sql: 'UPDATE user_video_permissions SET is_active = 0 WHERE video_id = ?', params: [videoId] },
    ]);
    if (changes === 0) throw notFound('Video not found');
    res.json({ success: true, message: 'Video deleted successfully' });
}));

// POST /api/admin/videos/:id/thumbnail/upload-url — Body: { contentType }
// The key is unique per upload, so a replaced thumbnail never shows a stale cached image.
router.post('/videos/:id/thumbnail/upload-url', route(async (req, res) => {
    const videoId = id(req.params.id, 'video ID');
    const extension = THUMBNAIL_TYPES[req.body.contentType];
    if (!extension) throw badRequest('Valid video id and image type (webp/jpeg/png) required');
    const key = `${r2.THUMBNAIL_PREFIX}${videoId}-${Date.now()}.${extension}`;
    const uploadUrl = await r2.getThumbnailUploadUrl(key, req.body.contentType);
    res.json({ success: true, data: { uploadUrl, key } });
}));

// PUT /api/admin/videos/:id/thumbnail — Body: { key } (null removes it); the previous image is deleted from R2
router.put('/videos/:id/thumbnail', route(async (req, res) => {
    const videoId = id(req.params.id, 'video ID');
    const { key } = req.body;
    if (key !== null && (typeof key !== 'string' || !key.startsWith(`${r2.THUMBNAIL_PREFIX}${videoId}-`))) {
        throw badRequest('Invalid thumbnail key');
    }
    const video = await db.get('SELECT thumbnail_key FROM videos WHERE id = ?', [videoId]);
    if (!video) throw notFound('Video not found');

    await db.run('UPDATE videos SET thumbnail_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [key, videoId]);
    if (video.thumbnail_key && video.thumbnail_key !== key) {
        r2.deleteObject(video.thumbnail_key).catch((err) => console.error('Old thumbnail delete failed:', err.message));
    }
    res.json({ success: true, data: { thumbnailKey: key } });
}));

module.exports = router;
