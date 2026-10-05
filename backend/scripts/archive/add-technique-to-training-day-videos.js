const { createDatabase } = require('../utils/database');

const db = createDatabase();

db.runCallback(
    'ALTER TABLE training_day_videos ADD COLUMN technique_id INTEGER',
    [],
    function(err) {
        if (err) {
            if (err.message && err.message.toLowerCase().includes('duplicate')) {
                console.log('Column technique_id already exists, skipping.');
            } else {
                console.error('Migration failed:', err.message);
                process.exit(1);
            }
        } else {
            console.log('✓ Added technique_id column to training_day_videos');
        }
        db.close();
    }
);
