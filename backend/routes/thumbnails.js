const express = require('express');
const { db } = require('../utils/database');
const { getSignedVideoUrl } = require('../utils/r2');
const { route, id } = require('../utils/http');

// GET /api/thumbnails/:videoId — public (used straight in <img src>): redirects to the
// video's thumbnail on R2. The frontend adds ?v=<key> so a new thumbnail busts the cache.
const router = express.Router();

// R2 signed URLs can't outlive 7 days; the redirect itself is cached for a day
const SIGNED_URL_TTL = 7 * 24 * 60 * 60;
const REDIRECT_CACHE_SECONDS = 24 * 60 * 60;

router.get('/:videoId', route(async (req, res) => {
    const video = await db.get('SELECT thumbnail_key FROM videos WHERE id = ?', [id(req.params.videoId, 'video ID')]);
    if (!video || !video.thumbnail_key) return res.status(404).end();

    const target = await getSignedVideoUrl(video.thumbnail_key, SIGNED_URL_TTL);
    res.set('Cache-Control', `public, max-age=${REDIRECT_CACHE_SECONDS}`);
    // helmet defaults to same-origin, which blocks <img> from another origin (frontend :3000, API :3001)
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.redirect(302, target);
}));

module.exports = router;
