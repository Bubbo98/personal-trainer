const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../utils/database');
const { authenticateToken, requireAdmin, isAdmin } = require('../middleware/auth');
const { route, id, badRequest, forbidden, notFound, attachment } = require('../utils/http');
const { parseBodyCompositionPDF, parseBodyCompositionText } = require('../services/bodyCompositionParser');

// Body composition reports (PDF or photo of the scale's printout), parsed into measurements
const router = express.Router();
const admin = [authenticateToken, requireAdmin];

const MIME_BY_EXTENSION = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf',
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (Object.values(MIME_BY_EXTENSION).includes(file.mimetype)) cb(null, true);
        else cb(badRequest('Formato non supportato. Usa JPG, PNG, WEBP o PDF.'), false);
    },
    limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Measurements from the report: images are OCR'd in the admin's browser (ocrText),
 * PDFs with a text layer are parsed here. Null when nothing could be read.
 */
async function parseReport(file, ocrText) {
    try {
        if (ocrText && ocrText.length > 50) return parseBodyCompositionText(ocrText);
        if (file.mimetype === 'application/pdf') {
            const parsed = await parseBodyCompositionPDF(file.buffer);
            return parsed.rawTextLength > 50 ? parsed : null;
        }
    } catch (err) {
        console.warn('Body composition parsing failed:', err.message);
    }
    return null;
}

// POST /api/body-composition/admin/upload/:userId — Form: pdf (file), measurementDate?, ocrText?
router.post('/admin/upload/:userId', admin, upload.single('pdf'), route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    if (!req.file) throw badRequest('Nessun file');
    if (!(await db.get('SELECT id FROM users WHERE id = ?', [userId]))) throw notFound('Utente non trovato');

    const parsed = await parseReport(req.file, req.body.ocrText);
    const measurementDate = req.body.measurementDate || null;
    const { lastId } = await db.run(
        `INSERT INTO body_composition_reports (user_id, measurement_date, uploaded_by, original_name, file_size, file_data, parsed_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, measurementDate, req.user.username, req.file.originalname, req.file.size,
            req.file.buffer.toString('base64'), parsed ? JSON.stringify(parsed) : null]
    );
    res.status(201).json({ success: true, message: 'Report caricato', data: { id: lastId, measurementDate } });
}));

// GET /api/body-composition/admin/:userId
router.get('/admin/:userId', admin, route(async (req, res) => {
    const rows = await db.query(
        `SELECT id, user_id, measurement_date, uploaded_at, uploaded_by, original_name, file_size
         FROM body_composition_reports WHERE user_id = ? ORDER BY uploaded_at DESC`,
        [id(req.params.userId, 'user ID')]
    );
    res.json({
        success: true,
        data: rows.map((r) => ({
            id: r.id, userId: r.user_id, measurementDate: r.measurement_date, uploadedAt: r.uploaded_at,
            uploadedBy: r.uploaded_by, originalName: r.original_name, fileSize: r.file_size,
        })),
    });
}));

// DELETE /api/body-composition/admin/report/:reportId
router.delete('/admin/report/:reportId', admin, route(async (req, res) => {
    const { changes } = await db.run('DELETE FROM body_composition_reports WHERE id = ?', [id(req.params.reportId, 'report ID')]);
    if (changes === 0) throw notFound('Report non trovato');
    res.json({ success: true, message: 'Report eliminato' });
}));

// GET /api/body-composition/my-reports
router.get('/my-reports', authenticateToken, route(async (req, res) => {
    const rows = await db.query(
        `SELECT id, measurement_date, uploaded_at, original_name, file_size, parsed_data
         FROM body_composition_reports WHERE user_id = ? ORDER BY uploaded_at DESC`,
        [req.user.userId]
    );
    res.json({
        success: true,
        data: rows.map((r) => ({
            id: r.id, measurementDate: r.measurement_date, uploadedAt: r.uploaded_at,
            originalName: r.original_name, fileSize: r.file_size,
            parsedData: r.parsed_data ? JSON.parse(r.parsed_data) : null,
        })),
    });
}));

// GET /api/body-composition/download/:reportId — own reports; the admin any
router.get('/download/:reportId', authenticateToken, route(async (req, res) => {
    const report = await db.get(
        'SELECT user_id, file_data, original_name FROM body_composition_reports WHERE id = ?',
        [id(req.params.reportId, 'report ID')]
    );
    if (!report) throw notFound('Report non trovato');
    if (!isAdmin(req.user) && report.user_id !== req.user.userId) throw forbidden('Accesso negato');

    const file = Buffer.from(report.file_data, 'base64');
    res.set({
        'Content-Type': MIME_BY_EXTENSION[path.extname(report.original_name || '').toLowerCase()] || 'application/octet-stream',
        'Content-Disposition': attachment(report.original_name),
        'Content-Length': file.length,
    });
    res.send(file);
}));

module.exports = router;
