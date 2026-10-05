/**
 * Client retention rules, based on the expiration date of the client's plan (PDF):
 *   - ACCESS_GRACE_DAYS after expiry the client's link stops working;
 *   - DELETE_AFTER_DAYS after expiry the client is deleted with all their data.
 * Deactivated clients are deleted too. Uploading a new plan moves the
 * expiration date forward, which restores access automatically.
 *
 * Never touched: the admin account (ADMIN_USERNAME) and the user ids listed in
 * RETENTION_PROTECTED_USER_IDS (comma separated, default "165" = Test User).
 */
const config = require('../config');
const { db } = require('./database');
const { deleteFiles } = require('../services/storedFiles');

const ACCESS_GRACE_DAYS = 10;
const DELETE_AFTER_DAYS = 21;

const PLAN_EXPIRED_MESSAGE =
    'La tua scheda è scaduta da più di 10 giorni: contatta il tuo personal trainer per rinnovarla.';

/** True when the user's plan expired more than ACCESS_GRACE_DAYS ago. */
async function isAccessExpired(userId) {
    if (config.retentionProtectedUserIds.includes(Number(userId))) return false;
    const row = await db.get(
        `SELECT 1 FROM user_pdf_files
         WHERE user_id = ? AND expiration_date IS NOT NULL AND expiration_date < datetime('now', ?)`,
        [userId, `-${ACCESS_GRACE_DAYS} days`]
    );
    return !!row;
}

/** Users to delete: deactivated, or plan expired more than DELETE_AFTER_DAYS ago. */
async function findUsersToDelete() {
    const rows = await db.query(
        `SELECT u.id, u.username, u.first_name, u.last_name, u.is_active, p.expiration_date
         FROM users u
         LEFT JOIN user_pdf_files p ON p.user_id = u.id
         WHERE u.username <> ?
           AND (u.is_active = 0 OR (p.expiration_date IS NOT NULL AND p.expiration_date < datetime('now', ?)))
         ORDER BY u.id`,
        [config.adminUsername, `-${DELETE_AFTER_DAYS} days`]
    );
    return rows.filter((u) => !config.retentionProtectedUserIds.includes(u.id));
}

/** Deletes a user and every row that belongs to them (one transaction, children first), then their files on R2. */
async function deleteUserCompletely(userId) {
    const files = await db.query(
        `SELECT file_key FROM user_pdf_files WHERE user_id = ? AND file_key IS NOT NULL
         UNION ALL
         SELECT file_key FROM body_composition_reports WHERE user_id = ? AND file_key IS NOT NULL`,
        [userId, userId]
    );
    const dayIds = 'SELECT id FROM user_training_days WHERE user_id = ?';
    const tables = [
        'user_training_days', 'exercise_logs', 'training_exercises', 'user_video_permissions', 'user_pdf_files',
        'user_feedbacks', 'body_composition_reports', 'reviews', 'access_logs',
    ];
    await db.batch([
        {
            sql: `DELETE FROM training_day_video_techniques
                  WHERE training_day_video_id IN (SELECT id FROM training_day_videos WHERE training_day_id IN (${dayIds}))`,
            params: [userId],
        },
        { sql: `DELETE FROM training_day_videos WHERE training_day_id IN (${dayIds})`, params: [userId] },
        ...tables.map((table) => ({ sql: `DELETE FROM ${table} WHERE user_id = ?`, params: [userId] })),
        { sql: 'DELETE FROM users WHERE id = ?', params: [userId] },
    ]);
    await deleteFiles(files.map((f) => f.file_key));
}

module.exports = {
    ACCESS_GRACE_DAYS,
    DELETE_AFTER_DAYS,
    PLAN_EXPIRED_MESSAGE,
    isAccessExpired,
    findUsersToDelete,
    deleteUserCompletely,
};
