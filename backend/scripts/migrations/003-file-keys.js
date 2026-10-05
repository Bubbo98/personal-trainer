/**
 * Adds file_key (R2 object key) to user_pdf_files and body_composition_reports.
 * Only adds nullable columns: existing rows keep their base64 file_data, which the
 * code reads until scripts/move-files-to-r2.js copies them to R2. Idempotent.
 * Run BEFORE deploying the code that reads file_key.
 *
 *   node scripts/migrations/003-file-keys.js --db file:database/prod-copy.db
 *   node scripts/migrations/003-file-keys.js --apply      (production, from .env)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const { createClient } = require('@libsql/client');

const TABLES = ['user_pdf_files', 'body_composition_reports'];

async function migrate(client) {
    const added = [];
    for (const table of TABLES) {
        const columns = (await client.execute(`PRAGMA table_info(${table})`)).rows.map((c) => c.name);
        if (columns.includes('file_key')) continue;
        await client.execute(`ALTER TABLE ${table} ADD COLUMN file_key TEXT`);
        added.push(table);
    }
    return { added };
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
