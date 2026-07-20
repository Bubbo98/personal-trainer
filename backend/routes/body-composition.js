'use strict';

const express = require('express');
const multer = require('multer');
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { parseBodyCompositionPDF } = require('../services/bodyCompositionParser');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Solo file PDF'), false);
    },
    limits: { fileSize: 20 * 1024 * 1024 },
});

// ── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/body-composition/admin/upload/:userId
router.post('/admin/upload/:userId', authenticateToken, requireAdmin, upload.single('pdf'), async (req, res) => {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: 'Nessun file PDF' });

    try {
        const parsedData = await parseBodyCompositionPDF(req.file.buffer);
        const fileData = req.file.buffer.toString('base64');
        const measurementDate = parsedData.header?.dataRilevazione || null;

        const db = createDatabase();

        // Verify user exists
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
                 req.file.size, fileData, JSON.stringify(parsedData)],
                function(e) { if (e) reject(e); else resolve(this); }
            );
        });

        db.close();
        console.log(`Admin ${req.user.username} uploaded body composition report for user ${userId}`);
        res.status(201).json({
            success: true,
            message: 'Report caricato e analizzato',
            data: { id: result.lastID, measurementDate, parsedData },
        });
    } catch (error) {
        console.error('Body composition upload error:', error);
        res.status(500).json({ success: false, error: error.message || 'Errore del server' });
    }
});

// GET /api/body-composition/admin/:userId  — list all reports (no file_data)
router.get('/admin/:userId', authenticateToken, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const db = createDatabase();
    try {
        const rows = await new Promise((resolve, reject) => {
            db.allCallback(
                `SELECT id, user_id, measurement_date, uploaded_at, uploaded_by, original_name, file_size, parsed_data
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
                parsedData: r.parsed_data ? JSON.parse(r.parsed_data) : null,
            })),
        });
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: 'Database error' });
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

// GET /api/body-composition/my-reports  — user reads their own reports
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

// GET /api/body-composition/download/:reportId  — download original PDF
router.get('/download/:reportId', authenticateToken, async (req, res) => {
    const { reportId } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${row.original_name}"`);
        res.setHeader('Content-Length', buf.length);
        res.send(buf);
    } catch (e) {
        db.close();
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;
