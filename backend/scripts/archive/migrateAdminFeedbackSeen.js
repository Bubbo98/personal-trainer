/**
 * Migration script to add admin_feedback_seen table
 * Run this once to fix missing table on existing Turso database
 * Safe to run multiple times (uses IF NOT EXISTS)
 */

const { createDatabase } = require('../utils/database');

async function runMigration() {
    console.log('Starting admin_feedback_seen migration...');

    const db = createDatabase();

    try {
        // Check if table already exists
        const tableExists = await new Promise((resolve, reject) => {
            db.getCallback(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_feedback_seen'",
                [],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });

        if (tableExists) {
            console.log('Migration already complete (admin_feedback_seen table exists).');
            db.close();
            process.exit(0);
            return;
        }

        console.log('Creating admin_feedback_seen table...');

        await new Promise((resolve, reject) => {
            db.runCallback(
                `CREATE TABLE IF NOT EXISTS admin_feedback_seen (
                    admin_user_id VARCHAR(255) PRIMARY KEY,
                    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                [],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        console.log('  -> Table created');

        await new Promise((resolve, reject) => {
            db.runCallback(
                `CREATE INDEX IF NOT EXISTS idx_admin_feedback_seen ON admin_feedback_seen(last_seen_at)`,
                [],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        console.log('  -> Index created');

        console.log('\n--- Migration completed successfully! ---');
        db.close();
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error.message);
        db.close();
        process.exit(1);
    }
}

runMigration();
