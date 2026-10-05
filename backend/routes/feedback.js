const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { route, id, badRequest, notFound } = require('../utils/http');
const { checkinStatusOf } = require('../services/checkins');
const { sendNewFeedbackNotification, sendTrainerSeenFeedbackNotification } = require('../services/emailService');

// Weekly checks ("feedback"): clients submit them, trainers read them
const router = express.Router();
const admin = [authenticateToken, requireAdmin];

const ANSWERS = {
    energyLevel: [['high', 'medium', 'low'], 'Valore non valido per il livello di energia'],
    workoutsCompleted: [['all', 'almost_all', 'few_or_none'], 'Valore non valido per gli allenamenti completati'],
    mealPlanFollowed: [['completely', 'mostly', 'sometimes', 'no'], 'Valore non valido per il piano alimentare'],
    sleepQuality: [['excellent', 'good', 'fair', 'poor'], 'Valore non valido per la qualita del sonno'],
    physicalDiscomfort: [['none', 'minor', 'significant'], 'Valore non valido per i fastidi fisici'],
    motivationLevel: [['very_high', 'good', 'medium', 'low'], 'Valore non valido per il livello di motivazione'],
};

/** Feedbacks of clients of a trainer (trainer 1 also owns clients without a trainer). */
const TRAINER_FILTER = '(u.trainer_id = ? OR (u.trainer_id IS NULL AND ? = 1))';

function filters({ trainerId, search, discomfort }, latestOnly) {
    const conds = [];
    const params = [];
    if (trainerId) {
        conds.push(TRAINER_FILTER);
        params.push(trainerId, trainerId);
    }
    if (search) {
        conds.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
        params.push(...Array(4).fill(`%${search}%`));
    }
    // users-summary filters on the client's latest check, the list on each check
    const discomfortOf = latestOnly
        ? '(SELECT physical_discomfort FROM user_feedbacks WHERE user_id = u.id ORDER BY feedback_date DESC, created_at DESC LIMIT 1)'
        : 'f.physical_discomfort';
    if (discomfort === 'none') conds.push(`${discomfortOf} = 'none'`);
    else if (discomfort === 'has_issues') conds.push(`${discomfortOf} != 'none'`);
    return { conds, params };
}

function listQuery(query, defaultLimit) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || defaultLimit;
    return {
        trainerId: query.trainerId ? parseInt(query.trainerId, 10) : null,
        page,
        limit,
        offset: (page - 1) * limit,
        search: (query.search || '').trim(),
        discomfort: query.discomfort || 'all',
    };
}

// ─── Client ──────────────────────────────────────────────────────────────────

// GET /api/feedback/my-feedbacks
router.get('/my-feedbacks', authenticateToken, route(async (req, res) => {
    const feedbacks = await db.query('SELECT * FROM user_feedbacks WHERE user_id = ? ORDER BY feedback_date DESC', [req.user.userId]);
    res.json({ success: true, data: { feedbacks } });
}));

// GET /api/feedback/should-show — see services/checkins
router.get('/should-show', authenticateToken, route(async (req, res) => {
    res.json({ success: true, data: await checkinStatusOf(req.user.userId) });
}));

