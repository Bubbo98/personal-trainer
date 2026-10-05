/**
 * Migration: link training-day videos to training-plan exercises.
 *
 * Adds training_day_videos.exercise_id (nullable). Several videos can point to
 * the same exercise (supersets); videos with NULL are "extra" videos of the day
 * (e.g. stretching). Safe to run multiple times.
 *
 * Run with: node backend/scripts/migrateExerciseVideoLinks.js
 */

const { createDatabase } = require('../utils/database');

async function run() {
  const db = createDatabase();
  console.log('Starting migrateExerciseVideoLinks migration...');

  const columns = await new Promise((resolve, reject) => {
    db.allCallback('PRAGMA table_info(training_day_videos)', [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  if (columns.some((c) => c.name === 'exercise_id')) {
    console.log('✓ training_day_videos.exercise_id already exists');
  } else {
    await new Promise((resolve, reject) => {
      db.runCallback('ALTER TABLE training_day_videos ADD COLUMN exercise_id INTEGER', [], (err) => (err ? reject(err) : resolve()));
    });
    console.log('✓ Added training_day_videos.exercise_id');
  }

  await new Promise((resolve, reject) => {
    db.runCallback(
      'CREATE INDEX IF NOT EXISTS idx_training_day_videos_exercise ON training_day_videos(exercise_id)',
      [],
      (err) => (err ? reject(err) : resolve())
    );
  });
  console.log('✓ Index ready');

  db.close();
  console.log('Migration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
