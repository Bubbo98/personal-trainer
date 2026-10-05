/**
 * exercise_logs.exercise_id: ON DELETE CASCADE → ON DELETE SET NULL (and nullable).
 *
 * With CASCADE, replacing or re-extracting a plan deleted every weight the
 * client had logged. Logs already carry name/day snapshots, so once detached
 * from a deleted exercise they stay in the history.
 *
 * SQLite can't alter a foreign key: the table is rebuilt in one transaction.
 * A JSON backup of every row is written first (backend/database/backups/, git-ignored).
 *
 *   node scripts/migrations/001-exercise-logs-keep-history.js --db file:database/prod-copy.db
 *   node scripts/migrations/001-exercise-logs-keep-history.js --apply      (production, from .env)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const NEW_TABLE = `CREATE TABLE exercise_logs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_id INTEGER,
    week_start DATE NOT NULL,
    weight VARCHAR(50),
    sets_done INTEGER,
    reps_done VARCHAR(50),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    exercise_name VARCHAR(255),
    day_number_snapshot INTEGER,
    day_name_snapshot VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES training_exercises(id) ON DELETE SET NULL,
    UNIQUE(user_id, exercise_id, week_start)
)`;

const COLUMNS = 'id, user_id, exercise_id, week_start, weight, sets_done, reps_done, notes, created_at, updated_at, exercise_name, day_number_snapshot, day_name_snapshot';

/** Runs the migration on a libsql client; returns a short report. */
async function migrate(client, { backupDir } = {}) {
    const current = (await client.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'exercise_logs'")).rows[0];
    if (!current) throw new Error('exercise_logs table not found');
    if (/ON DELETE SET NULL/i.test(current.sql)) return { skipped: true, reason: 'already migrated' };

    const rows = (await client.execute(`SELECT ${COLUMNS} FROM exercise_logs ORDER BY id`)).rows;
    if (backupDir) {
        fs.mkdirSync(backupDir, { recursive: true });
        const file = path.join(backupDir, `exercise_logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(file, JSON.stringify({ schema: current.sql, rows }, null, 1));
        console.log(`Backup: ${rows.length} rows → ${file}`);
    }

    await client.batch([
        NEW_TABLE,
        `INSERT INTO exercise_logs_new (${COLUMNS}) SELECT ${COLUMNS} FROM exercise_logs`,
        'DROP TABLE exercise_logs',
        'ALTER TABLE exercise_logs_new RENAME TO exercise_logs',
        'CREATE INDEX idx_exercise_logs_user ON exercise_logs(user_id)',
        'CREATE INDEX idx_exercise_logs_week ON exercise_logs(user_id, week_start)',
    ], 'write');

    const after = Number((await client.execute('SELECT count(*) AS n FROM exercise_logs')).rows[0].n);
    if (after !== rows.length) throw new Error(`Row count changed: ${rows.length} → ${after}`);
    return { skipped: false, rows: after };
}

async function main() {
    const args = process.argv.slice(2);
    const dbArg = args.includes('--db') ? args[args.indexOf('--db') + 1] : null;
    const url = dbArg || process.env.TURSO_DATABASE_URL;
    const isRemote = !url.startsWith('file:');
    if (isRemote && !args.includes('--apply')) {
        throw new Error(`Refusing to touch ${url} without --apply`);
    }

    const client = createClient(isRemote ? { url, authToken: process.env.TURSO_AUTH_TOKEN } : { url });
    const report = await migrate(client, { backupDir: path.join(__dirname, '..', '..', 'database', 'backups') });
    console.log(url.replace(/\/\/.*@/, '//'), report);
    client.close();
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { migrate };
