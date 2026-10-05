/**
 * One-off: moves the video thumbnails from public/thumbnails to R2.
 *
 * For every active video that still uses a local file (thumbnail_path) and has
 * no thumbnail_key yet: resizes the image to max 800px wide, converts it to
 * WebP, uploads it as "thumbnails/<videoId>-<timestamp>.webp" and saves the
 * key. Each video gets its own copy, since replacing a thumbnail deletes the
 * old object. Videos whose file is missing are listed at the end.
 *
 * Needs sharp, which is not a project dependency:
 *   SHARP_PATH=/path/to/node_modules/sharp node backend/scripts/uploadThumbnailsToR2.js [--dry]
 */

const fs = require('fs');
const path = require('path');
const sharp = require(process.env.SHARP_PATH || 'sharp');
const { createDatabase } = require('../utils/database');
const { putObject, THUMBNAIL_PREFIX } = require('../utils/r2');

const DRY_RUN = process.argv.includes('--dry');
const THUMBNAILS_DIR = path.join(__dirname, '..', '..', 'public', 'thumbnails');
const CONCURRENCY = 4;

const dbAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.allCallback(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.runCallback(sql, params, (err) => (err ? reject(err) : resolve())));

async function run() {
  const db = createDatabase();
  const videos = await dbAll(db,
    `SELECT id, title, thumbnail_path FROM videos
     WHERE is_active = 1 AND thumbnail_key IS NULL AND thumbnail_path IS NOT NULL AND thumbnail_path <> ''
     ORDER BY id`);

  const missing = [];
  let done = 0, bytesBefore = 0, bytesAfter = 0;

  const queue = [...videos];
  const worker = async () => {
    while (queue.length > 0) {
      const video = queue.shift();
      const file = path.join(THUMBNAILS_DIR, video.thumbnail_path);
      if (!fs.existsSync(file)) {
        missing.push(video);
        continue;
      }
      const original = fs.readFileSync(file);
      const webp = await sharp(original)
        .rotate()
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      bytesBefore += original.length;
      bytesAfter += webp.length;

      if (!DRY_RUN) {
        const key = `${THUMBNAIL_PREFIX}${video.id}-${Date.now()}.webp`;
        await putObject(key, webp, 'image/webp');
        await dbRun(db, 'UPDATE videos SET thumbnail_key = ? WHERE id = ? AND thumbnail_key IS NULL', [key, video.id]);
      }
      done++;
      if (done % 25 === 0) console.log(`  ${done}/${videos.length}...`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Thumbnails ${DRY_RUN ? 'to upload' : 'uploaded'}: ${done}`);
  console.log(`Size: ${mb(bytesBefore)} → ${mb(bytesAfter)}`);
  if (missing.length) {
    console.log(`\nVideos whose file is missing (${missing.length}) — upload their photo from the admin:`);
    for (const v of missing) console.log(`  #${v.id} ${v.title}  (cercava: ${v.thumbnail_path})`);
  }
  db.close();
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
