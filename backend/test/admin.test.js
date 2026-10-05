const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, adminToken, userToken, tokenFor, db, TEST_USER } = require('./helpers');

before(start);
after(stop);

const token = () => adminToken();
const MICHELA = 240;

/** A tiny but valid PDF, so no real client file is needed. */
function fakePdf() {
    return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
}

describe('admin users', () => {
    let createdId;

    it('GET /api/admin/users lists active users with their plan', async () => {
        const res = await api('GET', '/api/admin/users', { token: token() });
        assert.equal(res.status, 200);
        const test = res.body.data.users.find((u) => u.id === TEST_USER.id);
        assert.ok(test.pdf && test.pdf.expirationDate !== undefined);
        assert.equal(test.checkinExempt, true);
        assert.equal(res.body.data.totalCount, res.body.data.users.length);
    });

    it('GET /api/admin/trainers lists trainers', async () => {
        const res = await api('GET', '/api/admin/trainers', { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.trainers.length, 2);
    });

    it('POST /api/admin/users creates a user with a login link', async () => {
        const res = await api('POST', '/api/admin/users', { token: token(), body: { username: 'test.refactor', firstName: 'Re', lastName: 'Factor', email: 'refactor@example.com' } });
        assert.equal(res.status, 201);
        createdId = res.body.data.user.id;
        assert.equal(res.body.data.user.isPaying, true);
        assert.equal(res.body.data.user.trainerId, 1);
        assert.match(res.body.data.loginUrl, /\/dashboard\/.+/);
        const dup = await api('POST', '/api/admin/users', { token: token(), body: { username: 'test.refactor', firstName: 'A', lastName: 'B' } });
        assert.equal(dup.status, 409);
    });

    it('POST /api/admin/users works without first/last name', async () => {
        const res = await api('POST', '/api/admin/users', { token: token(), body: { username: 'test.noname' } });
        assert.equal(res.status, 201);
    });

    it('PUT /api/admin/users/:id updates fields; duplicate email is 409', async () => {
        const res = await api('PUT', `/api/admin/users/${createdId}`, { token: token(), body: { firstName: 'Nuovo', checkinExempt: true } });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.user.firstName, 'Nuovo');
        assert.equal(res.body.data.user.checkinExempt, true);
        const other = await db().execute('SELECT email FROM users WHERE email IS NOT NULL AND id <> ? LIMIT 1', [createdId]);
        const dup = await api('PUT', `/api/admin/users/${createdId}`, { token: token(), body: { email: other.rows[0].email } });
        assert.equal(dup.status, 409);
        assert.equal((await api('PUT', `/api/admin/users/${createdId}`, { token: token(), body: {} })).status, 400);
    });

    it('POST /api/admin/users/:id/generate-link returns a working login link', async () => {
        const res = await api('POST', `/api/admin/users/${createdId}/generate-link`, { token: token() });
        assert.equal(res.status, 200);
        const login = await api('POST', '/api/auth/login-link', { body: { token: res.body.data.loginToken } });
        assert.equal(login.status, 200);
    });

    it('video permissions can be granted and revoked', async () => {
        const videoId = Number((await db().execute('SELECT id FROM videos WHERE is_active = 1 LIMIT 1')).rows[0].id);
        const grant = await api('POST', `/api/admin/users/${createdId}/videos/${videoId}`, { token: token(), body: {} });
        assert.equal(grant.status, 200);
        assert.equal((await api('POST', `/api/admin/users/${createdId}/videos/${videoId}`, { token: token(), body: {} })).status, 400);
        const list = await api('GET', `/api/admin/users/${createdId}/videos`, { token: token() });
        assert.deepEqual(list.body.data.videos.map((v) => v.id), [videoId]);
        assert.equal((await api('DELETE', `/api/admin/users/${createdId}/videos/${videoId}`, { token: token() })).status, 200);
        assert.equal((await api('GET', `/api/admin/users/${createdId}/videos`, { token: token() })).body.data.videos.length, 0);
    });

    it('DELETE /api/admin/users/:id deactivates; re-creating reactivates', async () => {
        assert.equal((await api('DELETE', `/api/admin/users/${createdId}`, { token: token() })).status, 200);
        const again = await api('POST', '/api/admin/users', { token: token(), body: { username: 'test.refactor', firstName: 'Re', lastName: 'Factor' } });
        assert.equal(again.status, 201);
        assert.equal(again.body.data.reactivated, true);
        assert.equal(again.body.data.user.id, createdId);
    });
});

