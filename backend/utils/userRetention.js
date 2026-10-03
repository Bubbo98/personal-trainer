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

const ACCESS_GRACE_DAYS = 10;
const DELETE_AFTER_DAYS = 21;

const PLAN_EXPIRED_MESSAGE =
    'La tua scheda è scaduta da più di 10 giorni: contatta il tuo personal trainer per rinnovarla.';

const dbAll = (db, sql, params = []) =>
    new Promise((resolve, reject) => db.allCallback(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
const dbRun = (db, sql, params = []) =>
    new Promise((resolve, reject) => db.runCallback(sql, params, (err) => (err ? reject(err) : resolve())));

function protectedUserIds() {
    return (process.env.RETENTION_PROTECTED_USER_IDS || '165')
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
}

/** True when the user's plan expired more than ACCESS_GRACE_DAYS ago. */
async function isAccessExpired(db, userId) {
    if (protectedUserIds().includes(Number(userId))) return false;
    const rows = await dbAll(db,
        `SELECT 1 FROM user_pdf_files
         WHERE user_id = ? AND expiration_date IS NOT NULL
           AND expiration_date < datetime('now', ?)`,
        [userId, `-${ACCESS_GRACE_DAYS} days`]);
    return rows.length > 0;
}

/** Users to delete: deactivated, or plan expired more than DELETE_AFTER_DAYS ago. */
async function findUsersToDelete(db) {
    const protectedIds = protectedUserIds();
    const rows = await dbAll(db,
        `SELECT u.id, u.username, u.first_name, u.last_name, u.is_active, p.expiration_date
         FROM users u
         LEFT JOIN user_pdf_files p ON p.user_id = u.id
         WHERE u.username <> ?
           AND (u.is_active = 0
                OR (p.expiration_date IS NOT NULL AND p.expiration_date < datetime('now', ?)))
         ORDER BY u.id`,
        [process.env.ADMIN_USERNAME || 'admin', `-${DELETE_AFTER_DAYS} days`]);
    return rows.filter((u) => !protectedIds.includes(u.id));
}

/** Deletes a user and every row that belongs to them (children first). */
async function deleteUserCompletely(db, userId) {
    const dayIds = `SELECT id FROM user_training_days WHERE user_id = ?`;
    const dayVideoIds = `SELECT id FROM training_day_videos WHERE training_day_id IN (${dayIds})`;

    await dbRun(db, `DELETE FROM training_day_video_techniques WHERE training_day_video_id IN (${dayVideoIds})`, [userId]);
    await dbRun(db, `DELETE FROM training_day_videos WHERE training_day_id IN (${dayIds})`, [userId]);
    for (const table of [
        'user_training_days',
        'exercise_logs',
        'training_exercises',
        'user_video_permissions',
        'user_pdf_files',
        'user_feedbacks',
        'body_composition_reports',
        'reviews',
        'access_logs',
    ]) {
        await dbRun(db, `DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }
    await dbRun(db, 'DELETE FROM users WHERE id = ?', [userId]);
}

module.exports = {
    ACCESS_GRACE_DAYS,
    DELETE_AFTER_DAYS,
    PLAN_EXPIRED_MESSAGE,
    isAccessExpired,
    findUsersToDelete,
    deleteUserCompletely,
};
