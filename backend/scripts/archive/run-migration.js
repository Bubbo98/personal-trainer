// Script to run migration on Turso database
const { createClient } = require('@libsql/client');
require('dotenv').config();

async function runMigration() {
    console.log('🔄 Starting migration: add is_paying column...');

    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        console.error('❌ TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env');
        process.exit(1);
    }

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
        // Add is_paying column (default TRUE for existing users)
        console.log('📝 Adding is_paying column to users table...');
        await client.execute({
            sql: 'ALTER TABLE users ADD COLUMN is_paying BOOLEAN DEFAULT 1',
            args: []
        });
        console.log('✅ Column is_paying added');

        // Create index for better query performance
        console.log('📝 Creating index on is_paying...');
        await client.execute({
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_is_paying ON users(is_paying)',
            args: []
        });
        console.log('✅ Index created');

        // Update existing users to be paying by default
        console.log('📝 Updating existing users...');
        const result = await client.execute({
            sql: 'UPDATE users SET is_paying = 1 WHERE is_paying IS NULL',
            args: []
        });
        console.log(`✅ Updated ${result.rowsAffected} users`);

        console.log('');
        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('Summary:');
        console.log('- Added is_paying column to users table');
        console.log('- Created index on is_paying');
        console.log(`- Updated ${result.rowsAffected} existing users`);

    } catch (error) {
        console.error('❌ Migration failed:', error);

        // Check if column already exists
        if (error.message && error.message.includes('duplicate column name')) {
            console.log('⚠️  Column is_paying already exists. Migration may have already been run.');
            console.log('✅ Skipping migration.');
        } else {
            process.exit(1);
        }
    }
}

runMigration();