describe('admin videos', () => {
    let videoId;

    it('GET /api/admin/videos lists all videos, with optional pagination and filters', async () => {
        const all = await api('GET', '/api/admin/videos', { token: token() });
        assert.equal(all.status, 200);
        assert.equal(all.body.data.videos.length, all.body.data.totalCount);
        assert.ok('missingThumbnailCount' in all.body.data);

        const page = await api('GET', '/api/admin/videos?page=2&limit=10', { token: token() });
        assert.equal(page.body.data.videos.length, 10);
        assert.equal(page.body.data.currentPage, 2);

        const tech = await api('GET', '/api/admin/videos?muscleGroup=Tecniche', { token: token() });
        assert.ok(tech.body.data.videos.every((v) => v.muscleGroup === 'Tecniche'));
    });

    it('a numeric search ranks titles by the matching number', async () => {
        const res = await api('GET', '/api/admin/videos?search=5', { token: token() });
        const first = res.body.data.videos[0].title;
        assert.match(first, /(^|\D)5(\D|$)/);
    });

    it('videos can be created, updated, previewed and deleted', async () => {
        const created = await api('POST', '/api/admin/videos', { token: token(), body: { title: 'Test video', filePath: 'palestra/test.mp4', category: 'palestra', muscleGroup: 'Petto' } });
        assert.equal(created.status, 201);
        videoId = created.body.data.id;
        assert.equal((await api('POST', '/api/admin/videos', { token: token(), body: { title: 'x' } })).status, 400);

        const updated = await api('PUT', `/api/admin/videos/${videoId}`, { token: token(), body: { title: 'Test video 2', muscleGroup: 'Dorso' } });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.data.muscleGroup, 'Dorso');

        const preview = await api('GET', `/api/admin/videos/${videoId}/preview`, { token: token() });
        assert.equal(preview.status, 200);
        assert.match(preview.body.data.video.signedUrl, /^https:\/\//);

        assert.equal((await api('DELETE', `/api/admin/videos/${videoId}`, { token: token() })).status, 200);
        assert.equal((await api('GET', `/api/admin/videos/${videoId}/preview`, { token: token() })).status, 404);
    });

    it('upload URLs are presigned for videos and thumbnails', async () => {
        const video = await api('POST', '/api/admin/videos/upload-url', { token: token(), body: { fileName: 'Squat.mp4', fileType: 'video/mp4', category: 'palestra' } });
        assert.equal(video.status, 200);
        assert.equal(video.body.data.filePath, 'palestra/Squat.mp4');

        // No folders in the name, only known categories, never overwrite an existing file
        const traversal = await api('POST', '/api/admin/videos/upload-url', { token: token(), body: { fileName: '../../thumbnails/1-1.webp', category: 'palestra' } });
        assert.equal(traversal.body.data.filePath, 'palestra/1-1.webp');
        assert.equal((await api('POST', '/api/admin/videos/upload-url', { token: token(), body: { fileName: 'a.mp4', category: 'thumbnails' } })).status, 400);
        require('../utils/r2').existingKeys.add('palestra/Squat.mp4');
        const clash = await api('POST', '/api/admin/videos/upload-url', { token: token(), body: { fileName: 'Squat.mp4', category: 'palestra' } });
        assert.match(clash.body.data.filePath, /^palestra\/Squat-\d+\.mp4$/);

        const thumb = await api('POST', '/api/admin/videos/1/thumbnail/upload-url', { token: token(), body: { contentType: 'image/webp' } });
        assert.equal(thumb.status, 200);
        assert.match(thumb.body.data.key, /^thumbnails\/1-\d+\.webp$/);
        assert.equal((await api('POST', '/api/admin/videos/1/thumbnail/upload-url', { token: token(), body: { contentType: 'image/gif' } })).status, 400);
    });

    it('PUT /api/admin/videos/:id/thumbnail only accepts keys of that video', async () => {
        const ok = await api('PUT', `/api/admin/videos/${videoId}/thumbnail`, { token: token(), body: { key: `thumbnails/${videoId}-1.webp` } });
        assert.equal(ok.status, 200);
        const bad = await api('PUT', `/api/admin/videos/${videoId}/thumbnail`, { token: token(), body: { key: 'thumbnails/1-1.webp' } });
        assert.equal(bad.status, 400);
    });

    it('GET /api/thumbnails/:videoId redirects to the image', async () => {
        const row = (await db().execute('SELECT id FROM videos WHERE thumbnail_key IS NOT NULL LIMIT 1')).rows[0];
        const res = await api('GET', `/api/thumbnails/${row.id}`);
        assert.equal(res.status, 302);
        assert.match(res.headers.get('location'), /^https:\/\//);
    });
});

describe('admin reviews', () => {
    it('reviews can be listed, approved, featured and deleted', async () => {
        await api('POST', '/api/reviews', { token: userToken(), body: { rating: 4, title: 'Bene', comment: 'Mi trovo molto bene!' } });
        const list = await api('GET', '/api/admin/reviews', { token: token() });
        assert.equal(list.status, 200);
        const review = list.body.data.reviews[0];
        assert.equal((await api('PUT', `/api/admin/reviews/${review.id}/approve`, { token: token(), body: { approved: true } })).status, 200);
        assert.equal((await api('PUT', `/api/admin/reviews/${review.id}/feature`, { token: token(), body: { featured: true } })).status, 200);
        const featured = await api('GET', '/api/reviews/featured');
        assert.ok(featured.body.data.reviews.length >= 1);
        assert.equal((await api('PUT', `/api/admin/reviews/${review.id}/approve`, { token: token(), body: { approved: 'yes' } })).status, 400);
        assert.equal((await api('DELETE', `/api/admin/reviews/${review.id}`, { token: token() })).status, 200);
        assert.equal((await api('DELETE', `/api/admin/reviews/${review.id}`, { token: token() })).status, 404);
    });
});

describe('admin training days', () => {
    const base = `/api/training-days/users/${TEST_USER.id}/training-days`;
    let dayId;
    let videoIds;

    it('GET lists the user\'s days with videos and techniques', async () => {
        const res = await api('GET', base, { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.trainingDays.length, 4);
        assert.ok(res.body.data.trainingDays[0].videos.some((v) => v.techniques.length > 0));
    });

    it('a day can be created (unique day number) and renamed', async () => {
        const res = await api('POST', base, { token: token(), body: { dayNumber: 9, dayName: 'Giorno 9' } });
        assert.equal(res.status, 201);
        dayId = res.body.data.id;
        assert.equal((await api('POST', base, { token: token(), body: { dayNumber: 9 } })).status, 409);
        assert.equal((await api('PUT', `${base}/${dayId}`, { token: token(), body: { dayName: 'Extra' } })).status, 200);
    });

    it('videos can be assigned (granting access), reordered, grouped and given techniques', async () => {
        const rows = await db().execute(`SELECT id FROM videos WHERE is_active = 1 AND id NOT IN
            (SELECT video_id FROM user_video_permissions WHERE user_id = ${TEST_USER.id}) LIMIT 2`);
        videoIds = rows.rows.map((r) => Number(r.id));
        for (const id of videoIds) {
            assert.equal((await api('POST', `${base}/${dayId}/videos/${id}`, { token: token() })).status, 200);
        }
        assert.equal((await api('POST', `${base}/${dayId}/videos/${videoIds[0]}`, { token: token() })).status, 400);

        const perms = await db().execute(`SELECT count(*) n FROM user_video_permissions WHERE user_id = ${TEST_USER.id} AND is_active = 1 AND video_id IN (${videoIds})`);
        assert.equal(Number(perms.rows[0].n), 2);

        const reorder = await api('PUT', `${base}/${dayId}/videos/reorder`, { token: token(), body: { videoOrders: [{ videoId: videoIds[1], orderIndex: 0 }, { videoId: videoIds[0], orderIndex: 1 }] } });
        assert.equal(reorder.status, 200);

        const technique = Number((await db().execute("SELECT id FROM videos WHERE muscle_group = 'Tecniche' LIMIT 1")).rows[0].id);
        assert.equal((await api('POST', `${base}/${dayId}/videos/${videoIds[0]}/techniques/${technique}`, { token: token() })).status, 200);

        const day = (await api('GET', base, { token: token() })).body.data.trainingDays.find((d) => d.id === dayId);
        assert.deepEqual(day.videos.map((v) => v.id), [videoIds[1], videoIds[0]]);
        assert.equal(day.videos[1].techniques[0].id, technique);

        const group = await api('PUT', `${base}/${dayId}/videos/group`, { token: token(), body: { assignmentIds: day.videos.map((v) => v.assignmentId), groupLabel: 'Superset' } });
        assert.equal(group.status, 200);
        assert.equal((await api('DELETE', `${base}/${dayId}/videos/group/${group.body.data.groupId}`, { token: token() })).status, 200);
        assert.equal((await api('DELETE', `${base}/${dayId}/videos/${videoIds[0]}/techniques/${technique}`, { token: token() })).status, 200);
    });

    it('removing a video revokes access when it is in no other day', async () => {
        assert.equal((await api('DELETE', `${base}/${dayId}/videos/${videoIds[0]}`, { token: token() })).status, 200);
        const perm = await db().execute(`SELECT is_active FROM user_video_permissions WHERE user_id = ${TEST_USER.id} AND video_id = ${videoIds[0]}`);
        assert.equal(Number(perm.rows[0].is_active), 0);
    });

    it('deleting a day deletes its videos and revokes their access', async () => {
        assert.equal((await api('DELETE', `${base}/${dayId}`, { token: token() })).status, 200);
        const perm = await db().execute(`SELECT is_active FROM user_video_permissions WHERE user_id = ${TEST_USER.id} AND video_id = ${videoIds[1]}`);
        assert.equal(Number(perm.rows[0].is_active), 0);
        assert.equal((await api('DELETE', `${base}/${dayId}`, { token: token() })).status, 404);
    });
});

describe('admin workout plan', () => {
    it('POST /api/workout/admin/parse-pdf/:userId extracts the stored plan', async () => {
        const res = await api('POST', `/api/workout/admin/parse-pdf/${MICHELA}`, { token: token() });
        assert.equal(res.status, 200);
        const days = res.body.data.days;
        assert.deepEqual(days.map((d) => d.exercises.length), [6, 6, 6, 6]);
        const ladder = days[2].exercises.find((e) => e.reps === '4-6-8-6-4');
        assert.ok(ladder, 'ladder reps are parsed');
        assert.equal(ladder.notes, 'Peso consigliato: 5 kg x lato');
    });

    it('GET / POST / DELETE /api/workout/admin/plan keeps ids, logs and links of edited exercises', async () => {
        const url = `/api/workout/admin/plan/${TEST_USER.id}`;
        const plan = (await api('GET', url, { token: token() })).body.data.exercises;
        assert.equal(plan.length, 23);

        const days = {};
        for (const e of plan) {
            days[e.day_number] = days[e.day_number] || { dayNumber: e.day_number, dayName: e.day_name, exercises: [] };
            days[e.day_number].exercises.push({ id: e.id, name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, notes: e.notes, weightSlots: e.weight_slots });
        }
        const edited = Object.values(days);
        edited[0].exercises[0].name = 'Rinominato';
        const removed = edited[0].exercises.pop();
        edited[0].exercises.push({ name: 'Nuovo esercizio', sets: '3', reps: '10' });

        assert.equal((await api('POST', url, { token: token(), body: { days: edited } })).status, 200);
        const after = (await api('GET', url, { token: token() })).body.data.exercises;
        assert.equal(after.length, 23);
        assert.equal(after.find((e) => e.id === plan[0].id).name, 'Rinominato');
        assert.ok(!after.some((e) => e.id === removed.id));
        const unlinked = await db().execute({ sql: 'SELECT count(*) n FROM training_day_videos WHERE exercise_id = ?', args: [removed.id] });
        assert.equal(Number(unlinked.rows[0].n), 0);

        assert.equal((await api('POST', url, { token: token(), body: {} })).status, 400);
        assert.equal((await api('GET', `/api/workout/admin/logs/${TEST_USER.id}`, { token: token() })).status, 200);
    });

    it('replacing a plan keeps the weights already logged in the history', async () => {
        const user = 253; // Riccardo Ravani: 18 logged weights in the snapshot
        const url = `/api/workout/admin/plan/${user}`;
        const before = Number((await db().execute({ sql: 'SELECT count(*) n FROM exercise_logs WHERE user_id = ?', args: [user] })).rows[0].n);
        assert.ok(before > 0);

        // A freshly extracted plan has no ids: every old exercise is replaced
        const res = await api('POST', url, { token: token(), body: { days: [{ dayNumber: 1, dayName: 'Giorno 1', exercises: [{ name: 'Nuovo', sets: '3', reps: '10' }] }] } });
        assert.equal(res.status, 200);

        const logs = (await db().execute({ sql: 'SELECT exercise_id, exercise_name FROM exercise_logs WHERE user_id = ?', args: [user] })).rows;
        assert.equal(logs.length, before);
        assert.ok(logs.every((l) => l.exercise_id === null && l.exercise_name));

        const history = await api('GET', `/api/workout/admin/logs/${user}`, { token: token() });
        assert.equal(history.body.data.logs.length, before);
        assert.ok(history.body.data.logs.every((l) => l.exercise_name && l.day_name));
        const client = await api('GET', '/api/workout/logs', { token: tokenFor({ id: user, username: 'Riccardo Ravani' }) });
        assert.equal(client.body.data.logs.length, before);
    });

    it('GET /api/workout/admin/links proposes and returns exercise ↔ video links', async () => {
        const res = await api('GET', `/api/workout/admin/links/${MICHELA}`, { token: token() });
        assert.equal(res.status, 200);
        const test = await api('GET', `/api/workout/admin/links/${TEST_USER.id}`, { token: token() });
        const day1 = test.body.data.days[0];
        assert.ok(day1.exercises.length > 0);
        assert.ok(day1.extras.some((v) => v.techniques.length > 0));
        for (const v of day1.extras) assert.equal(v.dayNumber, 1);
    });

    it('PUT /api/workout/admin/links saves links, extras, techniques and drops unlisted videos', async () => {
        const url = `/api/workout/admin/links/${TEST_USER.id}`;
        const days = (await api('GET', url, { token: token() })).body.data.days;
        const toPayload = (v) => ({ assignmentId: v.assignmentId, videoId: v.videoId, techniqueIds: v.techniques.map((t) => t.id) });
        const links = days.flatMap((d) => d.exercises.map((e) => ({ exerciseId: e.id, videos: e.links.map(toPayload) })));
        const extras = days.map((d) => ({ dayNumber: d.dayNumber, videos: d.extras.map(toPayload) }));

        const dropped = extras[0].videos.pop();
        const technique = Number((await db().execute("SELECT id FROM videos WHERE muscle_group = 'Tecniche' LIMIT 1")).rows[0].id);
        links[0].videos[0].techniqueIds = [technique];
        const stretching = Number((await db().execute("SELECT id FROM videos WHERE muscle_group = 'Stretching' LIMIT 1")).rows[0].id);
        extras[1].videos.push({ assignmentId: null, videoId: stretching, techniqueIds: [] });

        const res = await api('PUT', url, { token: token(), body: { links, extras } });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data, { addedVideos: 1, removedVideos: 1 });

        const after = (await api('GET', url, { token: token() })).body.data.days;
        assert.ok(!after[0].extras.some((v) => v.assignmentId === dropped.assignmentId));
        assert.ok(after[1].extras.some((v) => v.videoId === stretching));
        const firstLink = after.flatMap((d) => d.exercises).find((e) => e.id === links[0].exerciseId).links[0];
        assert.deepEqual(firstLink.techniques.map((t) => t.id), [technique]);
    });

    it('DELETE /api/workout/admin/plan removes the plan and unlinks videos', async () => {
        const url = `/api/workout/admin/plan/${MICHELA}`;
        assert.equal((await api('DELETE', url, { token: token() })).status, 200);
        assert.equal((await api('GET', url, { token: token() })).body.data.exercises.length, 0);
    });
});

describe('admin PDF', () => {
    const user = 309;

    it('GET /api/pdf/admin/user/:userId describes the plan', async () => {
        const res = await api('GET', `/api/pdf/admin/user/${user}`, { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.userId, user);
    });

    it('a plan can be extended and scheduled', async () => {
        const before = (await api('GET', `/api/pdf/admin/user/${user}`, { token: token() })).body.data.expirationDate;
        assert.equal((await api('PUT', `/api/pdf/admin/extend/${user}`, { token: token(), body: {} })).status, 400);
        assert.equal((await api('PUT', `/api/pdf/admin/extend/${user}`, { token: token(), body: { additionalDays: 10 } })).status, 200);
        const after = (await api('GET', `/api/pdf/admin/user/${user}`, { token: token() })).body.data.expirationDate;
        assert.ok(new Date(after) > new Date(before));

        assert.equal((await api('PUT', `/api/pdf/admin/visible-from/${user}`, { token: token(), body: { visibleFrom: '2030-01-01' } })).status, 200);
        assert.equal((await api('GET', `/api/pdf/admin/user/${user}`, { token: token() })).body.data.visibleFrom, '2030-01-01');
    });

    it('the admin can download any plan', async () => {
        const res = await api('GET', `/api/pdf/download?userId=${user}`, { token: token() });
        assert.equal(res.status, 200);
        assert.equal(res.body.subarray(0, 4).toString(), '%PDF');
    });

    it('a plan can be uploaded (replaced) and deleted', async () => {
        const form = new FormData();
        form.append('pdf', new Blob([fakePdf()], { type: 'application/pdf' }), 'Nuova scheda.pdf');
        form.append('durationMonths', '1');
        const res = await api('POST', `/api/pdf/admin/upload/${user}`, { token: token(), body: form });
        assert.equal(res.status, 200);
        const info = (await api('GET', `/api/pdf/admin/user/${user}`, { token: token() })).body.data;
        assert.equal(info.originalName, 'Nuova scheda.pdf');
        assert.equal(info.durationMonths, 1);

        assert.equal((await api('DELETE', `/api/pdf/admin/delete/${user}`, { token: token() })).status, 200);
        assert.equal((await api('GET', `/api/pdf/admin/user/${user}`, { token: token() })).body.data, null);
    });
});

describe('admin feedback', () => {
    it('lists, summarizes, counts and marks checks as seen', async () => {
        const all = await api('GET', '/api/feedback/admin/all?page=1&limit=5', { token: token() });
        assert.equal(all.status, 200);
        assert.ok(all.body.data.feedbacks.length <= 5);

        const summary = await api('GET', '/api/feedback/admin/users-summary', { token: token() });
        assert.equal(summary.status, 200);
        assert.ok(Array.isArray(summary.body.data.users));

        const count = await api('GET', '/api/feedback/admin/unread-count', { token: token() });
        assert.equal(count.status, 200);

        const feedbackId = all.body.data.feedbacks[0].id;
        assert.equal((await api('POST', `/api/feedback/admin/${feedbackId}/mark-seen`, { token: token() })).status, 200);
        assert.equal((await api('POST', '/api/feedback/admin/mark-seen', { token: token(), body: {} })).status, 200);
    });

    it('lists a user\'s checks and deletes one', async () => {
        const userId = Number((await db().execute('SELECT user_id FROM user_feedbacks LIMIT 1')).rows[0].user_id);
        const list = await api('GET', `/api/feedback/admin/user/${userId}`, { token: token() });
        assert.equal(list.status, 200);
        const id = list.body.data.feedbacks[0].id;
        assert.equal((await api('DELETE', `/api/feedback/${id}`, { token: token() })).status, 200);
        assert.equal((await api('DELETE', `/api/feedback/${id}`, { token: token() })).status, 404);
        assert.equal((await api('DELETE', `/api/feedback/${id}`, { token: userToken() })).status, 403);
    });
});

describe('admin integration catalog and body composition', () => {
    it('POST /api/integration/admin/products replaces the catalog', async () => {
        assert.equal((await api('POST', '/api/integration/admin/products', { token: token(), body: { categories: [{ name: 'X' }] } })).status, 400);
        const res = await api('POST', '/api/integration/admin/products', { token: token(), body: { categories: [{ name: 'Proteine', products: [{ name: 'Whey', productUrl: 'https://example.com/whey' }] }] } });
        assert.equal(res.status, 200);
        const catalog = (await api('GET', '/api/integration/products', { token: userToken() })).body.data.categories;
        assert.deepEqual(catalog.map((c) => [c.name, c.products.map((p) => p.name)]), [['Proteine', ['Whey']]]);
        const orphans = await db().execute('SELECT count(*) n FROM integration_products');
        assert.equal(Number(orphans.rows[0].n), 1);
    });

    it('body composition reports can be uploaded, listed, downloaded and deleted', async () => {
        const form = new FormData();
        form.append('pdf', new Blob([fakePdf()], { type: 'application/pdf' }), 'report.pdf');
        form.append('measurementDate', '2026-10-01');
        const created = await api('POST', `/api/body-composition/admin/upload/${TEST_USER.id}`, { token: token(), body: form });
        assert.equal(created.status, 201);
        const id = created.body.data.id;

        const list = await api('GET', `/api/body-composition/admin/${TEST_USER.id}`, { token: token() });
        assert.equal(list.status, 200);
        const mine = await api('GET', '/api/body-composition/my-reports', { token: userToken() });
        assert.equal(mine.status, 200);

        const download = await api('GET', `/api/body-composition/download/${id}`, { token: userToken() });
        assert.equal(download.status, 200);
        const other = await api('GET', `/api/body-composition/download/${id}`, { token: tokenFor({ id: 240, username: 'Michela Sciocchetti' }) });
        assert.notEqual(other.status, 200);

        assert.equal((await api('DELETE', `/api/body-composition/admin/report/${id}`, { token: token() })).status, 200);
    });
});

describe('cron and analytics', () => {
    it('cron routes need the secret', async () => {
        assert.equal((await api('GET', '/api/cron/cleanup-users?dryRun=1')).status, 401);
        assert.equal((await api('GET', '/api/cron/cleanup-users?dryRun=1', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
    });

    it('cleanup-users dry run lists users without deleting them', async () => {
        const res = await api('GET', '/api/cron/cleanup-users?dryRun=1', { headers: { Authorization: 'Bearer cron-test-secret' } });
        assert.equal(res.status, 200);
        assert.equal(res.body.dryRun, true);
        assert.ok(!res.body.deleted.some((u) => u.id === TEST_USER.id), 'Test User is protected');
        const users = await db().execute('SELECT count(*) n FROM users');
        assert.ok(Number(users.rows[0].n) >= 38);
    });

    it('check-in reminders skip exempt clients', async () => {
        const { clientsToRemind } = require('../services/checkins');
        const exempt = await db().execute(`SELECT u.id FROM users u JOIN user_pdf_files p ON p.user_id = u.id
            WHERE u.checkin_exempt = 1 AND u.is_active = 1 AND p.updated_at < datetime('now', '-7 days')
              AND COALESCE(u.email, (SELECT email FROM user_feedbacks f WHERE f.user_id = u.id LIMIT 1)) IS NOT NULL`);
        assert.ok(exempt.rows.length > 0, 'the snapshot has an exempt client who would be reminded');
        const exemptIds = new Set(exempt.rows.map((r) => Number(r.id)));
        const users = await clientsToRemind();
        assert.ok(!users.some((u) => exemptIds.has(Number(u.userId))));
    });

    it('analytics answers 503 when Vercel is not configured', async () => {
        assert.equal((await api('GET', '/api/analytics', { token: token() })).status, 503);
    });
});
