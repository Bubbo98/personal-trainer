const express = require('express');
const router = express.Router();
const { createDatabase } = require('../utils/database');
const { getSignedVideoUrl } = require('../utils/r2');

// R2 signed URLs can't outlive 7 days; the redirect itself is cached for a day
const SIGNED_URL_TTL = 7 * 24 * 60 * 60;
const REDIRECT_CACHE_SECONDS = 24 * 60 * 60;

// GET /api/thumbnails/:videoId
// Public (used directly in <img src>): redirects to the video's thumbnail.
// Thumbnails on R2 (thumbnail_key) get a signed URL; videos not migrated yet
// fall back to the old static file under /thumbnails (thumbnail_path).
// The frontend adds ?v=<key> so a new thumbnail busts the cached redirect.
router.get('/:videoId', (req, res) => {
    const videoId = parseInt(req.params.videoId, 10);
    if (Number.isNaN(videoId)) return res.status(400).end();

    const db = createDatabase();
    db.getCallback(
        'SELECT thumbnail_key, thumbnail_path FROM videos WHERE id = ?',
        [videoId],
        async (err, video) => {
            db.close();
            if (err) return res.status(500).end();
            if (!video || (!video.thumbnail_key && !video.thumbnail_path)) return res.status(404).end();

            try {
                const target = video.thumbnail_key
                    ? await getSignedVideoUrl(video.thumbnail_key, SIGNED_URL_TTL)
                    : `/thumbnails/${encodeURIComponent(video.thumbnail_path)}`;
                res.set('Cache-Control', `public, max-age=${REDIRECT_CACHE_SECONDS}`);
                // helmet defaults to same-origin, which blocks <img> from another
                // origin (e.g. frontend on :3000, API on :3001)
                res.set('Cross-Origin-Resource-Policy', 'cross-origin');
                res.redirect(302, target);
            } catch (signErr) {
                console.error(`Thumbnail redirect failed for video ${videoId}:`, signErr);
                res.status(500).end();
            }
        }
    );
});

module.exports = router;
