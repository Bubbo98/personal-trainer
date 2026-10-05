require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 Creating user_feedbacks table...');

async function migrate() {
  try {
    // Create user_feedbacks table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        feedback_date DATE NOT NULL,
        training_satisfaction INTEGER NOT NULL CHECK (training_satisfaction >= 1 AND training_satisfaction <= 10),
        motivation_level INTEGER NOT NULL CHECK (motivation_level >= 1 AND motivation_level <= 10),
        difficulties TEXT,
        nutrition_quality VARCHAR(50) NOT NULL CHECK (nutrition_quality IN ('ottima', 'buona', 'da_migliorare', 'difficolta')),
        sleep_hours INTEGER NOT NULL,
        recovery_improved BOOLEAN NOT NULL,
        feels_supported BOOLEAN NOT NULL,
        support_improvement TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        pdf_change_date DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ user_feedbacks table created');

    // Create indexes
    try {
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user_id ON user_feedbacks(user_id)
      `);
      console.log('✅ Created index on user_id');
    } catch (err) {
      console.log('⚠️  Index on user_id already exists or error:', err.message);
    }

    try {
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_user_feedbacks_feedback_date ON user_feedbacks(feedback_date)
      `);
      console.log('✅ Created index on feedback_date');
    } catch (err) {
      console.log('⚠️  Index on feedback_date already exists or error:', err.message);
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrate();
