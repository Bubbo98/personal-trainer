const express = require('express');
const { db } = require('../../utils/database');
const { route, id, badRequest, notFound } = require('../../utils/http');

// Admin: client reviews moderation
const router = express.Router();

// GET /api/admin/reviews
router.get('/reviews', route(async (req, res) => {
    const reviews = await db.query(`
        SELECT r.id, r.rating, r.title, r.comment, r.is_approved, r.is_featured, r.approved_at, r.approved_by,
               r.created_at, r.updated_at, u.first_name, u.last_name, u.username, u.email
        FROM reviews r JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC
    `);
    res.json({
        success: true,
        data: {
            reviews: reviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                title: r.title,
                comment: r.comment,
                isApproved: r.is_approved,
                isFeatured: r.is_featured,
                approvedAt: r.approved_at,
                approvedBy: r.approved_by,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                user: { firstName: r.first_name, lastName: r.last_name, username: r.username, email: r.email },
            })),
            totalCount: reviews.length,
            pendingCount: reviews.filter((r) => !r.is_approved).length,
            approvedCount: reviews.filter((r) => r.is_approved).length,
            featuredCount: reviews.filter((r) => r.is_featured).length,
        },
    });
}));

// PUT /api/admin/reviews/:id/approve — Body: { approved: boolean }
router.put('/reviews/:id/approve', route(async (req, res) => {
    const reviewId = id(req.params.id, 'review ID');
    const { approved } = req.body;
    if (typeof approved !== 'boolean') throw badRequest('Approved status must be true or false');

    const { changes } = await db.run(
        `UPDATE reviews SET is_approved = ?, approved_at = ${approved ? 'CURRENT_TIMESTAMP' : 'NULL'},
                approved_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [approved ? 1 : 0, approved ? req.user.username : null, reviewId]
    );
    if (changes === 0) throw notFound('Review not found');
    res.json({
        success: true,
        message: `Review ${approved ? 'approved' : 'disapproved'} successfully`,
        data: {
            reviewId,
            isApproved: approved,
            approvedBy: approved ? req.user.username : null,
            approvedAt: approved ? new Date().toISOString() : null,
        },
    });
}));

// PUT /api/admin/reviews/:id/feature — Body: { featured: boolean }
router.put('/reviews/:id/feature', route(async (req, res) => {
    const reviewId = id(req.params.id, 'review ID');
    const { featured } = req.body;
    if (typeof featured !== 'boolean') throw badRequest('Featured status must be true or false');

    const { changes } = await db.run(
        'UPDATE reviews SET is_featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [featured ? 1 : 0, reviewId]
    );
    if (changes === 0) throw notFound('Review not found');
    res.json({
        success: true,
        message: `Review ${featured ? 'featured' : 'unfeatured'} successfully`,
        data: { reviewId, isFeatured: featured },
    });
}));

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', route(async (req, res) => {
    const { changes } = await db.run('DELETE FROM reviews WHERE id = ?', [id(req.params.id, 'review ID')]);
    if (changes === 0) throw notFound('Review not found');
    res.json({ success: true, message: 'Review deleted successfully' });
}));

module.exports = router;
