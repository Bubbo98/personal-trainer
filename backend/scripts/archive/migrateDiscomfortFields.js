/**
 * Migration script to add muscular/articular discomfort columns to user_feedbacks
 * Safe to run multiple times - checks existence before altering
 */

const { createDatabase } = require('../utils/database');

async function runMigration() {
    console.log('Starting discomfort fields migration...');

    const db = createDatabase();

    try {
        // Check which columns already exist
        const checkColumn = (name) => new Promise((resolve, reject) => {
            db.getCallback(
                `SELECT 1 FROM pragma_table_info('user_feedbacks') WHERE name = ?`,
                [name],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });

        const columns = ['muscular_zones', 'muscular_notes', 'articular_zones', 'articular_notes'];
        const exists = await Promise.all(columns.map(checkColumn));

        const toAdd = columns.filter((_, i) => !exists[i]);

        if (toAdd.length === 0) {
            console.log('Migration already complete (all columns exist).');
            db.close();
            process.exit(0);
            return;
        }

        console.log(`Adding columns: ${toAdd.join(', ')}`);

        for (const col of toAdd) {
            await new Promise((resolve, reject) => {
                db.runCallback(
                    `ALTER TABLE user_feedbacks ADD COLUMN ${col} TEXT`,
                    [],
                    function(err) {
                        if (err) reject(err);
                        else { console.log(`  -> Added ${col}`); resolve(); }
                    }
                );
            });
        }

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
