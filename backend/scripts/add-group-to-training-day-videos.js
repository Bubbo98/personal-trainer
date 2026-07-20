#!/usr/bin/env node

const { createDatabase } = require('../utils/database');

console.log('Starting migration: add group_id and group_label to training_day_videos...\n');

const db = createDatabase();

const statements = [
    'ALTER TABLE training_day_videos ADD COLUMN group_id INTEGER',
    'ALTER TABLE training_day_videos ADD COLUMN group_label TEXT',
];

async function runMigration() {
    for (const stmt of statements) {
        try {
            await new Promise((resolve, reject) => {
                db.runCallback(stmt, [], (err) => {
                    if (err) {
                        if (err.message && err.message.toLowerCase().includes('duplicate column')) {
                            console.log(`⚠  Column already exists, skipping: ${stmt}`);
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log(`✅ ${stmt}`);
                        resolve();
                    }
                });
            });
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
