/**
 * Adds phone to users: the client's phone number, saved by the admin. Nullable, so
 * existing users simply have none. Idempotent.
 * Run BEFORE deploying the code that reads phone.
 *
 *   node scripts/migrations/004-user-phone.js --db file:database/prod-copy.db
 *   node scripts/migrations/004-user-phone.js --apply      (production, from .env)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const { createClient } = require('@libsql/client');

async function migrate(client) {
    const columns = (await client.execute('PRAGMA table_info(users)')).rows.map((c) => c.name);
    if (columns.includes('phone')) return { added: [] };
    await client.execute('ALTER TABLE users ADD COLUMN phone TEXT');
    return { added: ['users.phone'] };
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
