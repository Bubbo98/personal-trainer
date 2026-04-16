/**
 * Migration: add exercise_name snapshot column to exercise_logs
 * so log history survives plan updates.
 * Run with: node database/add-exercise-name-snapshot.js
 */

require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  // Add snapshot columns to exercise_logs
  await client.execute(
    `ALTER TABLE exercise_logs ADD COLUMN exercise_name VARCHAR(255)`
  );
  console.log('OK: ALTER TABLE exercise_logs ADD COLUMN exercise_name');

  await client.execute(
    `ALTER TABLE exercise_logs ADD COLUMN day_number_snapshot INTEGER`
  );
  console.log('OK: ALTER TABLE exercise_logs ADD COLUMN day_number_snapshot');

  await client.execute(
    `ALTER TABLE exercise_logs ADD COLUMN day_name_snapshot VARCHAR(100)`
  );
  console.log('OK: ALTER TABLE exercise_logs ADD COLUMN day_name_snapshot');

  console.log('\n✅ exercise_logs snapshot columns added.');
}

run().catch((err) => {
  // Column might already exist on re-run — not fatal
  if (err.message && err.message.includes('duplicate column')) {
    console.log('Columns already exist, skipping.');
  } else {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
});
