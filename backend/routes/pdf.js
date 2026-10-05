const express = require('express');
const multer = require('multer');
const { db } = require('../utils/database');
const { authenticateToken, requireAdmin, isAdmin } = require('../middleware/auth');
const { route, id, badRequest, forbidden, notFound, attachment } = require('../utils/http');

// The client's training plan PDF (one per user, stored base64 in user_pdf_files)
const router = express.Router();
const admin = [authenticateToken, requireAdmin];

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(badRequest('Only PDF files are allowed'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});

/** Integer from the body, or the default; 400 when it isn't a whole number. */
function int(value, name, fallback = 0) {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isInteger(n)) throw badRequest(`${name} must be a whole number`);
    return n;
}

/** "+N months" / "-N days" modifier for SQLite datetime(). */
const modifier = (n, unit) => `${n >= 0 ? '+' : '-'}${Math.abs(n)} ${unit}`;

/** True while the plan is scheduled to appear later. */
const isLocked = (pdf) => !!pdf.visible_from && new Date(pdf.visible_from) > new Date();

// ─── Admin ───────────────────────────────────────────────────────────────────

// POST /api/pdf/admin/upload/:userId — uploads or replaces the plan
// Form: pdf (file), durationMonths (default 2), durationDays (default 0), visibleFrom?
router.post('/admin/upload/:userId', admin, upload.single('pdf'), route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    if (!req.file) throw badRequest('No PDF file uploaded');
    const months = int(req.body.durationMonths, 'durationMonths', 2);
    const days = int(req.body.durationDays, 'durationDays', 0);

    if (!(await db.get('SELECT id FROM users WHERE id = ?', [userId]))) throw notFound('User not found');

    // updated_at marks a new plan version: it restarts the check-in schedule
    const { changes } = await db.run(
        `INSERT INTO user_pdf_files (user_id, original_name, file_data, file_size, mime_type, uploaded_by,
                                     duration_months, duration_days, expiration_date, visible_from)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?, ?), ?)
         ON CONFLICT(user_id) DO UPDATE SET
            original_name = excluded.original_name, file_data = excluded.file_data, file_size = excluded.file_size,
            mime_type = excluded.mime_type, uploaded_by = excluded.uploaded_by,
            duration_months = excluded.duration_months, duration_days = excluded.duration_days,
            expiration_date = excluded.expiration_date, visible_from = excluded.visible_from,
            updated_at = CURRENT_TIMESTAMP`,
        [userId, req.file.originalname, req.file.buffer.toString('base64'), req.file.size, req.file.mimetype,
            req.user.username, months, days, modifier(months, 'months'), modifier(days, 'days'), req.body.visibleFrom || null]
    );
    if (changes === 0) throw new Error('PDF not saved');

    res.json({
        success: true,
        message: 'PDF uploaded successfully',
        data: { originalName: req.file.originalname, fileSize: req.file.size },
    });
}));

// DELETE /api/pdf/admin/delete/:userId
router.delete('/admin/delete/:userId', admin, route(async (req, res) => {
    const { changes } = await db.run('DELETE FROM user_pdf_files WHERE user_id = ?', [id(req.params.userId, 'user ID')]);
    if (changes === 0) throw notFound('No PDF found for this user');
    res.json({ success: true, message: 'PDF deleted successfully' });
}));

// GET /api/pdf/admin/user/:userId — plan details (null when there is none)
router.get('/admin/user/:userId', admin, route(async (req, res) => {
    const pdf = await db.get(
        `SELECT id, user_id, original_name, file_size, mime_type, uploaded_at, uploaded_by, updated_at,
                duration_months, duration_days, expiration_date, visible_from
         FROM user_pdf_files WHERE user_id = ?`,
        [id(req.params.userId, 'user ID')]
    );
    res.json({
        success: true,
        data: pdf && {
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
            expirationDate: pdf.expiration_date,
            visibleFrom: pdf.visible_from,
        },
    });
}));

