/**
 * 7-day trials (see services/trials):
 *   - users.account_type: 'client' (default), 'trial' (a person trying the method),
 *     'trial_template' (holds the plan of a trial template, never logs in);
 *   - trial_templates: the plans a trial starts from (gym / calisthenics, by level),
 *     with the questionnaire score range that picks them for online signups;
 *   - trials: one row per trial (free session in the gym or online signup), with the
 *     person's contacts and answers; it outlives the trial user, who is deleted later;
 *   - app_settings: small JSON settings (the online questionnaire).
 * Idempotent. Run BEFORE deploying the code that uses them.
 *
 *   node scripts/migrations/006-trials.js --db file:database/prod-copy.db
 *   node scripts/migrations/006-trials.js --apply      (production, from .env)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const { createClient } = require('@libsql/client');

async function migrate(client) {
    const created = [];
    const tableExists = async (name) =>
        (await client.execute({ sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", args: [name] })).rows.length > 0;

    const userColumns = (await client.execute('PRAGMA table_info(users)')).rows.map((c) => c.name);
    if (!userColumns.includes('account_type')) {
        await client.execute("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'client'");
        created.push('users.account_type');
    }

    if (!(await tableExists('trial_templates'))) {
        await client.batch([
            `CREATE TABLE trial_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                discipline TEXT NOT NULL,           -- 'gym' | 'calisthenics'
                description TEXT,
                user_id INTEGER NOT NULL,           -- the 'trial_template' user holding the plan
                online INTEGER NOT NULL DEFAULT 0,  -- 1: online signups may get it
                min_score INTEGER,                  -- questionnaire score range (inclusive, NULL = open)
                max_score INTEGER,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,
        ], 'write');
        created.push('trial_templates');
    }

    if (!(await tableExists('trials'))) {
        await client.batch([
            `CREATE TABLE trials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,                 -- 'free_session' | 'online'
                template_id INTEGER,
                template_name TEXT,                 -- copy: the template may be deleted later
                user_id INTEGER,                    -- the trial user; NULL once deleted
                first_name TEXT,
                last_name TEXT,
                email TEXT,
                phone TEXT,
                discipline TEXT,
                score INTEGER,
                answers TEXT,                       -- JSON [{ question, answer, points }] as shown at signup
                privacy_accepted_at DATETIME,
                marketing_consent INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'to_contact', -- 'to_contact' | 'contacted' | 'client' | 'not_interested'
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                opened_at DATETIME,                 -- first opening of the link: the 7 days start here
                expires_at DATETIME,
                end_notified_at DATETIME,           -- the trainer was told the trial ended
                ip_hash TEXT,                       -- online signups: keyed hash of the IP (signup limits, see routes/trials)
                phone_digits TEXT,                  -- the phone number's digits without +39, to spot a second trial
                last_email_at DATETIME,             -- last access email sent (resends are throttled)
                FOREIGN KEY (template_id) REFERENCES trial_templates(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`,
            'CREATE UNIQUE INDEX idx_trials_user ON trials(user_id)',
            'CREATE INDEX idx_trials_email ON trials(email)',
            'CREATE INDEX idx_trials_created ON trials(created_at)',
            'CREATE INDEX idx_trials_ip ON trials(ip_hash, created_at)',
            'CREATE INDEX idx_trials_phone ON trials(phone_digits)',
        ], 'write');
        created.push('trials');
    }

    if (!(await tableExists('app_settings'))) {
        await client.execute(`CREATE TABLE app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        created.push('app_settings');
    }

    return { created };
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
