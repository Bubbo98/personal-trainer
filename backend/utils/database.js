const { createClient } = require('@libsql/client');
const config = require('../config');

/**
 * One libsql client for the whole process: Turso in production, a local file
 * otherwise (see config.database).
 *
 *   db.query(sql, params)   → rows
 *   db.get(sql, params)     → first row or null
 *   db.run(sql, params)     → { lastId, changes }
 *   db.batch([{ sql, params }])        → runs every statement in one transaction
 *   db.transaction(async (tx) => …)    → tx has query/get/run; commits or rolls back
 */

let client = null;

function getClient() {
    if (!client) {
        const { url, authToken } = config.database;
        client = createClient(url.startsWith('file:') ? { url } : { url, authToken });
    }
    return client;
}

/** libsql rejects undefined (sqlite3 used to bind it as NULL). */
const toArgs = (params = []) => params.map((p) => (p === undefined ? null : p));

const toRunResult = (result) => ({
    lastId: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined,
    changes: result.rowsAffected,
});

/** query/get/run on anything with libsql's execute() (the client or a transaction). */
function executor(target) {
    const execute = (sql, params) => target.execute({ sql, args: toArgs(params) });
    return {
        query: async (sql, params) => (await execute(sql, params)).rows,
        get: async (sql, params) => (await execute(sql, params)).rows[0] || null,
        run: async (sql, params) => toRunResult(await execute(sql, params)),
    };
}

const db = {
    ...executor({ execute: (stmt) => getClient().execute(stmt) }),

    async batch(statements) {
        if (statements.length === 0) return [];
        const results = await getClient().batch(
            statements.map(({ sql, params }) => ({ sql, args: toArgs(params) })),
            'write'
        );
        return results.map(toRunResult);
    },

    async transaction(work) {
        const tx = await getClient().transaction('write');
        try {
            const result = await work(executor(tx));
            await tx.commit();
            return result;
        } catch (err) {
            await tx.rollback().catch(() => {});
            throw err;
        } finally {
            tx.close();
        }
    },
};

module.exports = { db };
