/**
 * Moves client files (plan PDFs, body composition reports) from base64 in the
 * database to R2 (see services/storedFiles). Two separate steps:
 *
 *   node scripts/move-files-to-r2.js                 report only (no changes)
 *   node scripts/move-files-to-r2.js --apply         copy: upload each file still in base64, read it back,
 *                                                    and only if the bytes match save its file_key
 *                                                    (file_data is kept: the app already reads R2 first)
 *   node scripts/move-files-to-r2.js --apply --clear after checking downloads: empty file_data where the
 *                                                    R2 object matches it byte for byte
 *
 * Uses TURSO_* and R2_* from backend/.env. Idempotent: rerun after a failure.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@libsql/client');
const r2 = require('../utils/r2');
const { storeFile } = require('../services/storedFiles');

const TABLES = [
    { table: 'user_pdf_files', kind: 'plan' },
    { table: 'body_composition_reports', kind: 'report' },
];

const MIME_BY_EXTENSION = {
    '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};
const mimeOf = (name) => MIME_BY_EXTENSION[path.extname(name || '').toLowerCase()] || 'application/octet-stream';

async function copyToR2(client, { table, kind }) {
    const rows = (await client.execute(`SELECT id FROM ${table} WHERE file_key IS NULL AND file_data <> ''`)).rows;
    let copied = 0;
    for (const { id } of rows) {
        // One row at a time: rows are a few MB each
        const row = (await client.execute({ sql: `SELECT id, user_id, original_name, file_data FROM ${table} WHERE id = ?`, args: [id] })).rows[0];
        const buffer = Buffer.from(row.file_data, 'base64');
        const key = await storeFile(kind, row.user_id, {
            originalname: row.original_name,
            mimetype: mimeOf(row.original_name),
            buffer,
        });
        const stored = await r2.getObjectBuffer(key);
        if (!stored.equals(buffer)) {
            await r2.deleteObject(key);
            throw new Error(`${table} #${id}: R2 copy differs from the database, nothing saved`);
        }
        await client.execute({ sql: `UPDATE ${table} SET file_key = ? WHERE id = ? AND file_key IS NULL`, args: [key, id] });
        copied++;
        console.log(`${table} #${id} (user ${row.user_id}) → ${key}`);
    }
    return copied;
}

async function clearDatabaseCopies(client, { table }) {
    const rows = (await client.execute(`SELECT id FROM ${table} WHERE file_key IS NOT NULL AND file_data <> ''`)).rows;
    let cleared = 0;
    for (const { id } of rows) {
        const row = (await client.execute({ sql: `SELECT file_key, file_data FROM ${table} WHERE id = ?`, args: [id] })).rows[0];
        const stored = await r2.getObjectBuffer(row.file_key);
        if (!stored.equals(Buffer.from(row.file_data, 'base64'))) {
            console.error(`${table} #${id}: R2 object differs from the database copy, kept`);
            continue;
        }
        await client.execute({ sql: `UPDATE ${table} SET file_data = '' WHERE id = ?`, args: [id] });
        cleared++;
    }
    return cleared;
}

async function report(client) {
    const out = {};
    for (const { table } of TABLES) {
        out[table] = (await client.execute(
            `SELECT COUNT(*) AS total,
                    SUM(file_key IS NULL AND file_data <> '') AS only_in_db,
                    SUM(file_key IS NOT NULL AND file_data <> '') AS on_r2_and_db,
                    SUM(file_key IS NOT NULL AND file_data = '') AS only_on_r2
             FROM ${table}`
        )).rows[0];
    }
    return out;
}

async function main() {
    const args = process.argv.slice(2);
    const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

    if (args.includes('--apply')) {
        for (const spec of TABLES) {
            if (args.includes('--clear')) console.log(`${spec.table}: ${await clearDatabaseCopies(client, spec)} database copies cleared`);
            else console.log(`${spec.table}: ${await copyToR2(client, spec)} files copied to R2`);
        }
    }
    console.log(await report(client));
    client.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
