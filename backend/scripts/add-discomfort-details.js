require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 Adding discomfort_details column to user_feedbacks table...');

async function migrate() {
  try {
    // Add discomfort_details column
    await client.execute(`
      ALTER TABLE user_feedbacks ADD COLUMN discomfort_details TEXT
    `);
    console.log('✅ discomfort_details column added successfully');

    console.log('✅ Migration completed!');
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('⚠️  Column already exists, skipping...');
    } else {
      console.error('❌ Migration failed:', err);
    }
  }
}

migrate();
