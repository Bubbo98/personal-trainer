const express = require('express');
const pdfParse = require('pdf-parse');
const { db } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { route, id, badRequest, forbidden, notFound } = require('../utils/http');
const { parsePdfText } = require('../services/planParser');
const { readFile } = require('../services/storedFiles');
const { loadLinks, saveLinks } = require('../services/exerciseLinks');

// Training plan (exercises), weekly weight logs, exercise ↔ video links
const router = express.Router();
const admin = [authenticateToken, requireAdmin];

// ─── Admin: plan ─────────────────────────────────────────────────────────────

// POST /api/workout/admin/parse-pdf/:userId — proposes days/exercises from the user's PDF (nothing saved)
router.post('/admin/parse-pdf/:userId', admin, route(async (req, res) => {
    const pdf = await db.get('SELECT file_key, file_data FROM user_pdf_files WHERE user_id = ?', [id(req.params.userId, 'user ID')]);
    if (!pdf || (!pdf.file_key && !pdf.file_data)) throw notFound('No PDF found for this user');
    const { text } = await pdfParse(await readFile(pdf));
    res.json({ success: true, data: { days: parsePdfText(text) } });
}));

// GET /api/workout/admin/plan/:userId
router.get('/admin/plan/:userId', admin, route(async (req, res) => {
    const exercises = await db.query(
        'SELECT * FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index',
        [id(req.params.userId, 'user ID')]
    );
    res.json({ success: true, data: { exercises } });
}));

