/**
 * Migration script to add trainers system
 * Run this once to add the trainers table and trainer_id column to existing database
 */

const { createDatabase } = require('../utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('Starting trainers migration...');

    const db = createDatabase();

    try {
        // Check if trainers table already exists
        const tableExists = await new Promise((resolve, reject) => {
            db.getCallback(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='trainers'",
                [],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });

        if (tableExists) {
            console.log('Trainers table already exists, skipping migration.');
            db.close();
            process.exit(0);
            return;
        }

        // Read migration SQL
        const migrationPath = path.join(__dirname, '../database/add-trainers.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split into individual statements
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Executing ${statements.length} SQL statements...`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
            console.log(stmt.substring(0, 80) + (stmt.length > 80 ? '...' : ''));

            await new Promise((resolve, reject) => {
                db.runCallback(stmt, [], function(err) {
                    if (err) {
                        // Ignore "duplicate column" errors for ALTER TABLE
                        if (err.message && err.message.includes('duplicate column')) {
                            console.log('  -> Column already exists, skipping');
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log('  -> Success');
                        resolve();
                    }
                });
            });
        }

        console.log('\n--- Migration completed successfully! ---');
        console.log('All existing users have been assigned to Joshua (trainer_id = 1)');

        // Verify the migration
        const trainersCount = await new Promise((resolve, reject) => {
            db.getCallback('SELECT COUNT(*) as count FROM trainers', [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const usersWithTrainer = await new Promise((resolve, reject) => {
            db.getCallback('SELECT COUNT(*) as count FROM users WHERE trainer_id IS NOT NULL', [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        console.log(`\nVerification:`);
        console.log(`- Trainers in database: ${trainersCount}`);
        console.log(`- Users with trainer assigned: ${usersWithTrainer}`);

        db.close();
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error.message);
        db.close();
        process.exit(1);
    }
}

runMigration();
