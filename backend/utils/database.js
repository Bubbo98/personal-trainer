const { createClient } = require('@libsql/client');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Database factory - returns the appropriate client based on environment
function createDatabase() {
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        console.log('Using Turso cloud database');
        return createTursoClient();
    } else {
        console.log('Using local SQLite database');
        return createLocalClient();
    }
}

// Turso cloud client
function createTursoClient() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    return {
        // Wrapper to make Turso API similar to sqlite3
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
                changes: result.rowsAffected
            };
        },

        close: () => {
            // Turso client doesn't need explicit closing
        },

        // For compatibility with sqlite3 callbacks
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
                    const context = {
                        lastID: result.lastInsertRowid,
                        changes: result.rowsAffected
                    };
                    callback.call(context, null);
                })
                .catch(err => callback(err));
        }
    };
}

// Local SQLite client (for development)
function createLocalClient() {
    const dbPath = process.env.DB_PATH || './database/app.db';

    return {
        // Direct sqlite3 wrapper
        get: (query, params, callback) => {
            const db = new sqlite3.Database(dbPath);
            db.get(query, params, (err, row) => {
                db.close();
                callback(err, row);
            });
        },

        all: (query, params, callback) => {
            const db = new sqlite3.Database(dbPath);
            db.all(query, params, (err, rows) => {
                db.close();
                callback(err, rows);
            });
        },

        run: (query, params, callback) => {
            const db = new sqlite3.Database(dbPath);
            db.run(query, params, function(err) {
                const context = {
                    lastID: this.lastID,
                    changes: this.changes
                };
                db.close();
                callback.call(context, err);
            });
        },

        // For compatibility
        getCallback: function(query, params, callback) {
            this.get(query, params, callback);
        },

        allCallback: function(query, params, callback) {
            this.all(query, params, callback);
        },

        runCallback: function(query, params, callback) {
            this.run(query, params, callback);
        },

        close: () => {}
    };
}

module.exports = { createDatabase };