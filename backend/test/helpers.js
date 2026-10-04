/**
 * Test harness: boots the real Express app against a throwaway copy of the
 * local production snapshot (database/prod-copy.db, see scripts/snapshot-prod-db.js).
 *
 * Every external side effect is switched off before the app is loaded:
 * the database is a local file, emails and Vercel analytics have no keys,
 * R2 only presigns URLs (a local computation, nothing is uploaded).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');

const SNAPSHOT = path.join(__dirname, '..', 'database', 'prod-copy.db');

const ADMIN = { id: 311, username: 'joshua_admin' };
const TEST_USER = { id: 165, username: 'Bubbo' };
const JWT_SECRET = 'test-secret';

let server;
let baseUrl;
let dbFile;

function prepareEnv() {
    if (!fs.existsSync(SNAPSHOT)) {
        throw new Error(`Missing ${SNAPSHOT}: run "node scripts/snapshot-prod-db.js" first`);
    }
    dbFile = path.join(os.tmpdir(), `pt-test-${process.pid}-${Date.now()}.db`);
    fs.copyFileSync(SNAPSHOT, dbFile);

    // Set before dotenv runs: dotenv never overrides variables that already exist
    Object.assign(process.env, {
        NODE_ENV: 'test',
        TURSO_DATABASE_URL: `file:${dbFile}`,
        TURSO_AUTH_TOKEN: 'local',
        JWT_SECRET,
        ADMIN_USERNAME: ADMIN.username,
        CRON_SECRET: 'cron-test-secret',
        RESEND_API_KEY: '',
        ADMIN_EMAIL: '',
        VERCEL_TOKEN: '',
        VERCEL_PROJECT_ID: '',
        R2_ACCOUNT_ID: 'test',
        R2_ACCESS_KEY_ID: 'test',
        R2_SECRET_ACCESS_KEY: 'test',
        R2_BUCKET_NAME: 'test',
    });
}

async function start() {
    if (server) return baseUrl;
    prepareEnv();
    // The test runner reads the child's stdout: the app's chatty logs can corrupt it
    console.log = () => {};
    console.info = () => {};
    const app = require('../server');
    if (!process.env.TURSO_DATABASE_URL.startsWith('file:')) {
        throw new Error('Refusing to run tests against a remote database');
    }
    await new Promise((resolve) => {
        server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    return baseUrl;
}

async function stop() {
    if (server) await new Promise((resolve) => server.close(resolve));
    server = null;
}

function tokenFor(user, extra = {}) {
    return jwt.sign({ userId: user.id, username: user.username, email: null, ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

const adminToken = () => tokenFor(ADMIN);
const userToken = (user = TEST_USER) => tokenFor(user);

/** JSON request; returns { status, body, headers }. */
async function api(method, url, { token, body, headers = {} } = {}) {
    const res = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
            ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        redirect: 'manual',
    });
    const type = res.headers.get('content-type') || '';
    const parsed = type.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, body: parsed, headers: res.headers };
}

/** Direct access to the test database, for setup and assertions (one shared connection). */
let directClient;
function db() {
    if (!directClient) {
        const { createClient } = require('@libsql/client');
        directClient = createClient({ url: `file:${dbFile}` });
    }
    return directClient;
}

module.exports = { start, stop, api, adminToken, userToken, tokenFor, db, ADMIN, TEST_USER, JWT_SECRET };
