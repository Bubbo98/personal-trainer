/**
 * Copies the production Turso database into a local SQLite file, for tests and
 * local development. Production is only read.
 *
 *   node scripts/snapshot-prod-db.js [outFile]   (default: database/prod-copy.db)
 *
 * The file holds real client data: it lives under backend/database/, which git ignores.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const BATCH_ROWS = 200;

async function main() {
    const outFile = path.resolve(process.argv[2] || path.join(__dirname, '..', 'database', 'prod-copy.db'));
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set');
    }

    const prod = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    const local = createClient({ url: `file:${outFile}` });

    const schema = (await prod.execute(
        "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
    )).rows;
    const tables = schema.filter((s) => s.type === 'table');

    // Tables first (foreign keys point at each other), data, then indexes/triggers
    await local.execute('PRAGMA foreign_keys = OFF');
    for (const { sql } of tables) await local.execute(sql);

    for (const { name } of tables) {
        const rows = (await prod.execute(`SELECT * FROM "${name}"`)).rows;
        if (rows.length === 0) continue;
        const columns = Object.keys(rows[0]);
        const insert = `INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
        for (let i = 0; i < rows.length; i += BATCH_ROWS) {
            await local.batch(
                rows.slice(i, i + BATCH_ROWS).map((row) => ({ sql: insert, args: columns.map((c) => row[c]) })),
                'write'
            );
        }
        console.log(`${name}: ${rows.length} rows`);
    }

    for (const { sql } of schema.filter((s) => s.type !== 'table')) await local.execute(sql);

    local.close();
    prod.close();
    console.log(`Snapshot written to ${outFile}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
