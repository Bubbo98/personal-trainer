const { db } = require('../utils/database');
const { prepareVideo, suggestLinks } = require('../utils/exerciseMatcher');
const { revokeUnusedAccess } = require('./videoAccess');

/**
 * Plan exercises ↔ training-day videos.
 *
 * A link is training_day_videos.exercise_id: the video sits in one of the
 * user's days (a link may use another day's video). Day videos without an
 * exercise are the day's "extras" (stretching, warm-up…), shown to the client too.
 */

/**
 * Per day: each exercise with its linked videos, suggestions for exercises
 * without links (same day, other days, then the library — see suggestLinks),
 * and the day's extras. Days with only videos are included.
 */
async function loadLinks(userId) {
    const [exercises, dayVideos, techniqueRows] = await Promise.all([
        db.query(
            `SELECT id, day_number, day_name, order_index, name, sets, reps
             FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index`,
            [userId]
        ),
        db.query(
            `SELECT td.id AS dayId, td.day_number, tdv.id AS assignmentId, tdv.exercise_id, v.id AS videoId, v.title
             FROM user_training_days td
             JOIN training_day_videos tdv ON tdv.training_day_id = td.id AND tdv.is_active = 1
             JOIN videos v ON v.id = tdv.video_id AND v.is_active = 1
             WHERE td.user_id = ? AND td.is_active = 1
             ORDER BY td.day_number, tdv.order_index`,
            [userId]
        ),
        db.query(
            `SELECT tdvt.training_day_video_id AS assignmentId, v.id, v.title
             FROM training_day_video_techniques tdvt
             JOIN videos v ON v.id = tdvt.technique_id AND v.is_active = 1
             JOIN training_day_videos tdv ON tdv.id = tdvt.training_day_video_id
             JOIN user_training_days td ON td.id = tdv.training_day_id
             WHERE td.user_id = ?
             ORDER BY tdvt.order_index`,
            [userId]
        ),
    ]);
    const library = exercises.length > 0
        ? (await db.query('SELECT id AS videoId, title FROM videos WHERE is_active = 1')).map(prepareVideo)
        : [];

    const techniquesOf = new Map();
    for (const t of techniqueRows) {
        techniquesOf.set(t.assignmentId, [...(techniquesOf.get(t.assignmentId) || []), { id: t.id, title: t.title }]);
    }
    const dayOfAssignment = new Map(dayVideos.map((v) => [v.assignmentId, v.day_number]));
    const exerciseIds = new Set(exercises.map((e) => e.id));
    // dayNumber: the day the video sits in (a link may point to another day's video)
    const toVideo = (v) => ({
        assignmentId: v.assignmentId, videoId: v.videoId, title: v.title,
        dayNumber: v.day_number, techniques: techniquesOf.get(v.assignmentId) || [],
    });
    const { suggestions, usedAssignments } = suggestLinks(exercises, dayVideos, library);

    const dayNumbers = [...new Set([...exercises.map((e) => e.day_number), ...dayVideos.map((v) => v.day_number)])]
        .sort((a, b) => a - b);

    return dayNumbers.map((dayNumber) => {
        const dayExercises = exercises.filter((e) => e.day_number === dayNumber);
        const linksOf = (exerciseId) => dayVideos.filter((v) => v.exercise_id === exerciseId).map(toVideo);
        // Videos linked to an exercise that no longer exists count as free
        const isFree = (v) => v.exercise_id == null || !exerciseIds.has(v.exercise_id);

        return {
            dayNumber,
            dayName: (dayExercises[0] && dayExercises[0].day_name) || `Giorno ${dayNumber}`,
            exercises: dayExercises.map((e) => {
                const links = linksOf(e.id);
                return {
                    id: e.id,
                    name: e.name,
                    sets: e.sets,
                    reps: e.reps,
                    links,
                    suggestions: links.length > 0 ? [] : (suggestions.get(e.id) || []).map((s) => ({
                        assignmentId: s.assignmentId,
                        videoId: s.videoId,
                        title: s.title,
                        dayNumber: s.assignmentId ? dayOfAssignment.get(s.assignmentId) : dayNumber,
                        techniques: (s.assignmentId && techniquesOf.get(s.assignmentId)) || [],
                        confidence: s.confidence,
                        fromLibrary: s.source === 'library',
                    })),
                };
            }),
            extras: dayVideos
                .filter((v) => v.day_number === dayNumber && isFree(v) && !usedAssignments.has(v.assignmentId))
                .map(toVideo),
        };
    });
}

