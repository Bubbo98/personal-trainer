/**
 * Adds disclaimer_accepted_at to trials: when the person accepted the health notice
 * of the trial plan (generic plan, see a doctor first, use at your own risk), at the
 * online signup or at the first opening of the dashboard. Nullable. Idempotent.
 * Run BEFORE deploying the code that reads it.
 *
 *   node scripts/migrations/007-trial-disclaimer.js --db file:database/prod-copy.db
 *   node scripts/migrations/007-trial-disclaimer.js --apply      (production, from .env)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const { createClient } = require('@libsql/client');

async function migrate(client) {
    const columns = (await client.execute('PRAGMA table_info(trials)')).rows.map((c) => c.name);
    if (columns.includes('disclaimer_accepted_at')) return { added: [] };
    await client.execute('ALTER TABLE trials ADD COLUMN disclaimer_accepted_at DATETIME');
    return { added: ['trials.disclaimer_accepted_at'] };
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