// POST /api/workout/admin/plan/:userId — saves the whole plan in one transaction
// Body: { days: [{ dayNumber, dayName, exercises: [{ id?, name, sets, reps, rest, notes, weightSlots }] }] }
// Exercises with an existing id are updated in place (their weight logs and video
// links survive the edit), new ones are inserted, missing ones are deleted: their
// videos are unlinked and their logs stay in the history (exercise_id → NULL).
// A freshly parsed PDF has no ids, so it replaces the whole plan.
router.post('/admin/plan/:userId', admin, route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    const { days } = req.body;
    if (!Array.isArray(days)) throw badRequest('days must be an array');

    const existing = new Set((await db.query('SELECT id FROM training_exercises WHERE user_id = ?', [userId])).map((e) => e.id));
    const statements = [];
    const kept = new Set();

    for (const day of days) {
        (day.exercises || []).forEach((ex, orderIndex) => {
            const values = [day.dayNumber, day.dayName || `Giorno ${day.dayNumber}`, orderIndex,
                ex.name, ex.sets || '', ex.reps || '', ex.rest || '', ex.notes || '',
                ex.weightSlots || ex.weight_slots || 1];
            if (ex.id && existing.has(ex.id)) {
                kept.add(ex.id);
                statements.push({
                    sql: `UPDATE training_exercises SET day_number = ?, day_name = ?, order_index = ?, name = ?, sets = ?,
                            reps = ?, rest = ?, notes = ?, weight_slots = ? WHERE id = ? AND user_id = ?`,
                    params: [...values, ex.id, userId],
                });
            } else {
                statements.push({
                    sql: `INSERT INTO training_exercises (user_id, day_number, day_name, order_index, name, sets, reps, rest, notes, weight_slots)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    params: [userId, ...values],
                });
            }
        });
    }

    const removed = [...existing].filter((exerciseId) => !kept.has(exerciseId));
    if (removed.length > 0) {
        const placeholders = removed.map(() => '?').join(',');
        statements.push(
            { sql: `UPDATE training_day_videos SET exercise_id = NULL WHERE exercise_id IN (${placeholders})`, params: removed },
            { sql: `DELETE FROM training_exercises WHERE user_id = ? AND id IN (${placeholders})`, params: [userId, ...removed] }
        );
    }

    await db.batch(statements);
    res.json({ success: true, message: 'Training plan saved' });
}));

// DELETE /api/workout/admin/plan/:userId — removes the plan; videos are unlinked, logs stay in the history
router.delete('/admin/plan/:userId', admin, route(async (req, res) => {
    const userId = id(req.params.userId, 'user ID');
    await db.batch([
        {
            sql: 'UPDATE training_day_videos SET exercise_id = NULL WHERE exercise_id IN (SELECT id FROM training_exercises WHERE user_id = ?)',
            params: [userId],
        },
        { sql: 'DELETE FROM training_exercises WHERE user_id = ?', params: [userId] },
    ]);
    res.json({ success: true, message: 'Training plan deleted' });
}));

// GET /api/workout/admin/logs/:userId — weight history; exercises gone from the plan use the log snapshots
router.get('/admin/logs/:userId', admin, route(async (req, res) => {
    const logs = await db.query(
        `SELECT el.*,
                COALESCE(te.name, el.exercise_name) AS exercise_name,
                COALESCE(te.day_number, el.day_number_snapshot) AS day_number,
                COALESCE(te.day_name, el.day_name_snapshot) AS day_name,
                te.sets AS planned_sets,
                te.reps AS planned_reps
         FROM exercise_logs el
         LEFT JOIN training_exercises te ON te.id = el.exercise_id
         WHERE el.user_id = ?
         ORDER BY el.week_start DESC, COALESCE(te.day_number, el.day_number_snapshot), COALESCE(te.order_index, 0)`,
        [id(req.params.userId, 'user ID')]
    );
    res.json({ success: true, data: { logs } });
}));

// ─── Admin: exercise ↔ video links ───────────────────────────────────────────

// GET /api/workout/admin/links/:userId — see services/exerciseLinks.loadLinks
router.get('/admin/links/:userId', admin, route(async (req, res) => {
    const days = await loadLinks(id(req.params.userId, 'user ID'));
    res.json({ success: true, data: { days } });
}));

// PUT /api/workout/admin/links/:userId — see services/exerciseLinks.saveLinks
router.put('/admin/links/:userId', admin, route(async (req, res) => {
    const { links, extras } = req.body;
    if (!Array.isArray(links) || (extras !== undefined && !Array.isArray(extras))) {
        throw badRequest('links (and extras) must be arrays');
    }
    const data = await saveLinks(id(req.params.userId, 'user ID'), { links, extras }, req.user.username || 'admin');
    res.json({ success: true, message: 'Links saved', data });
}));

// ─── Client ──────────────────────────────────────────────────────────────────

// GET /api/workout/plan
router.get('/plan', authenticateToken, route(async (req, res) => {
    const exercises = await db.query(
        'SELECT * FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index',
        [req.user.userId]
    );
    res.json({ success: true, data: { exercises } });
}));

// GET /api/workout/logs[?weekStart=YYYY-MM-DD]
router.get('/logs', authenticateToken, route(async (req, res) => {
    const { weekStart } = req.query;
    const logs = weekStart
        ? await db.query('SELECT * FROM exercise_logs WHERE user_id = ? AND week_start = ?', [req.user.userId, weekStart])
        : await db.query('SELECT * FROM exercise_logs WHERE user_id = ? ORDER BY week_start DESC', [req.user.userId]);
    res.json({ success: true, data: { logs } });
}));

// POST /api/workout/logs — upserts the week's log of one of the user's exercises
// Body: { exerciseId, weekStart, weight?, setsDone?, repsDone?, notes? }
router.post('/logs', authenticateToken, route(async (req, res) => {
    const userId = req.user.userId;
    const { exerciseId, weekStart, weight, setsDone, repsDone, notes } = req.body;
    if (!exerciseId || !weekStart) throw badRequest('exerciseId and weekStart are required');

    const exercise = await db.get(
        'SELECT id, name, day_number, day_name FROM training_exercises WHERE id = ? AND user_id = ?',
        [exerciseId, userId]
    );
    if (!exercise) throw forbidden('Exercise not found');

    // Name/day snapshots keep the history readable once the exercise leaves the plan
    await db.run(
        `INSERT INTO exercise_logs (user_id, exercise_id, week_start, weight, sets_done, reps_done, notes,
           exercise_name, day_number_snapshot, day_name_snapshot, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, exercise_id, week_start) DO UPDATE SET
           weight = excluded.weight,
           sets_done = excluded.sets_done,
           reps_done = excluded.reps_done,
           notes = excluded.notes,
           exercise_name = excluded.exercise_name,
           day_number_snapshot = excluded.day_number_snapshot,
           day_name_snapshot = excluded.day_name_snapshot,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, exerciseId, weekStart, weight || null, setsDone || null, repsDone || null, notes || null,
            exercise.name, exercise.day_number, exercise.day_name || `Giorno ${exercise.day_number}`]
    );
    res.json({ success: true, message: 'Log saved' });
}));

module.exports = router;
