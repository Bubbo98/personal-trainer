const { db } = require('../utils/database');

/**
 * Weekly check-in rule, shared by the client form (GET /api/feedback/should-show)
 * and the reminder emails (scripts/send-checkin-reminders.js):
 *   - exempt clients never get it;
 *   - first check 1 week after the plan (PDF) was uploaded/updated;
 *   - then every 2 weeks since the last check on that plan version.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_CHECK_AFTER_DAYS = 7;
const CHECK_EVERY_DAYS = 14;

/** SQLite CURRENT_TIMESTAMP values ("YYYY-MM-DD HH:MM:SS") are UTC without a zone marker. */
function parseDbDate(value) {
    if (!value) return null;
    const text = String(value);
    return new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text) ? `${text.replace(' ', 'T')}Z` : text);
}

/**
 * @param {{ checkin_exempt, pdf_updated_at, last_feedback_at }} row
 * @returns {{ shouldShow: boolean, reason?: string, pdfUpdatedAt?: string, lastFeedbackAt?: string }}
 */
function checkinStatus(row, now = new Date()) {
    if (row && Number(row.checkin_exempt)) return { shouldShow: false, reason: 'exempt' };
    const pdfUpdatedAt = parseDbDate(row && row.pdf_updated_at);
    if (!pdfUpdatedAt) return { shouldShow: false, reason: 'no_pdf' };

    if (now - pdfUpdatedAt < FIRST_CHECK_AFTER_DAYS * DAY_MS) {
        return { shouldShow: false, reason: 'too_soon', pdfUpdatedAt: pdfUpdatedAt.toISOString() };
    }
    const lastFeedbackAt = parseDbDate(row.last_feedback_at);
    if (lastFeedbackAt && now - lastFeedbackAt < CHECK_EVERY_DAYS * DAY_MS) {
        return {
            shouldShow: false,
            reason: 'too_soon_since_last',
            lastFeedbackAt: lastFeedbackAt.toISOString(),
            pdfUpdatedAt: pdfUpdatedAt.toISOString(),
        };
    }
    return { shouldShow: true, pdfUpdatedAt: pdfUpdatedAt.toISOString(), lastFeedbackAt: row.last_feedback_at || null };
}

/** Columns checkinStatus needs, plus contact data for reminders. */
const STATUS_QUERY = `
    SELECT u.id, u.username, u.first_name, u.checkin_exempt,
           COALESCE(t.name, 'Joshua') AS trainer_name,
           COALESCE(u.email, (SELECT f.email FROM user_feedbacks f WHERE f.user_id = u.id AND f.email <> ''
                              ORDER BY f.created_at DESC LIMIT 1)) AS email,
           upf.updated_at AS pdf_updated_at,
           (SELECT MAX(f.created_at) FROM user_feedbacks f
            WHERE f.user_id = u.id AND f.pdf_change_date = upf.updated_at) AS last_feedback_at
    FROM users u
    LEFT JOIN user_pdf_files upf ON upf.user_id = u.id
    LEFT JOIN trainers t ON t.id = u.trainer_id`;

/** Check-in status of one client. */
async function checkinStatusOf(userId) {
    return checkinStatus(await db.get(`${STATUS_QUERY} WHERE u.id = ?`, [userId]));
}

/** Active clients (not the admin) who are due a check and have an email to remind. */
async function clientsToRemind(now = new Date()) {
    const rows = await db.query(`${STATUS_QUERY} WHERE u.is_active = 1 AND u.username <> ?`, [process.env.ADMIN_USERNAME || 'admin']);
    return rows
        .filter((row) => row.email && checkinStatus(row, now).shouldShow)
        .map((row) => ({ userId: row.id, firstName: row.first_name || row.username, email: row.email, trainerName: row.trainer_name }));
}

module.exports = { checkinStatus, checkinStatusOf, clientsToRemind, parseDbDate };