/**
 * Saves the editor's state in one transaction.
 *
 *   links:  [{ exerciseId, videos: [{ assignmentId?, videoId, techniqueIds? }] }]
 *   extras: [{ dayNumber, videos: [...] }]   (optional)
 *
 * A video without assignmentId comes from the library: it is added to the day
 * (created if missing) and the user is granted access. With `extras` the payload
 * describes every day video: order follows the payload, and day videos left out
 * are removed (access revoked when in no other day). Without it only links change.
 * `techniqueIds`, when present, replaces that video's techniques.
 *
 * @returns {{ addedVideos: number, removedVideos: number }}
 */
async function saveLinks(userId, { links, extras }, adminName) {
    return db.transaction(async (tx) => {
        // A transaction runs one statement at a time: sequential reads
        const exercises = await tx.query('SELECT id, day_number, day_name FROM training_exercises WHERE user_id = ?', [userId]);
        const days = await tx.query('SELECT id, day_number FROM user_training_days WHERE user_id = ? AND is_active = 1', [userId]);
        // Same rows the editor shows: deactivated videos are left alone
        const assignments = await tx.query(
            `SELECT tdv.id, tdv.training_day_id, tdv.video_id, tdv.order_index FROM training_day_videos tdv
             JOIN user_training_days td ON td.id = tdv.training_day_id
             JOIN videos v ON v.id = tdv.video_id AND v.is_active = 1
             WHERE td.user_id = ? AND td.is_active = 1 AND tdv.is_active = 1`,
            [userId]
        );
        const permissions = await tx.query('SELECT id, video_id, is_active FROM user_video_permissions WHERE user_id = ?', [userId]);

        const exerciseById = new Map(exercises.map((e) => [e.id, e]));
        const assignmentIds = new Set(assignments.map((a) => a.id));
        // Preloaded state: each library video then costs only the writes it needs
        const cache = {
            dayIdByNumber: new Map(days.map((d) => [d.day_number, d.id])),
            assignmentByDayVideo: new Map(assignments.map((a) => [`${a.training_day_id}:${a.video_id}`, a.id])),
            nextOrderByDay: new Map(),
            permissionByVideo: new Map(permissions.map((p) => [p.video_id, p])),
        };
        for (const a of assignments) {
            cache.nextOrderByDay.set(a.training_day_id, Math.max(cache.nextOrderByDay.get(a.training_day_id) || 0, a.order_index + 1));
        }

        let addedVideos = 0;
        const ordered = []; // [{ assignmentId, techniqueIds? }] in payload order: exercises, then extras
        const resolve = async (owner, video) => {
            let assignmentId = video.assignmentId && assignmentIds.has(video.assignmentId) ? video.assignmentId : null;
            if (!assignmentId && video.videoId) {
                assignmentId = await ensureDayAssignment(tx, userId, owner, video.videoId, adminName, cache);
                if (!assignmentIds.has(assignmentId)) addedVideos++;
                assignmentIds.add(assignmentId);
            }
            if (assignmentId) ordered.push({ assignmentId, techniqueIds: video.techniqueIds });
            return assignmentId;
        };

        const assignmentsByExercise = new Map();
        for (const link of links) {
            const exercise = exerciseById.get(link.exerciseId);
            if (!exercise || !Array.isArray(link.videos)) continue;
            const ids = [];
            for (const video of link.videos) {
                const assignmentId = await resolve(exercise, video);
                if (assignmentId) ids.push(assignmentId);
            }
            if (ids.length > 0) assignmentsByExercise.set(exercise.id, ids);
        }

        for (const day of extras || []) {
            if (!Array.isArray(day.videos)) continue;
            const planExercise = exercises.find((e) => e.day_number === day.dayNumber);
            const owner = { day_number: day.dayNumber, day_name: planExercise ? planExercise.day_name : `Giorno ${day.dayNumber}` };
            for (const video of day.videos) await resolve(owner, video);
        }

        // Links: clear the user's, then one update per exercise
        await tx.run(
            `UPDATE training_day_videos SET exercise_id = NULL
             WHERE training_day_id IN (SELECT id FROM user_training_days WHERE user_id = ?)`,
            [userId]
        );
        for (const [exerciseId, ids] of assignmentsByExercise) {
            await tx.run(
                `UPDATE training_day_videos SET exercise_id = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
                [exerciseId, ...ids]
            );
        }

        await saveTechniques(tx, ordered.filter((o) => Array.isArray(o.techniqueIds)));

        let removedVideos = 0;
        if (extras !== undefined) {
            await saveOrder(tx, assignments, ordered);
            removedVideos = await removeUnlisted(tx, userId, assignments, ordered);
        }
        return { addedVideos, removedVideos };
    });
}

/**
 * Makes sure a library video is in the training day of `owner` (an exercise or
 * { day_number, day_name }): creates the day if missing, reuses an existing
 * assignment of the same video, grants the user access. Returns the assignment id.
 */
async function ensureDayAssignment(tx, userId, owner, videoId, adminName, cache) {
    let dayId = cache.dayIdByNumber.get(owner.day_number);
    if (!dayId) {
        dayId = (await tx.run(
            'INSERT INTO user_training_days (user_id, day_number, day_name) VALUES (?, ?, ?)',
            [userId, owner.day_number, owner.day_name || null]
        )).lastId;
        cache.dayIdByNumber.set(owner.day_number, dayId);
        cache.nextOrderByDay.set(dayId, 0);
    }

    const key = `${dayId}:${videoId}`;
    let assignmentId = cache.assignmentByDayVideo.get(key);
    if (!assignmentId) {
        const nextOrder = cache.nextOrderByDay.get(dayId) || 0;
        assignmentId = (await tx.run(
            'INSERT INTO training_day_videos (training_day_id, video_id, order_index, added_by) VALUES (?, ?, ?, ?)',
            [dayId, videoId, nextOrder, adminName]
        )).lastId;
        cache.assignmentByDayVideo.set(key, assignmentId);
        cache.nextOrderByDay.set(dayId, nextOrder + 1);
    }

    const permission = cache.permissionByVideo.get(videoId);
    if (!permission) {
        await tx.run(
            'INSERT INTO user_video_permissions (user_id, video_id, granted_by, is_active) VALUES (?, ?, ?, 1)',
            [userId, videoId, adminName]
        );
        cache.permissionByVideo.set(videoId, { is_active: 1 });
    } else if (!Number(permission.is_active)) {
        await tx.run('UPDATE user_video_permissions SET is_active = 1 WHERE id = ?', [permission.id]);
        permission.is_active = 1;
    }
    return assignmentId;
}

/** Replaces the technique set of each listed video (only the ones that changed). */
async function saveTechniques(tx, items) {
    if (items.length === 0) return;
    const ids = items.map((o) => o.assignmentId);
    const current = await tx.query(
        `SELECT training_day_video_id, technique_id FROM training_day_video_techniques
         WHERE training_day_video_id IN (${ids.map(() => '?').join(',')}) ORDER BY order_index`,
        ids
    );
    for (const { assignmentId, techniqueIds } of items) {
        const wanted = [...new Set(techniqueIds.map(Number).filter(Boolean))];
        const have = current.filter((t) => t.training_day_video_id === assignmentId).map((t) => t.technique_id);
        if (wanted.join(',') === have.join(',')) continue;
        await tx.run('DELETE FROM training_day_video_techniques WHERE training_day_video_id = ?', [assignmentId]);
        for (const [i, techniqueId] of wanted.entries()) {
            await tx.run(
                'INSERT OR IGNORE INTO training_day_video_techniques (training_day_video_id, technique_id, order_index) VALUES (?, ?, ?)',
                [assignmentId, techniqueId, i]
            );
        }
    }
}

/** Day order = payload order (exercises first, then extras); only changed rows are written. */
async function saveOrder(tx, assignments, ordered) {
    const dayOf = new Map(assignments.map((a) => [a.id, a.training_day_id]));
    const orderOf = new Map(assignments.map((a) => [a.id, a.order_index]));
    const positionByDay = new Map();
    const seen = new Set();
    for (const { assignmentId } of ordered) {
        // Rows added in this save were appended in order already
        if (seen.has(assignmentId) || !dayOf.has(assignmentId)) continue;
        seen.add(assignmentId);
        const dayId = dayOf.get(assignmentId);
        const position = positionByDay.get(dayId) || 0;
        positionByDay.set(dayId, position + 1);
        if (orderOf.get(assignmentId) !== position) {
            await tx.run('UPDATE training_day_videos SET order_index = ? WHERE id = ?', [position, assignmentId]);
        }
    }
}

/** Removes day videos missing from the payload; revokes access to videos left in no day. */
async function removeUnlisted(tx, userId, assignments, ordered) {
    const kept = new Set(ordered.map((o) => o.assignmentId));
    const removed = assignments.filter((a) => !kept.has(a.id));
    if (removed.length === 0) return 0;

    const ids = removed.map((a) => a.id);
    // Techniques go with their videos (ON DELETE CASCADE)
    await tx.run(`DELETE FROM training_day_videos WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    await revokeUnusedAccess(userId, removed.map((a) => a.video_id), tx);
    return removed.length;
}

module.exports = { loadLinks, saveLinks };
