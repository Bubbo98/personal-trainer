/**
 * Adds retention_log: the record of clients whose plan expired and clients the nightly
 * cleanup deleted (see utils/userRetention). Each row is a copy of the client's details,
 * so it outlives the user. A plan expiry is recorded once per expiration date. Idempotent.
 * Run BEFORE deploying the code that writes it.
 *
 *   node scripts/migrations/005-retention-log.js --db file:database/prod-copy.db
 *   node scripts/migrations/005-retention-log.js --apply      (production, from .env)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const { createClient } = require('@libsql/client');

async function migrate(client) {
    const exists = (await client.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'retention_log'")).rows.length > 0;
    if (exists) return { created: [] };
    await client.batch([
        `CREATE TABLE retention_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event TEXT NOT NULL,              -- 'plan_expired' | 'user_deleted'
            reason TEXT,                      -- user_deleted: 'plan_expired' | 'deactivated'
            occurred_at DATETIME NOT NULL,    -- plan_expired: the expiration date; user_deleted: the deletion
            user_id INTEGER NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            trainer_name TEXT,
            expiration_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX idx_retention_log_occurred ON retention_log(occurred_at)',
        `CREATE UNIQUE INDEX idx_retention_log_expiry ON retention_log(user_id, expiration_date) WHERE event = 'plan_expired'`,
    ], 'write');
    return { created: ['retention_log'] };
}

async function main() {
    const args = process.argv.slice(2);
    const url = args.includes('--db') ? args[args.indexOf('--db') + 1] : process.env.TURSO_DATABASE_URL;
    const isRemote = !url.startsWith('file:');
    if (isRemote && !args.includes('--apply')) throw new Error(`Refusing to touch ${url} without --apply`);

    const client = createClient(isRemote ? { url, authToken: process.env.TURSO_AUTH_TOKEN } : { url });
    console.log(url.replace(/\/\/.*@/, '//'), await migrate(client));
    client.close();
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { migrate };
