require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 Fixing admin_feedback_seen table to support per-trainer tracking...');
console.log('   (Preserving existing data)\n');

async function migrate() {
  try {
    // 1. Read existing data
    let existingRows = [];
    try {
      const result = await client.execute('SELECT admin_user_id, last_seen_at FROM admin_feedback_seen');
      existingRows = result.rows;
      console.log(`📦 Found ${existingRows.length} existing record(s) to migrate`);
      for (const row of existingRows) {
        console.log(`   - admin_user_id: "${row.admin_user_id}", last_seen_at: ${row.last_seen_at}`);
      }
    } catch (err) {
      console.log('⚠️  No existing table or empty, starting fresh');
    }

    // 2. Parse existing data - handle composite string keys like "1_1" or plain integers
    const migratedRows = [];
    for (const row of existingRows) {
      const key = String(row.admin_user_id);
      const lastSeenAt = row.last_seen_at;

      if (key.includes('_')) {
        // Composite key like "1_2" → admin_user_id=1, trainer_id=2
        const [adminId, trainerId] = key.split('_').map(Number);
        if (!isNaN(adminId) && !isNaN(trainerId)) {
          migratedRows.push({ adminId, trainerId, lastSeenAt });
          console.log(`   ✅ Parsed "${key}" → admin=${adminId}, trainer=${trainerId}`);
        } else {
          console.log(`   ⚠️  Skipping invalid key: "${key}"`);
        }
      } else {
        // Plain integer - this was a "no trainer filter" entry, keep as trainer_id=0
        const adminId = Number(key);
        if (!isNaN(adminId)) {
          migratedRows.push({ adminId, trainerId: 0, lastSeenAt });
          console.log(`   ✅ Parsed "${key}" → admin=${adminId}, trainer=0 (global)`);
        }
      }
    }

    // 3. Drop old table and create new one
    await client.execute('DROP TABLE IF EXISTS admin_feedback_seen');
    console.log('\n🗑️  Dropped old table');

    await client.execute(`
      CREATE TABLE admin_feedback_seen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL DEFAULT 0,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(admin_user_id, trainer_id)
      )
    `);
    console.log('✅ Created new table with (admin_user_id, trainer_id) UNIQUE constraint');

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_admin_feedback_seen_user_trainer ON admin_feedback_seen(admin_user_id, trainer_id)
    `);
    console.log('✅ Created composite index');

    // 4. Re-insert migrated data
    if (migratedRows.length > 0) {
      for (const row of migratedRows) {
        await client.execute({
          sql: `INSERT INTO admin_feedback_seen (admin_user_id, trainer_id, last_seen_at) VALUES (?, ?, ?)`,
          args: [row.adminId, row.trainerId, row.lastSeenAt]
        });
      }
      console.log(`\n📥 Re-inserted ${migratedRows.length} record(s) with proper schema`);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrate();
