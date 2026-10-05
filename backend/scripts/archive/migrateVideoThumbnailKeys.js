/**
 * Migration: store video thumbnails on R2.
 *
 * Adds videos.thumbnail_key (nullable): the R2 key of the thumbnail
 * ("thumbnails/<videoId>-<timestamp>.webp"). The old thumbnail_path column
 * (file name under public/thumbnails) is kept as a fallback until every
 * thumbnail lives on R2. Safe to run multiple times.
 *
 * Run with: node backend/scripts/migrateVideoThumbnailKeys.js
 */

const { createDatabase } = require('../utils/database');

async function run() {
  const db = createDatabase();
  console.log('Starting migrateVideoThumbnailKeys migration...');

  const columns = await new Promise((resolve, reject) => {
    db.allCallback('PRAGMA table_info(videos)', [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  if (columns.some((c) => c.name === 'thumbnail_key')) {
    console.log('✓ videos.thumbnail_key already exists');
  } else {
    await new Promise((resolve, reject) => {
      db.runCallback('ALTER TABLE videos ADD COLUMN thumbnail_key TEXT', [], (err) => (err ? reject(err) : resolve()));
    });
    console.log('✓ Added videos.thumbnail_key');
  }

  db.close();
  console.log('Migration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
