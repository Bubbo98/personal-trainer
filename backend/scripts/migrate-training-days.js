#!/usr/bin/env node

/**
 * Migration Script: Add Training Days System
 *
 * This script adds the training days tables to the existing database.
 * It's safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 *
 * Usage: node scripts/migrate-training-days.js
 */

const { createDatabase } = require('../utils/database');

console.log('🚀 Starting Training Days migration...\n');

const db = createDatabase();

// Define statements in explicit order: tables first, then indexes
const statements = [
    // 1. Create user_training_days table
    `CREATE TABLE IF NOT EXISTS user_training_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        day_number INTEGER NOT NULL,
        day_name VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, day_number)
    )`,

    // 2. Create training_day_videos table
    `CREATE TABLE IF NOT EXISTS training_day_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        training_day_id INTEGER NOT NULL,
        video_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        added_by VARCHAR(100) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (training_day_id) REFERENCES user_training_days(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE(training_day_id, video_id)
    )`,

    // 3-7. Create indexes
    'CREATE INDEX IF NOT EXISTS idx_training_days_user ON user_training_days(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_training_days_active ON user_training_days(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_training_day_videos_day ON training_day_videos(training_day_id)',
    'CREATE INDEX IF NOT EXISTS idx_training_day_videos_video ON training_day_videos(video_id)',
    'CREATE INDEX IF NOT EXISTS idx_training_day_videos_order ON training_day_videos(order_index)'
];

// Execute statements sequentially (not in parallel)
async function runMigration() {
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
            await new Promise((resolve, reject) => {
                db.runCallback(statement, [], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
                        const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
                        console.log(`   ${preview}...`);
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.error(`❌ Error executing statement ${i + 1}:`, err.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
            process.exit(1);
        }
    }

    db.close();
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Tables created:');
    console.log('  - user_training_days');
    console.log('  - training_day_videos');
    console.log('\n📊 Indexes created:');
    console.log('  - idx_training_days_user');
    console.log('  - idx_training_days_active');
    console.log('  - idx_training_day_videos_day');
    console.log('  - idx_training_day_videos_video');
    console.log('  - idx_training_day_videos_order');
    console.log('\n🎉 You can now use the training days feature!');
}

runMigration().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