// PUT /api/pdf/admin/extend/:userId — Body: { additionalMonths?, additionalDays? } (negative values shorten)
router.put('/admin/extend/:userId', admin, route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    const addMonths = int(req.body.additionalMonths, 'additionalMonths');
    const addDays = int(req.body.additionalDays, 'additionalDays');
    if (addMonths === 0 && addDays === 0) throw badRequest('Must provide at least additionalMonths or additionalDays');

    const pdf = await db.get('SELECT expiration_date, duration_months, duration_days FROM user_pdf_files WHERE user_id = ?', [userId]);
    if (!pdf) throw notFound('No PDF found for this user');

    let months = pdf.duration_months + addMonths;
    let days = pdf.duration_days + addDays;
    while (days < 0 && months > 0) { // borrow a month (approximated as 30 days)
        months -= 1;
        days += 30;
    }
    if (months < 0 || (months === 0 && days < 0)) {
        throw badRequest(`La durata non può essere negativa. Durata attuale: ${pdf.duration_months} mesi e ${pdf.duration_days} giorni.`);
    }

    // No expiry yet: count the whole duration from now; otherwise shift the current expiry
    await db.run(
        pdf.expiration_date
            ? `UPDATE user_pdf_files SET duration_months = ?, duration_days = ?, expiration_date = datetime(expiration_date, ?, ?),
                   updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
            : `UPDATE user_pdf_files SET duration_months = ?, duration_days = ?, expiration_date = datetime('now', ?, ?),
                   updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        pdf.expiration_date
            ? [months, days, modifier(addMonths, 'months'), modifier(addDays, 'days'), userId]
            : [months, days, modifier(months, 'months'), modifier(days, 'days'), userId]
    );
    res.json({
        success: true,
        message: 'PDF duration extended successfully',
        data: { newDurationMonths: months, newDurationDays: days },
    });
}));

// PUT /api/pdf/admin/visible-from/:userId — Body: { visibleFrom: date | null } (null unlocks)
router.put('/admin/visible-from/:userId', admin, route(async (req, res) => {
    const visibleFrom = req.body.visibleFrom || null;
    const { changes } = await db.run(
        'UPDATE user_pdf_files SET visible_from = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [visibleFrom, id(req.params.userId, 'user ID')]
    );
    if (changes === 0) throw notFound('No PDF found for this user');
    res.json({
        success: true,
        message: visibleFrom ? `Scheda bloccata fino al ${visibleFrom}` : 'Scheda sbloccata',
        data: { visibleFrom },
    });
}));

// ─── Client ──────────────────────────────────────────────────────────────────

// GET /api/pdf/my-pdf — plan details, or { locked, visibleFrom } before it becomes visible
router.get('/my-pdf', authenticateToken, route(async (req, res) => {
    const pdf = await db.get(
        `SELECT original_name, file_size, uploaded_at, updated_at, expiration_date, visible_from
         FROM user_pdf_files WHERE user_id = ?`,
        [req.user.userId]
    );
    if (!pdf) return res.json({ success: true, data: null, message: 'No training plan available yet' });
    if (isLocked(pdf)) return res.json({ success: true, data: { locked: true, visibleFrom: pdf.visible_from } });
    res.json({
        success: true,
        data: {
            locked: false,
            originalName: pdf.original_name,
            fileSize: pdf.file_size,
            uploadedAt: pdf.uploaded_at,
            updatedAt: pdf.updated_at,
            expirationDate: pdf.expiration_date,
            visibleFrom: pdf.visible_from,
        },
    });
}));

// GET /api/pdf/download[?userId] — the client's own plan; the admin may pass any userId
router.get('/download', authenticateToken, route(async (req, res) => {
    const admin = isAdmin(req.user);
    if (req.query.userId && !admin) throw forbidden('Access denied');
    const userId = req.query.userId ? id(req.query.userId, 'user ID') : req.user.userId;

    const pdf = await db.get('SELECT file_data, original_name, mime_type, visible_from FROM user_pdf_files WHERE user_id = ?', [userId]);
    if (!pdf) throw notFound('No training plan available');
    if (!admin && isLocked(pdf)) throw forbidden('Training plan not yet available');

    const file = Buffer.from(pdf.file_data, 'base64');
    res.set({
        'Content-Type': pdf.mime_type || 'application/pdf',
        'Content-Disposition': attachment(pdf.original_name),
        'Content-Length': file.length,
    });
    res.send(file);
}));

module.exports = router;
