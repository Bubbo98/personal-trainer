require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 Adding expiration fields to user_pdf_files table...');

async function migrate() {
  try {
    // Add duration_months column (default 2 months)
    try {
      await client.execute(`
        ALTER TABLE user_pdf_files
        ADD COLUMN duration_months INTEGER DEFAULT 2
      `);
      console.log('✅ Added duration_months column');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('❌ Error adding duration_months:', err.message);
      } else {
        console.log('⚠️  duration_months column already exists');
      }
    }

    // Add duration_days column (default 0 days)
    try {
      await client.execute(`
        ALTER TABLE user_pdf_files
        ADD COLUMN duration_days INTEGER DEFAULT 0
      `);
      console.log('✅ Added duration_days column');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('❌ Error adding duration_days:', err.message);
      } else {
        console.log('⚠️  duration_days column already exists');
      }
    }

    // Add expiration_date column
    try {
      await client.execute(`
        ALTER TABLE user_pdf_files
        ADD COLUMN expiration_date DATETIME
      `);
      console.log('✅ Added expiration_date column');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('❌ Error adding expiration_date:', err.message);
      } else {
        console.log('⚠️  expiration_date column already exists');
      }
    }

    // Update existing records to set expiration_date based on uploaded_at + 2 months
    const result = await client.execute(`
      UPDATE user_pdf_files
      SET expiration_date = datetime(uploaded_at, '+2 months')
      WHERE expiration_date IS NULL
    `);
    console.log('✅ Updated existing records with default expiration (2 months)');
    console.log(`   Rows affected: ${result.rowsAffected}`);

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrate();
