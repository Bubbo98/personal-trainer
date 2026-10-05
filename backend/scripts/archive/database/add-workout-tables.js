/**
 * Migration: add training_exercises and exercise_logs tables
 * Run with: node database/add-workout-tables.js
 */

require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const queries = [
  `CREATE TABLE IF NOT EXISTS training_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    day_name VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    sets VARCHAR(20),
    reps VARCHAR(20),
    rest VARCHAR(20),
    notes TEXT,
    weight_slots INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    week_start DATE NOT NULL,
    weight VARCHAR(50),
    sets_done INTEGER,
    reps_done VARCHAR(50),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES training_exercises(id) ON DELETE CASCADE,
    UNIQUE(user_id, exercise_id, week_start)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_training_exercises_user ON training_exercises(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_training_exercises_day ON training_exercises(user_id, day_number)`,
  `CREATE INDEX IF NOT EXISTS idx_exercise_logs_user ON exercise_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_exercise_logs_week ON exercise_logs(user_id, week_start)`,
];

async function runMigration() {
  for (const query of queries) {
    await client.execute(query);
    console.log('OK:', query.trim().slice(0, 70).replace(/\s+/g, ' ') + '...');
  }
  console.log('\n✅ Workout tables migration complete.');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
