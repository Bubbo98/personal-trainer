const { createClient } = require('@libsql/client');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// ── Turso singleton ──────────────────────────────────────────────────────────
// One client for the lifetime of the process — avoids per-request connection overhead.
let _tursoClient = null;

function getTursoClient() {
    if (!_tursoClient) {
        _tursoClient = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
    return _tursoClient;
}

// ── Local SQLite singleton ───────────────────────────────────────────────────
let _localDb = null;

function getLocalDb() {
    if (!_localDb) {
        const dbPath = process.env.DB_PATH || './database/app.db';
        _localDb = new sqlite3.Database(dbPath);
    }
    return _localDb;
}

// ── Factory ──────────────────────────────────────────────────────────────────
function createDatabase() {
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        return createTursoWrapper();
    }
    return createLocalWrapper();
}

function createTursoWrapper() {
    const client = getTursoClient();

    return {
        get: async (query, params = []) => {
            const result = await client.execute({ sql: query, args: params });
            return result.rows[0] || null;
        },

        all: async (query, params = []) => {
            const result = await client.execute({ sql: query, args: params });
            return result.rows;
        },

        run: async (query, params = []) => {
            const result = await client.execute({ sql: query, args: params });
            return {
                lastInsertRowid: result.lastInsertRowid,
                changes: result.rowsAffected,
            };
        },

        close: () => { /* singleton — never close */ },

        getCallback: (query, params, callback) => {
            client.execute({ sql: query, args: params })
                .then(result => callback(null, result.rows[0] || null))
                .catch(err => callback(err, null));
        },

        allCallback: (query, params, callback) => {
            client.execute({ sql: query, args: params })
                .then(result => callback(null, result.rows))
                .catch(err => callback(err, null));
        },

        runCallback: (query, params, callback) => {
            client.execute({ sql: query, args: params })
                .then(result => {
                    const lastID = result.lastInsertRowid != null
                        ? Number(result.lastInsertRowid)
                        : undefined;
                    callback.call({ lastID, changes: result.rowsAffected }, null);
                })
                .catch(err => callback(err));
        },
    };
}

function createLocalWrapper() {
    const db = getLocalDb();

    return {
        get: (query, params, callback) => db.get(query, params, callback),
        all: (query, params, callback) => db.all(query, params, callback),
        run: (query, params, callback) => db.run(query, params, callback),

        close: () => { /* singleton — never close */ },

        getCallback(query, params, callback) { this.get(query, params, callback); },
        allCallback(query, params, callback) { this.all(query, params, callback); },
        runCallback(query, params, callback) { this.run(query, params, callback); },
    };
}

module.exports = { createDatabase };
