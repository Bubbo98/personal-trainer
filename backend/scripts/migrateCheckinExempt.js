/**
 * Migration: Add checkin_exempt to users
 *
 * When set, the user is not required to fill in the weekly check-in
 * to keep using the dashboard (see /api/feedback/should-show).
 *
 * Run with: node backend/scripts/migrateCheckinExempt.js
 */

const { createDatabase } = require('../utils/database');

const db = createDatabase();

console.log('Starting migrateCheckinExempt migration...');

db.runCallback(
  `ALTER TABLE users ADD COLUMN checkin_exempt INTEGER DEFAULT 0`,
  [],
  (err) => {
    const isAlreadyExists = (e) => e && (e.message.includes('duplicate column') || e.message.includes('already exists'));
    if (err && !isAlreadyExists(err)) {
      console.error('Error adding checkin_exempt:', err.message);
    } else {
      console.log('✓ checkin_exempt column added (or already exists)');
    }

    db.close();
    console.log('Migration complete.');
  }
);
