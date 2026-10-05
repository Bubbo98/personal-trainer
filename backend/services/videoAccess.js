const { db } = require('../utils/database');

/**
 * A client may watch a video when user_video_permissions has an active row for it.
 * Videos put in a training day are granted automatically; when a video leaves
 * the user's last day, its access is revoked.
 *
 * Every function takes an optional executor (`tx` from db.transaction) so it
 * can run inside the caller's transaction.
 */

/** Activates (or creates) the permission. Returns true when access was added. */
async function grantAccess(userId, videoId, grantedBy, exec = db) {
    const permission = await exec.get(
        'SELECT id, is_active FROM user_video_permissions WHERE user_id = ? AND video_id = ?',
        [userId, videoId]
    );
    if (!permission) {
        await exec.run(
            'INSERT INTO user_video_permissions (user_id, video_id, granted_by, is_active) VALUES (?, ?, ?, 1)',
            [userId, videoId, grantedBy]
        );
        return true;
    }
    if (!Number(permission.is_active)) {
        await exec.run('UPDATE user_video_permissions SET is_active = 1 WHERE id = ?', [permission.id]);
        return true;
    }
    return false;
}

/** Revokes access to those videos that are no longer in any of the user's days. */
async function revokeUnusedAccess(userId, videoIds, exec = db) {
    const ids = [...new Set(videoIds.map(Number))];
    if (ids.length === 0) return 0;
    const result = await exec.run(
        `UPDATE user_video_permissions SET is_active = 0
         WHERE user_id = ? AND is_active = 1 AND video_id IN (${ids.map(() => '?').join(',')})
           AND video_id NOT IN (
               SELECT tdv.video_id FROM training_day_videos tdv
               JOIN user_training_days td ON td.id = tdv.training_day_id
               WHERE td.user_id = ? AND tdv.is_active = 1
           )`,
        [userId, ...ids, userId]
    );
    return result.changes;
}

module.exports = { grantAccess, revokeUnusedAccess };
