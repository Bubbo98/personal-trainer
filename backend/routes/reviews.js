const express = require('express');
const { createDatabase } = require('../utils/database');
const { authenticateToken, verifyActiveUser } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// GET /api/reviews/public
// Get approved reviews for public display
router.get('/public', (req, res) => {
    const db = createDatabase();

    const query = `
        SELECT
            r.id,
            r.rating,
            r.title,
            r.comment,
            r.is_featured,
            r.created_at,
            u.first_name,
            u.last_name
        FROM reviews r
        INNER JOIN users u ON r.user_id = u.id
        WHERE r.is_approved = 1
        ORDER BY r.is_featured DESC, r.created_at DESC
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
                    isFeatured: review.is_featured,
                    createdAt: review.created_at,
                    author: {
                        firstName: review.first_name,
                        lastName: review.last_name,
                        displayName: `${review.first_name} ${review.last_name.charAt(0)}.`
                    }
                })),
                totalCount: reviews.length
            }
        });
    });
});

// GET /api/reviews/featured
// Get only featured reviews for home page
router.get('/featured', (req, res) => {
    const db = createDatabase();

    const query = `
        SELECT
            r.id,
            r.rating,
            r.title,
            r.comment,
            r.created_at,
            u.first_name,
            u.last_name
        FROM reviews r
        INNER JOIN users u ON r.user_id = u.id
        WHERE r.is_approved = 1 AND r.is_featured = 1
        ORDER BY r.created_at DESC
        LIMIT 6
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
                    createdAt: review.created_at,
                    author: {
                        firstName: review.first_name,
                        lastName: review.last_name,
                        displayName: `${review.first_name} ${review.last_name.charAt(0)}.`
                    }
                }))
            }
        });
    });
});

// User routes (require authentication)
router.use(authenticateToken);

// GET /api/reviews/my
// Get current user's review
router.get('/my', (req, res) => {
    const userId = req.user.userId;
    const db = createDatabase();

    const query = `
        SELECT
            id,
            rating,
            title,
            comment,
            is_approved,
            created_at,
            updated_at
        FROM reviews
        WHERE user_id = ?
    `;

    db.getCallback(query, [userId], (err, review) => {
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
                review: review ? {
                    id: review.id,
                    rating: review.rating,
                    title: review.title,
                    comment: review.comment,
                    isApproved: review.is_approved,
                    createdAt: review.created_at,
                    updatedAt: review.updated_at
                } : null
            }
        });
    });
});

// POST /api/reviews
// Create or update user's review
router.post('/', (req, res) => {
    const userId = req.user.userId;
    const { rating, title, comment } = req.body;

    // Validation
    if (!rating || !comment) {
        return res.status(400).json({
            success: false,
            error: 'Rating and comment are required'
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            success: false,
            error: 'Rating must be between 1 and 5'
        });
    }

    if (comment.length < 10) {
        return res.status(400).json({
            success: false,
            error: 'Comment must be at least 10 characters long'
        });
    }

    if (comment.length > 1000) {
        return res.status(400).json({
            success: false,
            error: 'Comment must be less than 1000 characters'
        });
    }

    const db = createDatabase();

    // Log review data to Vercel logs for tracking
    console.log('📝 NEW REVIEW SUBMITTED:');
    console.log(`User: ${req.user.username} (ID: ${userId})`);
    console.log(`Rating: ${rating}/5`);
    console.log(`Title: ${title}`);
    console.log(`Comment: ${comment}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(50));

    // Check if user already has a review
    db.getCallback('SELECT id FROM reviews WHERE user_id = ?', [userId], (err, existingReview) => {
        if (err) {
            db.close();
            console.error('Database error in SELECT:', err.message);
            console.error('Full error:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }

        if (existingReview) {
            // Update existing review
            db.runCallback(`
                UPDATE reviews
                SET rating = ?, title = ?, comment = ?,
                    is_approved = 0, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [rating, title, comment, userId], function(err) {
                db.close();

                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }

                console.log(`User ${req.user.username} updated their review`);

                res.json({
                    success: true,
                    message: 'Review updated successfully. It will be visible after admin approval.',
                    data: {
                        reviewId: existingReview.id,
                        needsApproval: true
                    }
                });
            });
        } else {
            // Create new review
            db.runCallback(`
                INSERT INTO reviews (user_id, rating, title, comment)
                VALUES (?, ?, ?, ?)
            `, [userId, rating, title, comment], function(err) {
                db.close();

                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }

                console.log(`User ${req.user.username} created a new review`);

                res.status(201).json({
                    success: true,
                    message: 'Review submitted successfully. It will be visible after admin approval.',
                    data: {
                        reviewId: this.lastID,
                        needsApproval: true
                    }
                });
            });
        }
    });
});

// DELETE /api/reviews/my
// Delete user's own review
router.delete('/my', (req, res) => {
    const userId = req.user.userId;
    const db = createDatabase();

    db.runCallback('DELETE FROM reviews WHERE user_id = ?', [userId], function(err) {
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
                error: 'No review found to delete'
            });
        }

        console.log(`User ${req.user.username} deleted their review`);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    });
});

module.exports = router;