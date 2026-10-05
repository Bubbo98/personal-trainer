require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('Adding visible_from column to user_pdf_files table...');

async function migrate() {
  try {
    try {
      await client.execute(`
        ALTER TABLE user_pdf_files
        ADD COLUMN visible_from DATETIME
      `);
      console.log('Added visible_from column');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('Error adding visible_from:', err.message);
        throw err;
      } else {
        console.log('visible_from column already exists');
      }
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
