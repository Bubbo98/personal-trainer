const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, userToken, db, TEST_USER } = require('./helpers');

before(start);
after(stop);

const token = () => userToken();

describe('client videos', () => {
    it('GET /api/videos lists the user\'s videos with signed URLs', async () => {
        const res = await api('GET', '/api/videos', { token: token() });
        assert.equal(res.status, 200);
        assert.ok(res.body.data.videos.length > 0);
        const video = res.body.data.videos[0];
        for (const key of ['id', 'title', 'filePath', 'signedUrl', 'category']) assert.ok(key in video, key);
        assert.match(video.signedUrl, /^https:\/\//);
        assert.equal(res.body.data.totalCount, res.body.data.videos.length);
    });

    it('GET /api/videos/categories counts videos per category', async () => {
        const res = await api('GET', '/api/videos/categories', { token: token() });
        assert.equal(res.status, 200);
        for (const c of res.body.data.categories) assert.ok(c.name && c.videoCount > 0);
    });

    it('GET /api/videos/training-days returns days with videos, exercise links and techniques', async () => {
        const res = await api('GET', '/api/videos/training-days', { token: token() });
        assert.equal(res.status, 200);
        const days = res.body.data.trainingDays;
        assert.equal(days.length, 4);
        assert.deepEqual(days.map((d) => d.dayNumber), [1, 2, 3, 4]);
        const day1 = days[0];
        assert.ok(day1.videos.length >= 9);
        const linked = day1.videos.filter((v) => v.exerciseId != null);
        assert.ok(linked.length > 0);
        const withTechnique = day1.videos.find((v) => v.techniques.length > 0);
        assert.ok(withTechnique, 'False grip has the "Come zavorrarsi" technique');
        assert.match(withTechnique.techniques[0].signedUrl, /^https:\/\//);
        for (const v of day1.videos) assert.ok('assignmentId' in v && 'orderIndex' in v && 'groupId' in v);
    });

    it('GET /api/videos/:id returns one video and logs the access', async () => {
        const list = await api('GET', '/api/videos', { token: token() });
        const id = list.body.data.videos[0].id;
        const res = await api('GET', `/api/videos/${id}`, { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.video.id, id);
        const logs = await db().execute({ sql: 'SELECT count(*) n FROM access_logs WHERE user_id = ? AND video_id = ?', args: [TEST_USER.id, id] });
        assert.equal(Number(logs.rows[0].n), 1);
    });

    it('GET /api/videos/:id refuses a video the user has no access to', async () => {
        const res = await api('GET', '/api/videos/999999', { token: token() });
        assert.equal(res.status, 404);
    });

    it('GET /api/videos/category/:category filters by category', async () => {
        const cats = (await api('GET', '/api/videos/categories', { token: token() })).body.data.categories;
        const res = await api('GET', `/api/videos/category/${encodeURIComponent(cats[0].name)}`, { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.videos.length, cats[0].videoCount);
    });
});

describe('client workout', () => {
    it('GET /api/workout/plan returns the plan ordered by day and position', async () => {
        const res = await api('GET', '/api/workout/plan', { token: token() });
        assert.equal(res.status, 200);
        const ex = res.body.data.exercises;
        assert.equal(ex.length, 23);
        const keys = ex.map((e) => e.day_number * 1000 + e.order_index);
        assert.deepEqual(keys, [...keys].sort((a, b) => a - b));
    });

    it('POST /api/workout/logs upserts the weekly log of an exercise', async () => {
        const plan = (await api('GET', '/api/workout/plan', { token: token() })).body.data.exercises;
        const exerciseId = plan[0].id;
        const weekStart = '2026-09-28';
        const first = await api('POST', '/api/workout/logs', { token: token(), body: { exerciseId, weekStart, weight: '20', repsDone: '10' } });
        assert.equal(first.status, 200);
        await api('POST', '/api/workout/logs', { token: token(), body: { exerciseId, weekStart, weight: '25', repsDone: '10' } });

        const week = await api('GET', `/api/workout/logs?weekStart=${weekStart}`, { token: token() });
        const logs = week.body.data.logs.filter((l) => l.exercise_id === exerciseId);
        assert.equal(logs.length, 1);
        assert.equal(logs[0].weight, '25');
        assert.equal(logs[0].exercise_name, plan[0].name);
    });

    it('POST /api/workout/logs refuses another user\'s exercise and missing fields', async () => {
        const other = await db().execute('SELECT id FROM training_exercises WHERE user_id <> 165 LIMIT 1');
        const res = await api('POST', '/api/workout/logs', { token: token(), body: { exerciseId: Number(other.rows[0].id), weekStart: '2026-09-28' } });
        assert.equal(res.status, 403);
        assert.equal((await api('POST', '/api/workout/logs', { token: token(), body: {} })).status, 400);
    });
});

describe('client PDF', () => {
    it('GET /api/pdf/my-pdf describes the plan', async () => {
        const res = await api('GET', '/api/pdf/my-pdf', { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.locked, false);
        assert.ok(res.body.data.originalName);
    });

    it('GET /api/pdf/download returns the PDF bytes', async () => {
        const res = await api('GET', '/api/pdf/download', { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'application/pdf');
        assert.equal(res.body.subarray(0, 4).toString(), '%PDF');
    });

    it('a plan visible in the future is locked', async () => {
        await db().execute({ sql: "UPDATE user_pdf_files SET visible_from = datetime('now', '+3 days') WHERE user_id = ?", args: [TEST_USER.id] });
        const res = await api('GET', '/api/pdf/my-pdf', { token: token() });
        assert.equal(res.body.data.locked, true);
        assert.equal((await api('GET', '/api/pdf/download', { token: token() })).status, 403);
        await db().execute({ sql: 'UPDATE user_pdf_files SET visible_from = NULL WHERE user_id = ?', args: [TEST_USER.id] });
    });
});

describe('client feedback', () => {
    const validCheck = {
        firstName: 'Test', lastName: 'User', email: 'test@example.com',
        energyLevel: 'high', workoutsCompleted: 'all', mealPlanFollowed: 'mostly',
        sleepQuality: 'good', physicalDiscomfort: 'minor', discomfortDetails: 'spalla',
        muscularZones: ['spalla'], motivationLevel: 'good', currentWeight: '70.5',
    };

    it('GET /api/feedback/should-show respects the check-in exemption', async () => {
        const res = await api('GET', '/api/feedback/should-show', { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.shouldShow, false);
        assert.equal(res.body.data.reason, 'exempt');
    });

    it('POST /api/feedback validates the answers', async () => {
        const res = await api('POST', '/api/feedback', { token: token(), body: { ...validCheck, energyLevel: 'huge' } });
        assert.equal(res.status, 400);
        const weight = await api('POST', '/api/feedback', { token: token(), body: { ...validCheck, currentWeight: '5' } });
        assert.equal(weight.status, 400);
    });

    it('POST /api/feedback stores a check, GET /my-feedbacks lists it', async () => {
        const res = await api('POST', '/api/feedback', { token: token(), body: validCheck });
        assert.equal(res.status, 201);
        assert.equal(res.body.data.feedback.user_id, TEST_USER.id);
        assert.equal(res.body.data.feedback.muscular_zones, '["spalla"]');
        const mine = await api('GET', '/api/feedback/my-feedbacks', { token: token() });
        assert.equal(mine.status, 200);
        assert.ok(mine.body.data.feedbacks.some((f) => f.id === res.body.data.feedback.id));
    });

    it('trainer-seen notification can be read and dismissed', async () => {
        const res = await api('GET', '/api/feedback/trainer-seen-notification', { token: token() });
        assert.equal(res.status, 200);
        assert.equal((await api('POST', '/api/feedback/dismiss-trainer-seen', { token: token() })).status, 200);
    });
});

describe('client reviews, integration, body composition', () => {
    it('public review lists need no token', async () => {
        assert.equal((await api('GET', '/api/reviews/public')).status, 200);
        assert.equal((await api('GET', '/api/reviews/featured')).status, 200);
    });

    it('a client can write, read and delete their review', async () => {
        assert.equal((await api('POST', '/api/reviews', { token: token(), body: { rating: 5, comment: 'short' } })).status, 400);
        const created = await api('POST', '/api/reviews', { token: token(), body: { rating: 5, title: 'Top', comment: 'Allenamenti fantastici!' } });
        assert.ok([200, 201].includes(created.status));
        const mine = await api('GET', '/api/reviews/my', { token: token() });
        assert.equal(mine.status, 200);
        assert.equal((await api('DELETE', '/api/reviews/my', { token: token() })).status, 200);
    });

    it('GET /api/integration/products returns the catalog', async () => {
        const res = await api('GET', '/api/integration/products', { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.categories.length, 6);
        assert.ok(res.body.data.categories.every((c) => Array.isArray(c.products)));
    });

    it('GET /api/body-composition/my-reports lists the user\'s reports', async () => {
        const res = await api('GET', '/api/body-composition/my-reports', { token: token() });
        assert.equal(res.status, 200);
    });
});
