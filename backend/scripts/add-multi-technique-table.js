#!/usr/bin/env node

const { createDatabase } = require('../utils/database');

console.log('Starting migration: create training_day_video_techniques table...\n');

const db = createDatabase();

const statements = [
    `CREATE TABLE IF NOT EXISTS training_day_video_techniques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        training_day_video_id INTEGER NOT NULL,
        technique_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (training_day_video_id) REFERENCES training_day_videos(id) ON DELETE CASCADE,
        FOREIGN KEY (technique_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE(training_day_video_id, technique_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tdvt_assignment ON training_day_video_techniques(training_day_video_id)`,
    // Migrate existing technique_id data into the new table
    `INSERT OR IGNORE INTO training_day_video_techniques (training_day_video_id, technique_id, order_index)
     SELECT id, technique_id, 0
     FROM training_day_videos
     WHERE technique_id IS NOT NULL`,
];

async function runMigration() {
    for (const stmt of statements) {
        try {
            await new Promise((resolve, reject) => {
                db.runCallback(stmt, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log(`✅ ${stmt.substring(0, 80).replace(/\s+/g, ' ')}...`);
        } catch (err) {
            console.error('❌', err.message);
            db.close();
            process.exit(1);
        }
    }

    db.close();
    console.log('\n✨ Migration completed successfully!');
}

runMigration();