// POST /api/feedback — submits a weekly check (the admin is notified by email)
router.post('/', authenticateToken, route(async (req, res) => {
    const b = req.body;
    if (!b.firstName || !b.lastName) throw badRequest('Nome e cognome sono obbligatori');
    for (const [field, [allowed, message]] of Object.entries(ANSWERS)) {
        if (!allowed.includes(b[field])) throw badRequest(message);
    }
    let weight = null;
    if (b.currentWeight !== undefined && b.currentWeight !== null && b.currentWeight !== '') {
        weight = parseFloat(b.currentWeight);
        if (Number.isNaN(weight) || weight < 20 || weight > 300) throw badRequest('Peso non valido (deve essere tra 20 e 300 kg)');
    }
    const zones = (list) => (Array.isArray(list) && list.length > 0 ? JSON.stringify(list) : null);

    const userId = req.user.userId;
    // The plan version the check refers to (drives the check-in schedule)
    const pdf = await db.get('SELECT updated_at FROM user_pdf_files WHERE user_id = ?', [userId]);
    const { lastId } = await db.run(
        `INSERT INTO user_feedbacks (
            user_id, first_name, last_name, email, feedback_date,
            energy_level, workouts_completed, meal_plan_followed, sleep_quality, physical_discomfort,
            discomfort_details, motivation_level, weekly_highlights, current_weight,
            muscular_zones, muscular_notes, articular_zones, articular_notes, pdf_change_date
         ) VALUES (?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, b.firstName, b.lastName, b.email || '',
            b.energyLevel, b.workoutsCompleted, b.mealPlanFollowed, b.sleepQuality, b.physicalDiscomfort,
            b.discomfortDetails || null, b.motivationLevel, b.weeklyHighlights || null, weight,
            zones(b.muscularZones), b.muscularNotes || null, zones(b.articularZones), b.articularNotes || null,
            pdf ? pdf.updated_at : null]
    );

    const feedback = await db.get(
        `SELECT f.*, u.trainer_id, t.name AS trainer_name
         FROM user_feedbacks f JOIN users u ON u.id = f.user_id LEFT JOIN trainers t ON t.id = u.trainer_id
         WHERE f.id = ?`,
        [lastId]
    );
    sendNewFeedbackNotification(feedback, feedback.trainer_name || 'Joshua')
        .catch((err) => console.error('Failed to send admin notification email:', err));

    res.status(201).json({ success: true, message: 'Check submitted successfully', data: { feedback } });
}));

// GET /api/feedback/trainer-seen-notification — "your trainer read your check" notices not dismissed yet
router.get('/trainer-seen-notification', authenticateToken, route(async (req, res) => {
    const notifications = await db.query(
        `SELECT id, feedback_date, trainer_seen_at FROM user_feedbacks
         WHERE user_id = ? AND trainer_seen_at IS NOT NULL AND user_dismissed_trainer_seen = 0
         ORDER BY trainer_seen_at DESC`,
        [req.user.userId]
    );
    res.json({ success: true, data: { notifications } });
}));

// POST /api/feedback/dismiss-trainer-seen
router.post('/dismiss-trainer-seen', authenticateToken, route(async (req, res) => {
    await db.run(
        `UPDATE user_feedbacks SET user_dismissed_trainer_seen = 1
         WHERE user_id = ? AND trainer_seen_at IS NOT NULL AND user_dismissed_trainer_seen = 0`,
        [req.user.userId]
    );
    res.json({ success: true });
}));

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /api/feedback/admin/unread-count[?trainerId]
router.get('/admin/unread-count', admin, route(async (req, res) => {
    const trainerId = req.query.trainerId ? parseInt(req.query.trainerId, 10) : null;
    const row = trainerId
        ? await db.get(
            `SELECT COUNT(*) AS count FROM user_feedbacks f JOIN users u ON u.id = f.user_id
             WHERE f.trainer_seen_at IS NULL AND ${TRAINER_FILTER}`,
            [trainerId, trainerId]
        )
        : await db.get('SELECT COUNT(*) AS count FROM user_feedbacks WHERE trainer_seen_at IS NULL');
    res.json({ success: true, data: { unreadCount: row.count } });
}));

// POST /api/feedback/admin/mark-seen — marks every unseen check (of a trainer) as seen; no emails
router.post('/admin/mark-seen', admin, route(async (req, res) => {
    const { trainerId } = req.body;
    if (trainerId) {
        await db.run(
            `UPDATE user_feedbacks SET trainer_seen_at = CURRENT_TIMESTAMP
             WHERE trainer_seen_at IS NULL
               AND user_id IN (SELECT id FROM users u WHERE ${TRAINER_FILTER})`,
            [trainerId, trainerId]
        );
    } else {
        await db.run('UPDATE user_feedbacks SET trainer_seen_at = CURRENT_TIMESTAMP WHERE trainer_seen_at IS NULL');
    }
    res.json({ success: true });
}));

// POST /api/feedback/admin/:feedbackId/mark-seen — marks one check as seen and emails the client
router.post('/admin/:feedbackId/mark-seen', admin, route(async (req, res) => {
    const feedback = await db.get(
        `SELECT f.id, f.trainer_seen_at, f.feedback_date, u.email AS user_email, u.first_name AS user_first_name,
                t.name AS trainer_name
         FROM user_feedbacks f JOIN users u ON u.id = f.user_id LEFT JOIN trainers t ON t.id = u.trainer_id
         WHERE f.id = ?`,
        [id(req.params.feedbackId, 'feedback ID')]
    );
    if (!feedback) throw notFound('Feedback not found');
    if (feedback.trainer_seen_at) return res.json({ success: true }); // already seen: no second email

    await db.run('UPDATE user_feedbacks SET trainer_seen_at = CURRENT_TIMESTAMP WHERE id = ? AND trainer_seen_at IS NULL', [feedback.id]);
    if (feedback.user_email) {
        sendTrainerSeenFeedbackNotification(
            feedback.user_email,
            feedback.user_first_name || 'Utente',
            feedback.trainer_name || 'Il tuo PT',
            feedback.feedback_date
        ).catch((err) => console.error('Failed to send trainer-seen email:', err));
    }
    res.json({ success: true });
}));

// GET /api/feedback/admin/all — paginated checks; stats use the trainer filter only
// Query: trainerId, page, limit (20), search, discomfort ('all' | 'none' | 'has_issues')
router.get('/admin/all', admin, route(async (req, res) => {
    const q = listQuery(req.query, 20);
    const trainer = filters({ trainerId: q.trainerId }, false);
    const full = filters(q, false);
    const where = (conds) => (conds.length ? `WHERE ${conds.join(' AND ')}` : '');

    const [stats, count, feedbacks] = await Promise.all([
        db.get(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN f.physical_discomfort != 'none' THEN 1 ELSE 0 END) AS with_discomfort,
                    SUM(CASE WHEN f.motivation_level = 'low' THEN 1 ELSE 0 END) AS low_motivation,
                    SUM(CASE WHEN f.workouts_completed = 'few_or_none' THEN 1 ELSE 0 END) AS missed_workouts
             FROM user_feedbacks f JOIN users u ON u.id = f.user_id ${where(trainer.conds)}`,
            trainer.params
        ),
        db.get(`SELECT COUNT(*) AS count FROM user_feedbacks f JOIN users u ON u.id = f.user_id ${where(full.conds)}`, full.params),
        db.query(
            `SELECT f.*, u.username, u.first_name AS user_first_name, u.last_name AS user_last_name, u.trainer_id,
                    CASE WHEN f.pdf_change_date IS NULL THEN 0 ELSE (
                        (SELECT f2.id FROM user_feedbacks f2
                         WHERE f2.user_id = f.user_id AND f2.pdf_change_date = f.pdf_change_date
                         ORDER BY f2.feedback_date, f2.created_at LIMIT 1) = f.id
                    ) END AS is_first_of_scheda
             FROM user_feedbacks f JOIN users u ON u.id = f.user_id
             ${where(full.conds)}
             ORDER BY f.feedback_date DESC, f.created_at DESC
             LIMIT ? OFFSET ?`,
            [...full.params, q.limit, q.offset]
        ),
    ]);

    const total = count.count || 0;
    res.json({
        success: true,
        data: {
            feedbacks,
            total,
            page: q.page,
            totalPages: Math.max(1, Math.ceil(total / q.limit)),
            limit: q.limit,
            stats: {
                total: stats.total || 0,
                withDiscomfort: stats.with_discomfort || 0,
                lowMotivation: stats.low_motivation || 0,
                missedWorkouts: stats.missed_workouts || 0,
            },
        },
    });
}));

