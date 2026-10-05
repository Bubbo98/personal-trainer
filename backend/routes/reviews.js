const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { route, badRequest, notFound } = require('../utils/http');

// Client reviews: public lists for the website, each client's own review
const router = express.Router();

const author = (r) => ({
    firstName: r.first_name,
    lastName: r.last_name,
    displayName: [r.first_name, r.last_name ? `${r.last_name.charAt(0)}.` : ''].filter(Boolean).join(' '),
});

// GET /api/reviews/public — approved reviews, featured first
router.get('/public', route(async (req, res) => {
    const reviews = await db.query(`
        SELECT r.id, r.rating, r.title, r.comment, r.is_featured, r.created_at, u.first_name, u.last_name
        FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.is_approved = 1
        ORDER BY r.is_featured DESC, r.created_at DESC
    `);
    res.json({
        success: true,
        data: {
            reviews: reviews.map((r) => ({
                id: r.id, rating: r.rating, title: r.title, comment: r.comment,
                isFeatured: r.is_featured, createdAt: r.created_at, author: author(r),
            })),
            totalCount: reviews.length,
        },
    });
}));

// GET /api/reviews/featured — up to 6 featured reviews for the home page
router.get('/featured', route(async (req, res) => {
    const reviews = await db.query(`
        SELECT r.id, r.rating, r.title, r.comment, r.created_at, u.first_name, u.last_name
        FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.is_approved = 1 AND r.is_featured = 1
        ORDER BY r.created_at DESC
        LIMIT 6
    `);
    res.json({
        success: true,
        data: {
            reviews: reviews.map((r) => ({
                id: r.id, rating: r.rating, title: r.title, comment: r.comment, createdAt: r.created_at, author: author(r),
            })),
        },
    });
}));

// GET /api/reviews/my
router.get('/my', authenticateToken, route(async (req, res) => {
    const r = await db.get(
        'SELECT id, rating, title, comment, is_approved, created_at, updated_at FROM reviews WHERE user_id = ?',
        [req.user.userId]
    );
    res.json({
        success: true,
        data: {
            review: r && {
                id: r.id, rating: r.rating, title: r.title, comment: r.comment,
                isApproved: r.is_approved, createdAt: r.created_at, updatedAt: r.updated_at,
            },
        },
    });
}));

// POST /api/reviews — creates or replaces the client's review (back to pending approval)
// Body: { rating: 1-5, title?, comment: 10-1000 chars }
router.post('/', authenticateToken, route(async (req, res) => {
    const { rating, title, comment } = req.body;
    if (!rating || !comment) throw badRequest('Rating and comment are required');
    if (rating < 1 || rating > 5) throw badRequest('Rating must be between 1 and 5');
    if (comment.length < 10) throw badRequest('Comment must be at least 10 characters long');
    if (comment.length > 1000) throw badRequest('Comment must be less than 1000 characters');

    const userId = req.user.userId;
    const existing = await db.get('SELECT id FROM reviews WHERE user_id = ?', [userId]);
    if (existing) {
        await db.run(
            `UPDATE reviews SET rating = ?, title = ?, comment = ?, is_approved = 0, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [rating, title, comment, userId]
        );
        return res.json({
            success: true,
            message: 'Review updated successfully. It will be visible after admin approval.',
            data: { reviewId: existing.id, needsApproval: true },
        });
    }

    const { lastId } = await db.run('INSERT INTO reviews (user_id, rating, title, comment) VALUES (?, ?, ?, ?)', [userId, rating, title, comment]);
    res.status(201).json({
        success: true,
        message: 'Review submitted successfully. It will be visible after admin approval.',
        data: { reviewId: lastId, needsApproval: true },
    });
}));

// DELETE /api/reviews/my
router.delete('/my', authenticateToken, route(async (req, res) => {
    const { changes } = await db.run('DELETE FROM reviews WHERE user_id = ?', [req.user.userId]);
    if (changes === 0) throw notFound('No review found to delete');
    res.json({ success: true, message: 'Review deleted successfully' });
}));

module.exports = router;
