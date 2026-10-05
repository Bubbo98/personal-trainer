const { db } = require('../utils/database');
const { signedUrlOrNull } = require('../utils/r2');

/**
 * A user's training days, each with its videos (in order) and every video's
 * techniques. Three queries whatever the number of days.
 *
 * @param {number} userId
 * @param {{ signed?: boolean }} options  signed: add signedUrl to videos and techniques (client view)
 */
async function loadDaysWithVideos(userId, { signed = false } = {}) {
    const [days, videos, techniques] = await Promise.all([
        db.query(
            `SELECT id, user_id, day_number, day_name, created_at, updated_at
             FROM user_training_days WHERE user_id = ? AND is_active = 1
             ORDER BY day_number`,
            [userId]
        ),
        db.query(
            `SELECT tdv.training_day_id, tdv.id AS assignment_id, tdv.order_index, tdv.added_at,
                    tdv.group_id, tdv.group_label, tdv.exercise_id,
                    v.id, v.title, v.description, v.file_path, v.duration, v.thumbnail_path, v.thumbnail_key, v.category
             FROM training_day_videos tdv
             JOIN user_training_days td ON td.id = tdv.training_day_id
             JOIN videos v ON v.id = tdv.video_id AND v.is_active = 1
             WHERE td.user_id = ? AND td.is_active = 1 AND tdv.is_active = 1
             ORDER BY tdv.training_day_id, tdv.order_index`,
            [userId]
        ),
        db.query(
            `SELECT tdvt.training_day_video_id, t.id, t.title, t.description, t.file_path, t.thumbnail_path, t.thumbnail_key
             FROM training_day_video_techniques tdvt
             JOIN training_day_videos tdv ON tdv.id = tdvt.training_day_video_id
             JOIN user_training_days td ON td.id = tdv.training_day_id
             JOIN videos t ON t.id = tdvt.technique_id AND t.is_active = 1
             WHERE td.user_id = ?
             ORDER BY tdvt.training_day_video_id, tdvt.order_index`,
            [userId]
        ),
    ]);

    const techniquesByAssignment = groupBy(await Promise.all(techniques.map(async (t) => ({
        assignmentId: t.training_day_video_id,
        id: t.id,
        title: t.title,
        description: t.description,
        ...(signed ? { signedUrl: await signedUrlOrNull(t.file_path) } : { filePath: t.file_path }),
        thumbnailPath: t.thumbnail_path,
        thumbnailKey: t.thumbnail_key || null,
    }))), (t) => t.assignmentId);

    const videosByDay = groupBy(await Promise.all(videos.map(async (v) => ({
        dayId: v.training_day_id,
        assignmentId: v.assignment_id,
        orderIndex: v.order_index,
        addedAt: v.added_at,
        id: v.id,
        title: v.title,
        description: v.description,
        filePath: v.file_path,
        ...(signed ? { signedUrl: await signedUrlOrNull(v.file_path) } : {}),
        duration: v.duration,
        thumbnailPath: v.thumbnail_path,
        thumbnailKey: v.thumbnail_key || null,
        category: v.category,
        groupId: v.group_id || null,
        groupLabel: v.group_label || null,
        // Training-plan exercise this video belongs to (null = extra video of the day)
        exerciseId: v.exercise_id || null,
        techniques: (techniquesByAssignment.get(v.assignment_id) || []).map(({ assignmentId, ...t }) => t),
    }))), (v) => v.dayId);

    return days.map((day) => ({
        id: day.id,
        userId: day.user_id,
        dayNumber: day.day_number,
        dayName: day.day_name,
        createdAt: day.created_at,
        updatedAt: day.updated_at,
        videos: (videosByDay.get(day.id) || []).map(({ dayId, ...v }) => v),
    }));
}

function groupBy(items, keyOf) {
    const map = new Map();
    for (const item of items) {
        const key = keyOf(item);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    }
    return map;
}

module.exports = { loadDaysWithVideos };
