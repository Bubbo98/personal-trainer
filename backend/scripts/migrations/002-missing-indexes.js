/**
 * Indexes for lookups that scanned whole tables. Only adds indexes (no data
 * changes), idempotent.
 *   - user_video_permissions(user_id, video_id) UNIQUE: every client page checks it;
 *     also stops duplicate permissions (the code always looks before inserting)
 *   - user_video_permissions(video_id): deactivating a video
 *   - access_logs(user_id), body_composition_reports(user_id): per-user lists, user deletion
 *
 *   node scripts/migrations/002-missing-indexes.js --db file:database/prod-copy.db
 *   node scripts/migrations/002-missing-indexes.js --apply      (production, from .env)
 */
require('dotenv').config();
const { createClient } = require('@libsql/client');

const INDEXES = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_video_permissions_user_video ON user_video_permissions(user_id, video_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_video_permissions_video ON user_video_permissions(video_id)',
    'CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_body_composition_reports_user ON body_composition_reports(user_id)',
];

async function migrate(client) {
    const duplicates = (await client.execute(
        'SELECT COUNT(*) AS n FROM (SELECT 1 FROM user_video_permissions GROUP BY user_id, video_id HAVING COUNT(*) > 1)'
    )).rows[0].n;
    if (Number(duplicates) > 0) throw new Error(`${duplicates} duplicated permissions: clean them up first`);

    await client.batch(INDEXES, 'write');
    const names = (await client.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")).rows.map((r) => r.name);
    return { indexes: INDEXES.map((sql) => sql.match(/idx_\w+/)[0]).filter((name) => names.includes(name)) };
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
