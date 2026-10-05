/**
 * One-off: links training-plan exercises to their videos wherever the matcher
 * is sure, so clients see the merged "Giorni" view without the admin having to
 * open every client. Only exercises with no link yet, and only when every
 * proposed video is 'sure' and already in the client's days (never library
 * videos). Everything else stays for the admin panel.
 *
 * Run with: node backend/scripts/saveSureExerciseLinks.js [--dry]
 */

const { createDatabase } = require('../utils/database');
const { prepareVideo, suggestLinks } = require('../utils/exerciseMatcher');

const DRY_RUN = process.argv.includes('--dry');

const dbAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.allCallback(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.runCallback(sql, params, (err) => (err ? reject(err) : resolve())));

async function run() {
  const db = createDatabase();
  const library = (await dbAll(db, 'SELECT id AS videoId, title FROM videos WHERE is_active = 1')).map(prepareVideo);
  const users = await dbAll(db,
    `SELECT u.id, u.first_name, u.last_name FROM users u
     WHERE u.is_active = 1 AND EXISTS (SELECT 1 FROM training_exercises te WHERE te.user_id = u.id)
     ORDER BY u.id`);

  let linkedExercises = 0, linkedVideos = 0;
  for (const user of users) {
    const exercises = await dbAll(db, 'SELECT id, day_number, name FROM training_exercises WHERE user_id = ?', [user.id]);
    const dayVideos = await dbAll(db,
      `SELECT td.day_number, tdv.id AS assignmentId, tdv.exercise_id, v.id AS videoId, v.title
       FROM user_training_days td
       JOIN training_day_videos tdv ON tdv.training_day_id = td.id AND tdv.is_active = 1
       JOIN videos v ON v.id = tdv.video_id AND v.is_active = 1
       WHERE td.user_id = ? AND td.is_active = 1`,
      [user.id]);

    const { suggestions } = suggestLinks(exercises, dayVideos, library);
    let userCount = 0;
    for (const [exerciseId, list] of suggestions) {
      const allSure = list.length > 0 && list.every((s) => s.confidence === 'sure' && s.assignmentId != null);
      if (!allSure) continue;
      userCount++;
      linkedVideos += list.length;
      if (!DRY_RUN) {
        const ids = list.map((s) => s.assignmentId);
        await dbRun(db,
          `UPDATE training_day_videos SET exercise_id = ? WHERE id IN (${ids.map(() => '?').join(',')}) AND exercise_id IS NULL`,
          [exerciseId, ...ids]);
      }
    }
    linkedExercises += userCount;
    console.log(`#${user.id} ${`${user.first_name || ''} ${user.last_name || ''}`.trim()}: ${userCount}/${exercises.length} esercizi collegati`);
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Esercizi collegati: ${linkedExercises} (${linkedVideos} video) su ${users.length} clienti`);
  db.close();
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
