const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, adminToken, userToken, tokenFor, TEST_USER, ADMIN } = require('./helpers');

before(start);
after(stop);

describe('auth', () => {
    it('GET /api/health is public', async () => {
        const res = await api('GET', '/api/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'OK');
    });

    it('GET /api/auth/verify returns the user for a valid token', async () => {
        const res = await api('GET', '/api/auth/verify', { token: userToken() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.user.id, TEST_USER.id);
        assert.equal(res.body.data.user.username, TEST_USER.username);
    });

    it('GET /api/auth/verify rejects a missing or bad token', async () => {
        assert.equal((await api('GET', '/api/auth/verify')).status, 401);
        assert.equal((await api('GET', '/api/auth/verify', { token: 'garbage' })).status, 401);
    });

    it('POST /api/auth/login-link exchanges a login link for a session token', async () => {
        const link = tokenFor(TEST_USER, { type: 'login_link' });
        const res = await api('POST', '/api/auth/login-link', { body: { token: link } });
        assert.equal(res.status, 200);
        assert.ok(res.body.data.token);
        assert.equal(res.body.data.user.id, TEST_USER.id);
    });

    it('a login-link token is not a session token', async () => {
        const link = tokenFor(TEST_USER, { type: 'login_link' });
        assert.equal((await api('GET', '/api/workout/plan', { token: link })).status, 403);
        assert.equal((await api('GET', '/api/videos', { token: link })).status, 403);
    });

    it('POST /api/auth/login-link refuses a session token', async () => {
        const res = await api('POST', '/api/auth/login-link', { body: { token: userToken() } });
        assert.equal(res.status, 401);
    });

    it('POST /api/auth/login validates input and credentials', async () => {
        assert.equal((await api('POST', '/api/auth/login', { body: {} })).status, 400);
        const res = await api('POST', '/api/auth/login', { body: { username: ADMIN.username, password: 'wrong-password' } });
        assert.equal(res.status, 401);
    });
});

describe('access control', () => {
    const adminOnly = [
        ['GET', '/api/admin/users'],
        ['GET', '/api/admin/videos'],
        ['GET', `/api/training-days/users/${TEST_USER.id}/training-days`],
        ['GET', `/api/workout/admin/plan/${TEST_USER.id}`],
        ['GET', `/api/workout/admin/links/${TEST_USER.id}`],
        ['GET', `/api/pdf/admin/user/${TEST_USER.id}`],
        ['GET', `/api/body-composition/admin/${TEST_USER.id}`],
        ['GET', '/api/integration/admin/products'],
        ['GET', '/api/feedback/admin/all'],
        ['GET', '/api/feedback/admin/unread-count'],
        ['GET', `/api/feedback/admin/user/${TEST_USER.id}`],
    ];

    for (const [method, url] of adminOnly) {
        it(`${method} ${url} needs a token`, async () => {
            assert.equal((await api(method, url)).status, 401);
        });

        it(`${method} ${url} is forbidden to clients`, async () => {
            assert.equal((await api(method, url, { token: userToken() })).status, 403);
        });

        it(`${method} ${url} works for the admin`, async () => {
            assert.equal((await api(method, url, { token: adminToken() })).status, 200);
        });
    }

    it('a client whose username contains "admin" is not an admin', { todo: 'security phase: feedback routes use username.includes("admin")' }, async () => {
        const db = require('./helpers').db();
        const created = await db.execute("INSERT INTO users (username, first_name, last_name) VALUES ('admin.rossi', 'Mario', 'Rossi')");
        const fakeAdmin = { id: Number(created.lastInsertRowid), username: 'admin.rossi' };
        for (const url of ['/api/feedback/admin/all', '/api/feedback/admin/unread-count']) {
            assert.equal((await api('GET', url, { token: tokenFor(fakeAdmin) })).status, 403, url);
        }
    });

    it('client routes need a token', async () => {
        for (const url of ['/api/videos', '/api/workout/plan', '/api/pdf/my-pdf', '/api/feedback/should-show']) {
            assert.equal((await api('GET', url)).status, 401, url);
        }
    });

    it('a client cannot download another user\'s PDF', async () => {
        const res = await api('GET', '/api/pdf/download?userId=240', { token: userToken() });
        assert.equal(res.status, 403);
    });

    it('unknown endpoints return 404 JSON', async () => {
        const res = await api('GET', '/api/does-not-exist');
        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
    });
});
