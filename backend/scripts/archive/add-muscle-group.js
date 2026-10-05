require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('Adding muscle_group column to videos table...');

async function migrate() {
  try {
    try {
      await client.execute(`
        ALTER TABLE videos
        ADD COLUMN muscle_group VARCHAR(50)
      `);
      console.log('Added muscle_group column');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('Error adding muscle_group:', err.message);
        throw err;
      } else {
        console.log('muscle_group column already exists');
      }
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
