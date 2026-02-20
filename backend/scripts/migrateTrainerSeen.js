/**
 * Migration: Add trainer_seen_at and user_dismissed_trainer_seen to user_feedbacks
 *
 * Run with: node backend/scripts/migrateTrainerSeen.js
 */

const { createDatabase } = require('../utils/database');

const db = createDatabase();

console.log('Starting migrateTrainerSeen migration...');

// Add trainer_seen_at column
db.runCallback(
  `ALTER TABLE user_feedbacks ADD COLUMN trainer_seen_at DATETIME`,
  [],
  (err) => {
    const isAlreadyExists = (e) => e && (e.message.includes('duplicate column') || e.message.includes('already exists'));
    if (err && !isAlreadyExists(err)) {
      console.error('Error adding trainer_seen_at:', err.message);
    } else {
      console.log('✓ trainer_seen_at column added (or already exists)');
    }

    // Add user_dismissed_trainer_seen column
    db.runCallback(
      `ALTER TABLE user_feedbacks ADD COLUMN user_dismissed_trainer_seen INTEGER DEFAULT 0`,
      [],
      (err2) => {
        if (err2 && !isAlreadyExists(err2)) {
          console.error('Error adding user_dismissed_trainer_seen:', err2.message);
        } else {
          console.log('✓ user_dismissed_trainer_seen column added (or already exists)');
        }

        // Mark existing feedbacks as already seen so they don't appear as unread
        db.runCallback(
          `UPDATE user_feedbacks SET trainer_seen_at = created_at WHERE trainer_seen_at IS NULL`,
          [],
          (err3) => {
            if (err3) {
              console.error('Error backfilling trainer_seen_at:', err3.message);
            } else {
              console.log('✓ Existing feedbacks backfilled with trainer_seen_at = created_at');
            }

            db.close();
            console.log('Migration complete.');
          }
        );
      }
    );
  }
);
