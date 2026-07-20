'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { parseBodyCompositionPDF, parseBodyCompositionText } = require('../services/bodyCompositionParser');
const { extractTextFromImage } = require('../services/ocrService');

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

// Extract the first embedded JPEG or PNG from an image-based PDF binary
function extractImageFromPdfBuffer(buf) {
    // JPEG: FF D8 FF ... FF D9
    let start = -1;
    for (let i = 0; i < buf.length - 2; i++) {
        if (buf[i] === 0xFF && buf[i + 1] === 0xD8 && buf[i + 2] === 0xFF) { start = i; break; }
    }
    if (start >= 0) {
        for (let i = buf.length - 2; i >= start; i--) {
            if (buf[i] === 0xFF && buf[i + 1] === 0xD9) return buf.slice(start, i + 2);
        }
    }
    // PNG: 89 50 4E 47
    for (let i = 0; i < buf.length - 8; i++) {
        if (buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4E && buf[i + 3] === 0x47) {
            // PNG ends with IEND chunk: 49 45 4E 44 AE 42 60 82
            for (let j = buf.length - 8; j >= i; j--) {
                if (buf[j] === 0x49 && buf[j + 1] === 0x45 && buf[j + 2] === 0x4E && buf[j + 3] === 0x44) {
                    return buf.slice(i, j + 8);
                }
            }
        }
    }
    return null;
}

// ── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/body-composition/admin/upload/:userId
router.post('/admin/upload/:userId', authenticateToken, requireAdmin, upload.single('pdf'), async (req, res) => {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: 'Nessun file' });

    const measurementDate = req.body.measurementDate || null;
    const fileData = req.file.buffer.toString('base64');
    const isPdf = req.file.mimetype === 'application/pdf';

    // For PDFs with a text layer, parse synchronously (fast). For all image-based
    // files (images or image PDFs), save immediately and run OCR in background.
    let parsedDataSync = null;
    let needsOcr = false;
    let ocrBuffer = null;

    if (isPdf) {
        try {
            const pdfResult = await parseBodyCompositionPDF(req.file.buffer);
            if (pdfResult.rawTextLength > 50) {
                parsedDataSync = pdfResult;
            } else {
                // Image-based PDF: will OCR the embedded image in background
                ocrBuffer = extractImageFromPdfBuffer(req.file.buffer);
                needsOcr = !!ocrBuffer;
            }
        } catch (parseErr) {
            console.warn('PDF parsing failed:', parseErr.message);
        }
    } else {
        // Image upload: OCR in background
        ocrBuffer = req.file.buffer;
        needsOcr = true;
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
                 req.file.size, fileData, parsedDataSync ? JSON.stringify(parsedDataSync) : null],
                function(e) { if (e) reject(e); else resolve(this); }
            );
        });

        const newId = result.lastID;
        db.close();

        // Respond immediately — don't make the admin wait for OCR
        res.status(201).json({
            success: true,
            message: 'Report caricato',
            data: { id: newId, measurementDate, parsingInProgress: needsOcr },
        });

        // Run OCR in background and update the row when done
        if (needsOcr && ocrBuffer) {
            setImmediate(async () => {
                try {
                    console.log(`Background OCR started for report ${newId}...`);
                    const text = await extractTextFromImage(ocrBuffer);
                    const parsed = parseBodyCompositionText(text);
                    const dbBg = createDatabase();
                    await new Promise((resolve, reject) => {
                        dbBg.runCallback(
                            'UPDATE body_composition_reports SET parsed_data = ? WHERE id = ?',
                            [JSON.stringify(parsed), newId],
                            function(e) { if (e) reject(e); else resolve(this); }
                        );
                    });
                    dbBg.close();
                    console.log(`Background OCR complete for report ${newId}, text length: ${text.length}`);
                } catch (e) {
                    console.error(`Background OCR failed for report ${newId}:`, e.message);
                }
            });
        }
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
