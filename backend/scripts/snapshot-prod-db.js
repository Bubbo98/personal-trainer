/**
 * Copies the production Turso database into a local SQLite file, for tests and
 * local development. Production is only read.
 *
 *   node scripts/snapshot-prod-db.js [outFile]   (default: database/prod-copy.db)
 *
 * The file holds real client data: it lives under backend/database/, which git ignores.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const BATCH_ROWS = 200;
// Rows per read: plan PDFs are ~2 MB each, one SELECT * of them got the socket closed
const PAGE_ROWS = 5;

async function main() {
    const outFile = path.resolve(process.argv[2] || path.join(__dirname, '..', 'database', 'prod-copy.db'));
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set');
    }

    const prod = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    // Built in a temp file: the previous snapshot stays usable if this one fails
    const tmpFile = `${outFile}.tmp`;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    const local = createClient({ url: `file:${tmpFile}` });

    const schema = (await prod.execute(
        "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
    )).rows;
    const tables = schema.filter((s) => s.type === 'table');

    // Tables first (foreign keys point at each other), data, then indexes/triggers
    await local.execute('PRAGMA foreign_keys = OFF');
    for (const { sql } of tables) await local.execute(sql);

    for (const { name } of tables) {
        let copied = 0;
        for (let lastRowid = -1; ;) {
            // Paged by rowid: small reads, stable order
            const rows = (await prod.execute({
                sql: `SELECT rowid AS __rowid, * FROM "${name}" WHERE rowid > ? ORDER BY rowid LIMIT ${name === 'user_pdf_files' || name === 'body_composition_reports' ? PAGE_ROWS : BATCH_ROWS}`,
                args: [lastRowid],
            })).rows;
            if (rows.length === 0) break;
            lastRowid = rows[rows.length - 1].__rowid;
            const columns = Object.keys(rows[0]).filter((c) => c !== '__rowid');
            const insert = `INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
            await local.batch(rows.map((row) => ({ sql: insert, args: columns.map((c) => row[c]) })), 'write');
            copied += rows.length;
        }
        if (copied > 0) console.log(`${name}: ${copied} rows`);
    }

    for (const { sql } of schema.filter((s) => s.type !== 'table')) await local.execute(sql);

    local.close();
    prod.close();
    // Windows may keep the file locked for a moment after close()
    for (let attempt = 1; ; attempt++) {
        try {
            fs.renameSync(tmpFile, outFile);
            break;
        } catch (err) {
            if (err.code !== 'EBUSY' || attempt === 20) throw err;
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    }
    console.log(`Snapshot written to ${outFile}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
