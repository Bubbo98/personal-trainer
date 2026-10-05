const { createClient } = require('@libsql/client');
require('dotenv').config();

async function updatePdfTableForText() {
  console.log('🔄 Updating PDF table for TEXT storage (base64)...');

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set in .env');
    process.exit(1);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Drop old table
    console.log('📝 Dropping old user_pdf_files table...');
    await client.execute('DROP TABLE IF EXISTS user_pdf_files');
    console.log('✅ Old table dropped');

    // Create new table with TEXT for base64 data
    console.log('📝 Creating new user_pdf_files table with TEXT...');
    await client.execute(`
      CREATE TABLE user_pdf_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_data TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) DEFAULT 'application/pdf',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by VARCHAR(100) DEFAULT 'admin',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);
    console.log('✅ New table created with TEXT support');

    // Create index
    console.log('📝 Creating index...');
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_pdf_files_user ON user_pdf_files(user_id)
    `);
    console.log('✅ Index created');

    // Verify table exists
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='user_pdf_files'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verification complete: user_pdf_files table exists in Turso');

      // Show table structure
      const structure = await client.execute('PRAGMA table_info(user_pdf_files)');
      console.log('\n📋 New table structure:');
      structure.rows.forEach(col => {
        console.log(`   - ${col.name} (${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''})`);
      });
    } else {
      console.error('❌ Table verification failed');
      process.exit(1);
    }

    console.log('\n🎉 PDF table updated for TEXT storage successfully!');
    console.log('📝 PDFs will now be stored as base64 TEXT in the database.');

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updatePdfTableForText();
