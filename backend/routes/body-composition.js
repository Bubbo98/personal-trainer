'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { parseBodyCompositionPDF } = require('../services/bodyCompositionParser');

const router = express.Router();

const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (ACCEPTED_MIME.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Formato non supportato. Usa JPG, PNG, WEBP o PDF.'), false);
    },
    limits: { fileSize: 20 * 1024 * 1024 },
});

function mimeFromName(originalName) {
    const ext = path.extname(originalName || '').toLowerCase();
    const map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
        '.pdf': 'application/pdf',
    };
    return map[ext] || 'application/octet-stream';
}

// ── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/body-composition/admin/upload/:userId
router.post('/admin/upload/:userId', authenticateToken, requireAdmin, upload.single('pdf'), async (req, res) => {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: 'Nessun file' });

    const measurementDate = req.body.measurementDate || null;
    const fileData = req.file.buffer.toString('base64');
    const isPdf = req.file.mimetype === 'application/pdf';

    let parsedData = null;
    if (isPdf) {
        try {
            parsedData = await parseBodyCompositionPDF(req.file.buffer);
        } catch (parseErr) {
            console.warn('PDF parsing failed (storing raw):', parseErr.message);
        }
    }

    try {
        const db = createDatabase();

        const user = await new Promise((resolve, reject) => {
            db.getCallback('SELECT id FROM users WHERE id = ?', [userId], (e, r) => e ? reject(e) : resolve(r));
        });
        if (!user) { db.close(); return res.status(404).json({ success: false, error: 'Utente non trovato' }); }

        const result = await new Promise((resolve, reject) => {
            db.runCallback(
                `INSERT INTO body_composition_reports
                 (user_id, measurement_date, uploaded_by, original_name, file_size, file_data, parsed_data)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, measurementDate, req.user.username, req.file.originalname,
                 req.file.size, fileData, parsedData ? JSON.stringify(parsedData) : null],
                function(e) { if (e) reject(e); else resolve(this); }
            );
        });

        db.close();
        console.log(`Admin ${req.user.username} uploaded body composition report for user ${userId}`);
        res.status(201).json({
            success: true,
            message: 'Report caricato',
            data: { id: result.lastID, measurementDate },
        });
    } catch (error) {
        console.error('Body composition upload error:', error);
        res.status(500).json({ success: false, error: error.message || 'Errore del server' });
    }
});

// GET /api/body-composition/admin/:userId
router.get('/admin/:userId', authenticateToken, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const db = createDatabase();
    try {
        const rows = await new Promise((resolve, reject) => {
            db.allCallback(
                `SELECT id, user_id, measurement_date, uploaded_at, uploaded_by, original_name, file_size
                 FROM body_composition_reports WHERE user_id = ? ORDER BY uploaded_at DESC`,
                [userId], (e, r) => e ? reject(e) : resolve(r)
            );
        });
        db.close();
        res.json({
            success: true,
            data: rows.map(r => ({
                id: r.id, userId: r.user_id, measurementDate: r.measurement_date,
                uploadedAt: r.uploaded_at, uploadedBy: r.uploaded_by,
                originalName: r.original_name, fileSize: r.file_size,
            })),
        });
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// GET /api/body-composition/admin/debug/:reportId — returns raw PDF text + parsed result
router.get('/admin/debug/:reportId', authenticateToken, requireAdmin, async (req, res) => {
    const { reportId } = req.params;
    const db = createDatabase();
    try {
        const row = await new Promise((resolve, reject) => {
            db.getCallback(
                'SELECT file_data, original_name FROM body_composition_reports WHERE id = ?',
                [reportId], (e, r) => e ? reject(e) : resolve(r)
            );
        });
        db.close();
        if (!row) return res.status(404).json({ success: false, error: 'Not found' });

        const buf = Buffer.from(row.file_data, 'base64');
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buf);
        const parsed = await parseBodyCompositionPDF(buf).catch(e => ({ error: e.message }));
        res.json({ success: true, rawText: data.text, parsed });
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/body-composition/admin/report/:reportId
router.delete('/admin/report/:reportId', authenticateToken, requireAdmin, async (req, res) => {
    const { reportId } = req.params;
    const db = createDatabase();
    try {
        await new Promise((resolve, reject) => {
            db.runCallback('DELETE FROM body_composition_reports WHERE id = ?', [reportId],
                function(e) { if (e) reject(e); else resolve(this); });
        });
        db.close();
        res.json({ success: true, message: 'Report eliminato' });
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// ── USER ─────────────────────────────────────────────────────────────────────

// GET /api/body-composition/my-reports
router.get('/my-reports', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const db = createDatabase();
    try {
        const rows = await new Promise((resolve, reject) => {
            db.allCallback(
                `SELECT id, measurement_date, uploaded_at, original_name, file_size, parsed_data
                 FROM body_composition_reports WHERE user_id = ? ORDER BY uploaded_at DESC`,
                [userId], (e, r) => e ? reject(e) : resolve(r)
            );
        });
        db.close();
        res.json({
            success: true,
            data: rows.map(r => ({
                id: r.id, measurementDate: r.measurement_date,
                uploadedAt: r.uploaded_at, originalName: r.original_name,
                fileSize: r.file_size,
                parsedData: r.parsed_data ? JSON.parse(r.parsed_data) : null,
            })),
        });
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// GET /api/body-composition/download/:reportId
router.get('/download/:reportId', authenticateToken, async (req, res) => {
    const { reportId } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.username === (process.env.ADMIN_USERNAME || 'admin');
    const db = createDatabase();
    try {
        const row = await new Promise((resolve, reject) => {
            db.getCallback(
                'SELECT user_id, file_data, original_name FROM body_composition_reports WHERE id = ?',
                [reportId], (e, r) => e ? reject(e) : resolve(r)
            );
        });
        db.close();
        if (!row) return res.status(404).json({ success: false, error: 'Report non trovato' });
        if (!isAdmin && row.user_id !== userId) return res.status(403).json({ success: false, error: 'Accesso negato' });

        const buf = Buffer.from(row.file_data, 'base64');
        const mime = mimeFromName(row.original_name);
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${row.original_name}"`);
        res.setHeader('Content-Length', buf.length);
        res.send(buf);
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;
