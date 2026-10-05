require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 Creating admin_feedback_seen table for tracking unread feedback...');

async function migrate() {
  try {
    // Create admin_feedback_seen table with per-trainer tracking
    await client.execute(`
      CREATE TABLE IF NOT EXISTS admin_feedback_seen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL DEFAULT 0,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(admin_user_id, trainer_id)
      )
    `);
    console.log('✅ admin_feedback_seen table created');

    // Create composite index
    try {
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_admin_feedback_seen_user_trainer ON admin_feedback_seen(admin_user_id, trainer_id)
      `);
      console.log('✅ Created index on (admin_user_id, trainer_id)');
    } catch (err) {
      console.log('⚠️  Index already exists or error:', err.message);
    }

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 How it works:');
    console.log('   - Feedback with created_at > last_seen_at = unread');
    console.log('   - Call POST /api/feedback/admin/mark-seen to update last_seen_at');
    console.log('   - Call GET /api/feedback/admin/unread-count to get unread count');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrate();