// GET /api/feedback/admin/users-summary — clients with checks and their latest answers
// Query: trainerId, page, limit (15), search, discomfort (on the latest check)
router.get('/admin/users-summary', admin, route(async (req, res) => {
    const q = listQuery(req.query, 15);
    const { conds, params } = filters(q, true);
    const where = `WHERE EXISTS (SELECT 1 FROM user_feedbacks WHERE user_id = u.id)${conds.map((c) => ` AND ${c}`).join('')}`;
    const latest = (column) =>
        `(SELECT ${column} FROM user_feedbacks WHERE user_id = u.id ORDER BY feedback_date DESC, created_at DESC LIMIT 1)`;

    const [count, users] = await Promise.all([
        db.get(`SELECT COUNT(*) AS count FROM users u ${where}`, params),
        db.query(
            `SELECT u.id AS user_id, u.username, u.first_name, u.last_name, u.email,
                    COUNT(f.id) AS total_feedbacks, MAX(f.feedback_date) AS last_feedback_date,
                    ${latest('energy_level')} AS last_energy_level,
                    ${latest('motivation_level')} AS last_motivation_level,
                    ${latest('physical_discomfort')} AS last_physical_discomfort,
                    ${latest('current_weight')} AS last_current_weight
             FROM users u JOIN user_feedbacks f ON f.user_id = u.id
             ${where}
             GROUP BY u.id
             ORDER BY MAX(f.feedback_date) DESC
             LIMIT ? OFFSET ?`,
            [...params, q.limit, q.offset]
        ),
    ]);

    const total = count.count || 0;
    res.json({ success: true, data: { users, total, page: q.page, totalPages: Math.max(1, Math.ceil(total / q.limit)) } });
}));

// GET /api/feedback/admin/user/:userId
router.get('/admin/user/:userId', admin, route(async (req, res) => {
    const feedbacks = await db.query(
        'SELECT * FROM user_feedbacks WHERE user_id = ? ORDER BY feedback_date DESC, created_at DESC',
        [id(req.params.userId, 'user ID')]
    );
    res.json({ success: true, data: { feedbacks } });
}));

// DELETE /api/feedback/:feedbackId (admin)
router.delete('/:feedbackId', admin, route(async (req, res) => {
    const { changes } = await db.run('DELETE FROM user_feedbacks WHERE id = ?', [id(req.params.feedbackId, 'feedback ID')]);
    if (changes === 0) throw notFound('Feedback not found');
    res.json({ success: true, message: 'Feedback deleted successfully' });
}));

module.exports = router;
