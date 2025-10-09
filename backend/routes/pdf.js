const express = require('express');
const multer = require('multer');
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage (BLOB)
const storage = multer.memoryStorage();

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

// ==================== ADMIN ROUTES ====================

// POST /api/pdf/admin/upload/:userId
// Upload or replace PDF for a specific user (Admin only)
router.post('/admin/upload/:userId', authenticateToken, requireAdmin, upload.single('pdf'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { durationMonths = 2, durationDays = 0 } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded'
            });
        }

        const db = createDatabase();

        // Check if user exists
        db.getCallback('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                db.close();
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!user) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Check if user already has a PDF (exclude file_data to avoid large data transfer)
            db.getCallback('SELECT id, user_id, original_name, file_size FROM user_pdf_files WHERE user_id = ?', [userId], (err, existingPdf) => {
                if (err) {
                    db.close();
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error'
                    });
                }

                // Convert to base64 string for BLOB storage
                const fileData = req.file.buffer.toString('base64');

                if (existingPdf) {
                    // Update existing record with new duration
                    db.runCallback(`
                        UPDATE user_pdf_files
                        SET original_name = ?,
                            file_data = ?,
                            file_size = ?,
                            mime_type = ?,
                            uploaded_by = ?,
                            duration_months = ?,
                            duration_days = ?,
                            expiration_date = datetime('now', '+' || ? || ' months', '+' || ? || ' days'),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ?
                    `, [
                        req.file.originalname,
                        fileData,
                        req.file.size,
                        req.file.mimetype,
                        req.user.username,
                        durationMonths,
                        durationDays,
                        durationMonths,
                        durationDays,
                        userId
                    ], (err) => {
                        db.close();

                        if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({
                                success: false,
                                error: 'Failed to update PDF record'
                            });
                        }

                        console.log(`Admin ${req.user.username} updated PDF for user ID ${userId}`);

                        res.json({
                            success: true,
                            message: 'PDF updated successfully',
                            data: {
                                originalName: req.file.originalname,
                                fileSize: req.file.size
                            }
                        });
                    });
                } else {
                    // Insert new record with duration
                    db.runCallback(`
                        INSERT INTO user_pdf_files (user_id, original_name, file_data, file_size, mime_type, uploaded_by, duration_months, duration_days, expiration_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' months', '+' || ? || ' days'))
                    `, [
                        userId,
                        req.file.originalname,
                        fileData,
                        req.file.size,
                        req.file.mimetype,
                        req.user.username,
                        durationMonths,
                        durationDays,
                        durationMonths,
                        durationDays
                    ], (err) => {
                        db.close();

                        if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({
                                success: false,
                                error: 'Failed to save PDF record'
                            });
                        }

                        console.log(`Admin ${req.user.username} uploaded PDF for user ID ${userId}`);

                        res.json({
                            success: true,
                            message: 'PDF uploaded successfully',
                            data: {
                                originalName: req.file.originalname,
                                fileSize: req.file.size
                            }
                        });
                    });
                }
            });
        });
    } catch (error) {
        console.error('Upload error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to upload PDF'
        });
    }
});

// DELETE /api/pdf/admin/delete/:userId
// Delete PDF for a specific user (Admin only)
router.delete('/admin/delete/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const db = createDatabase();

        // Check if PDF exists
        db.getCallback('SELECT * FROM user_pdf_files WHERE user_id = ?', [userId], (err, pdf) => {
            if (err) {
                db.close();
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!pdf) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'No PDF found for this user'
                });
            }

            // Delete from database (BLOB is removed automatically)
            db.runCallback('DELETE FROM user_pdf_files WHERE user_id = ?', [userId], (err) => {
                db.close();

                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete PDF record'
                    });
                }

                console.log(`Admin ${req.user.username} deleted PDF for user ID ${userId}`);

                res.json({
                    success: true,
                    message: 'PDF deleted successfully'
                });
            });
        });
    } catch (error) {
        console.error('Delete error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete PDF'
        });
    }
});

// GET /api/pdf/admin/user/:userId
// Get PDF info for a specific user (Admin only)
router.get('/admin/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const db = createDatabase();

        db.getCallback('SELECT id, user_id, original_name, file_size, mime_type, uploaded_at, uploaded_by, updated_at, duration_months, duration_days, expiration_date FROM user_pdf_files WHERE user_id = ?', [userId], (err, pdf) => {
            db.close();

            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!pdf) {
                return res.json({
                    success: true,
                    data: null
                });
            }

            res.json({
                success: true,
                data: {
                    id: pdf.id,
                    userId: pdf.user_id,
                    originalName: pdf.original_name,
                    fileSize: pdf.file_size,
                    mimeType: pdf.mime_type,
                    uploadedAt: pdf.uploaded_at,
                    uploadedBy: pdf.uploaded_by,
                    updatedAt: pdf.updated_at,
                    durationMonths: pdf.duration_months,
                    durationDays: pdf.duration_days,
                    expirationDate: pdf.expiration_date
                }
            });
        });
    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch PDF info'
        });
    }
});

// PUT /api/pdf/admin/extend/:userId
// Extend PDF duration for a specific user (Admin only)
router.put('/admin/extend/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { additionalMonths = 0, additionalDays = 0 } = req.body;

        if (additionalMonths === 0 && additionalDays === 0) {
            return res.status(400).json({
                success: false,
                error: 'Must provide at least additionalMonths or additionalDays'
            });
        }

        const db = createDatabase();

        // Check if PDF exists
        db.getCallback('SELECT id, expiration_date, duration_months, duration_days FROM user_pdf_files WHERE user_id = ?', [userId], (err, pdf) => {
            if (err) {
                db.close();
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!pdf) {
                db.close();
                return res.status(404).json({
                    success: false,
                    error: 'No PDF found for this user'
                });
            }

            // Update duration and expiration date
            const newDurationMonths = pdf.duration_months + additionalMonths;
            const newDurationDays = pdf.duration_days + additionalDays;

            db.runCallback(`
                UPDATE user_pdf_files
                SET duration_months = ?,
                    duration_days = ?,
                    expiration_date = datetime(expiration_date, '+' || ? || ' months', '+' || ? || ' days'),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [
                newDurationMonths,
                newDurationDays,
                additionalMonths,
                additionalDays,
                userId
            ], (err) => {
                db.close();

                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to extend PDF duration'
                    });
                }

                console.log(`Admin ${req.user.username} extended PDF duration for user ID ${userId} by ${additionalMonths} months and ${additionalDays} days`);

                res.json({
                    success: true,
                    message: 'PDF duration extended successfully',
                    data: {
                        newDurationMonths,
                        newDurationDays
                    }
                });
            });
        });
    } catch (error) {
        console.error('Extend error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to extend PDF duration'
        });
    }
});

// ==================== USER ROUTES ====================

// GET /api/pdf/my-pdf
// Get current user's PDF info (User)
router.get('/my-pdf', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const db = createDatabase();

        db.getCallback('SELECT id, original_name, file_size, mime_type, uploaded_at, updated_at, expiration_date FROM user_pdf_files WHERE user_id = ?', [userId], (err, pdf) => {
            db.close();

            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!pdf) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'No training plan available yet'
                });
            }

            res.json({
                success: true,
                data: {
                    originalName: pdf.original_name,
                    fileSize: pdf.file_size,
                    uploadedAt: pdf.uploaded_at,
                    updatedAt: pdf.updated_at,
                    expirationDate: pdf.expiration_date
                }
            });
        });
    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch PDF info'
        });
    }
});

// GET /api/pdf/download
// Download current user's PDF (User) or specific user's PDF (Admin with userId query param)
router.get('/download', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const isAdmin = req.user.username === adminUsername;

        // Determine target user ID
        let targetUserId = req.user.userId;

        // If admin and userId is provided, download that user's PDF
        if (req.query.userId && isAdmin) {
            targetUserId = parseInt(req.query.userId);
        } else if (req.query.userId && !isAdmin) {
            // Non-admin users can't download other users' PDFs
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const db = createDatabase();

        db.getCallback('SELECT file_data, original_name, mime_type FROM user_pdf_files WHERE user_id = ?', [targetUserId], (err, pdf) => {
            db.close();

            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Database error'
                });
            }

            if (!pdf) {
                return res.status(404).json({
                    success: false,
                    error: 'No training plan available'
                });
            }

            // Decode base64 string back to buffer
            const fileBuffer = Buffer.from(pdf.file_data, 'base64');

            if (isAdmin && targetUserId !== req.user.userId) {
                console.log(`Admin ${req.user.username} downloaded PDF for user ID ${targetUserId}: ${pdf.original_name}`);
            } else {
                console.log(`User ${req.user.username} downloaded their PDF: ${pdf.original_name}`);
            }

            // Set headers for PDF download
            res.setHeader('Content-Type', pdf.mime_type || 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${pdf.original_name}"`);
            res.setHeader('Content-Length', fileBuffer.length);

            // Send binary data
            res.send(fileBuffer);
        });
    } catch (error) {
        console.error('Download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to download PDF'
        });
    }
});

module.exports = router;
