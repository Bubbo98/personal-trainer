const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, adminToken, db } = require('./helpers');

before(start);
after(stop);

const admin = () => adminToken();
const dashboardToken = (loginUrl) => loginUrl.split('/dashboard/')[1];

/** Opens the trial link like the dashboard does: login-link → session. */
const openLink = (loginUrl) => api('POST', '/api/auth/login-link', { body: { token: dashboardToken(loginUrl) } });

async function anyVideoIds(count) {
    return (await db().execute(`SELECT id FROM videos WHERE is_active = 1 ORDER BY id LIMIT ${count}`)).rows.map((r) => Number(r.id));
}

describe('trials', () => {
    let template;
    let freeSession;
    let videoIds;

    it('a template gets a hidden holder user and is not listed among clients', async () => {
        const res = await api('POST', '/api/admin/trial-templates', {
            token: admin(),
            body: { name: 'Palestra base', discipline: 'gym', online: true, minScore: 0, maxScore: 6 },
        });
        assert.equal(res.status, 201);
        template = res.body.data.template;
        assert.equal(template.online, true);
        assert.equal(template.exerciseCount, 0);

        const users = await api('GET', '/api/admin/users', { token: admin() });
        assert.ok(!users.body.data.users.some((u) => u.id === template.userId));

        const bad = await api('POST', '/api/admin/trial-templates', { token: admin(), body: { name: 'X', discipline: 'yoga' } });
        assert.equal(bad.status, 400);
        const range = await api('PUT', `/api/admin/trial-templates/${template.id}`, { token: admin(), body: { minScore: 9 } });
        assert.equal(range.status, 400);
    });

    it('the template plan is edited with the usual plan routes', async () => {
        videoIds = await anyVideoIds(3);
        const plan = await api('POST', `/api/workout/admin/plan/${template.userId}`, {
            token: admin(),
            body: { days: [{ dayNumber: 1, dayName: 'Full body', exercises: [{ name: 'Squat', sets: '3', reps: '10' }, { name: 'Panca', sets: '3', reps: '8' }] }] },
        });
        assert.equal(plan.status, 200);
        const day = await api('POST', `/api/training-days/users/${template.userId}/training-days`, { token: admin(), body: { dayNumber: 1 } });
        for (const videoId of videoIds.slice(0, 2)) {
            await api('POST', `/api/training-days/users/${template.userId}/training-days/${day.body.data.id}/videos/${videoId}`, { token: admin() });
        }
        await api('POST', `/api/training-days/users/${template.userId}/training-days/${day.body.data.id}/videos/${videoIds[0]}/techniques/${videoIds[2]}`, { token: admin() });
        const exercises = (await api('GET', `/api/workout/admin/plan/${template.userId}`, { token: admin() })).body.data.exercises;
        const assignment = (await db().execute({
            sql: 'SELECT id FROM training_day_videos WHERE training_day_id = ? AND video_id = ?', args: [day.body.data.id, videoIds[0]],
        })).rows[0];
        await db().execute({ sql: 'UPDATE training_day_videos SET exercise_id = ? WHERE id = ?', args: [exercises[0].id, assignment.id] });

        const list = await api('GET', '/api/admin/trial-templates', { token: admin() });
        const listed = list.body.data.templates.find((t) => t.id === template.id);
        assert.equal(listed.exerciseCount, 2);
        assert.equal(listed.videoCount, 2);
    });

    it('the template takes a plan PDF, with no expiry nor unlock date', async () => {
        const form = new FormData();
        form.append('pdf', new Blob([Buffer.from('%PDF-1.4 modello')], { type: 'application/pdf' }), 'Modello.pdf');
        form.append('durationMonths', '2');
        form.append('visibleFrom', new Date(Date.now() + 3 * 86400000).toISOString());
        const res = await api('POST', `/api/pdf/admin/upload/${template.userId}`, { token: admin(), body: form });
        assert.equal(res.status, 200);
        const info = (await api('GET', `/api/pdf/admin/user/${template.userId}`, { token: admin() })).body.data;
        assert.equal(info.originalName, 'Modello.pdf');
        assert.equal(info.expirationDate, null);
        assert.equal(info.visibleFrom, null);
    });

    it('a free session copies the plan, videos, links and techniques to a new trial user', async () => {
        const res = await api('POST', '/api/admin/trials', {
            token: admin(),
            body: { templateId: template.id, firstName: 'Mario', lastName: 'Rossi', phone: '333 1234567' },
        });
        assert.equal(res.status, 201);
        freeSession = res.body.data.trial;
        assert.equal(freeSession.kind, 'free_session');
        assert.equal(freeSession.state, 'not_opened');
        assert.equal(freeSession.templateName, 'Palestra base');
        assert.match(res.body.data.loginUrl, /\/dashboard\/.+/);

        const copy = (await api('GET', `/api/workout/admin/plan/${freeSession.userId}`, { token: admin() })).body.data.exercises;
        assert.deepEqual(copy.map((e) => e.name), ['Squat', 'Panca']);
        const days = (await api('GET', `/api/training-days/users/${freeSession.userId}/training-days`, { token: admin() })).body.data.trainingDays;
        assert.equal(days.length, 1);
        assert.equal(days[0].videos.length, 2);
        const linked = days[0].videos.find((v) => v.id === videoIds[0]);
        assert.equal(linked.exerciseId, copy[0].id, 'the exercise link points to the copied exercise');
        assert.deepEqual(linked.techniques.map((t) => t.id), [videoIds[2]]);
        const permissions = await db().execute({
            sql: 'SELECT COUNT(*) AS n FROM user_video_permissions WHERE user_id = ? AND is_active = 1', args: [freeSession.userId],
        });
        assert.equal(Number(permissions.rows[0].n), 2);

        // Editing the copy leaves the template alone
        await api('POST', `/api/workout/admin/plan/${freeSession.userId}`, {
            token: admin(), body: { days: [{ dayNumber: 1, exercises: [{ name: 'Affondi' }] }] },
        });
        const original = (await api('GET', `/api/workout/admin/plan/${template.userId}`, { token: admin() })).body.data.exercises;
        assert.equal(original.length, 2);
    });

    it('the first opening starts 7 days; the session says it is a trial', async () => {
        const link = await api('GET', `/api/admin/trials/${freeSession.id}/link`, { token: admin() });
        const login = await openLink(link.body.data.loginUrl);
        assert.equal(login.status, 200);
        assert.equal(login.body.data.user.trial.kind, 'free_session');
        assert.equal(login.body.data.user.trial.daysLeft, 7);

        const verify = await api('GET', '/api/auth/verify', { token: login.body.data.token });
        assert.equal(verify.status, 200);
        assert.equal(verify.body.data.user.trial.daysLeft, 7);

        // A free session never saw the notice on the use of the plan: the dashboard asks for it once
        assert.equal(login.body.data.user.trial.disclaimerAccepted, false);
        assert.equal((await api('POST', '/api/trials/accept-disclaimer', { token: login.body.data.token })).status, 200);
        const accepted = await api('GET', '/api/auth/verify', { token: login.body.data.token });
        assert.equal(accepted.body.data.user.trial.disclaimerAccepted, true);
        const recorded = (await api('GET', '/api/admin/trials', { token: admin() })).body.data.trials.find((t) => t.id === freeSession.id);
        assert.ok(recorded.disclaimerAcceptedAt);
        assert.equal((await api('POST', '/api/trials/accept-disclaimer')).status, 401);

        const trial = (await api('GET', '/api/admin/trials', { token: admin() })).body.data.trials.find((t) => t.id === freeSession.id);
        assert.equal(trial.state, 'active');
        assert.ok(trial.openedAt && trial.expiresAt);

        // Opening it again does not restart the days
        await db().execute({ sql: "UPDATE trials SET expires_at = datetime('now', '+2 days') WHERE id = ?", args: [freeSession.id] });
        const again = await openLink(link.body.data.loginUrl);
        assert.equal(again.body.data.user.trial.daysLeft, 2);
    });

    it('the trial gets its own copy of the template PDF and can download it', async () => {
        const r2 = require('../utils/r2');
        const keys = (await db().execute({
            sql: 'SELECT user_id, file_key, expiration_date FROM user_pdf_files WHERE user_id IN (?, ?)', args: [template.userId, freeSession.userId],
        })).rows;
        const own = keys.find((r) => Number(r.user_id) === freeSession.userId);
        const original = keys.find((r) => Number(r.user_id) === template.userId);
        assert.ok(own && own.file_key !== original.file_key, 'a separate file');
        assert.equal(own.expiration_date, null);
        assert.ok(r2.bucket.get(own.file_key).equals(r2.bucket.get(original.file_key)));

        const link = await api('GET', `/api/admin/trials/${freeSession.id}/link`, { token: admin() });
        const login = await openLink(link.body.data.loginUrl);
        const download = await api('GET', '/api/pdf/download', { token: login.body.data.token });
        assert.equal(download.status, 200);
        assert.equal(download.body.toString(), '%PDF-1.4 modello');
    });

    it('an ended trial is locked out with TRIAL_EXPIRED; extending it opens it again', async () => {
        await db().execute({ sql: "UPDATE trials SET expires_at = datetime('now', '-1 hour') WHERE id = ?", args: [freeSession.id] });
        const link = (await api('GET', `/api/admin/trials/${freeSession.id}/link`, { token: admin() })).body.data.loginUrl;
        const login = await openLink(link);
        assert.equal(login.status, 403);
        assert.equal(login.body.code, 'TRIAL_EXPIRED');

        const extended = await api('POST', `/api/admin/trials/${freeSession.id}/extend`, { token: admin(), body: { days: 3 } });
        assert.equal(extended.body.data.trial.state, 'active');
        assert.equal(extended.body.data.trial.daysLeft, 3);
        assert.equal((await openLink(link)).status, 200);
    });

    it('a link never opened dies after 30 days', async () => {
        const res = await api('POST', '/api/admin/trials', { token: admin(), body: { templateId: template.id } });
        await db().execute({ sql: "UPDATE trials SET created_at = datetime('now', '-31 days') WHERE id = ?", args: [res.body.data.trial.id] });
        const login = await openLink(res.body.data.loginUrl);
        assert.equal(login.status, 403);
        assert.equal(login.body.code, 'TRIAL_EXPIRED');
        await api('DELETE', `/api/admin/trials/${res.body.data.trial.id}`, { token: admin() });
    });

    it('PUT /api/admin/trials/:id changes status and notes', async () => {
        const res = await api('PUT', `/api/admin/trials/${freeSession.id}`, { token: admin(), body: { status: 'contacted', notes: 'Richiamare lunedì' } });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.trial.status, 'contacted');
        assert.equal(res.body.data.trial.notes, 'Richiamare lunedì');
        assert.equal((await api('PUT', `/api/admin/trials/${freeSession.id}`, { token: admin(), body: { status: 'boh' } })).status, 400);
    });

    it('a corrected email of a running trial gets the access link; an invalid one is refused', async () => {
        const put = (body) => api('PUT', `/api/admin/trials/${freeSession.id}`, { token: admin(), body });
        await db().execute({ sql: "UPDATE trials SET expires_at = datetime('now', '+3 days') WHERE id = ?", args: [freeSession.id] });
        assert.equal((await put({ email: 'mario@exmple' })).status, 400);

        // The tests have no email key: the send is tried (false), not skipped (null)
        const changed = await put({ email: 'mario.rossi@example.com' });
        assert.equal(changed.status, 200);
        assert.equal(changed.body.data.trial.email, 'mario.rossi@example.com');
        assert.equal(changed.body.data.emailSent, false);
        assert.equal((await put({ email: 'Mario.Rossi@example.com', notes: 'x' })).body.data.emailSent, null, 'same address');
        assert.equal((await put({ notes: 'y' })).body.data.emailSent, null);

        // An ended trial gets nothing
        await db().execute({ sql: "UPDATE trials SET expires_at = datetime('now', '-1 day') WHERE id = ?", args: [freeSession.id] });
        assert.equal((await put({ email: 'altro@example.com' })).body.data.emailSent, null);
    });
});

describe('online trial', () => {
    let low;
    let high;

    /** A plan of that many training days. */
    const planOfDays = (userId, count) => api('POST', `/api/workout/admin/plan/${userId}`, {
        token: adminToken(),
        body: { days: Array.from({ length: count }, (_, i) => ({ dayNumber: i + 1, exercises: [{ name: `Esercizio ${i + 1}` }] })) },
    });
    const make = (body) => api('POST', '/api/admin/trial-templates', { token: adminToken(), body: { discipline: 'calisthenics', online: true, ...body } });

    before(async () => {
        low = (await make({ name: 'Calisthenics base', maxScore: 3 })).body.data.template;
        high = (await make({ name: 'Calisthenics avanzato', minScore: 4 })).body.data.template;
        await planOfDays(low.userId, 3);
        await planOfDays(high.userId, 3);
    });

    it('the questionnaire has no points and lists the disciplines with an online template', async () => {
        const res = await api('GET', '/api/trials/questionnaire');
        assert.equal(res.status, 200);
        assert.ok(res.body.data.disciplines.includes('calisthenics'));
        assert.equal(res.body.data.trialDays, 7);
        const options = res.body.data.questions.flatMap((q) => q.options);
        assert.ok(options.length > 0 && options.every((o) => o.points === undefined));
        assert.deepEqual(res.body.data.dayOptions, [2, 3, 4]);
    });

    it('the admin edits the questionnaire; invalid ones are refused', async () => {
        const questionnaire = {
            questions: [
                { id: 'pullups', text: 'Trazioni?', discipline: 'calisthenics', options: [{ id: 'few', text: 'Poche', points: 0 }, { id: 'many', text: 'Tante', points: 5 }] },
                { id: 'years', text: 'Da quanto ti alleni?', options: [{ id: 'new', text: 'Nuovo', points: 0 }, { id: 'old', text: 'Anni', points: 1 }] },
                { id: 'bench', text: 'Panca?', discipline: 'gym', options: [{ id: 'no', text: 'No', points: 0 }, { id: 'yes', text: 'Sì', points: 2 }] },
            ],
        };
        const saved = await api('PUT', '/api/admin/trial-questionnaire', { token: adminToken(), body: questionnaire });
        assert.equal(saved.status, 200);
        const read = await api('GET', '/api/admin/trial-questionnaire', { token: adminToken() });
        assert.equal(read.body.data.isDefault, false);
        assert.equal(read.body.data.questionnaire.questions[0].options[1].points, 5);
        assert.deepEqual(read.body.data.questionnaire.dayOptions, [2, 3, 4], 'not sent: the default days');

        const days = await api('PUT', '/api/admin/trial-questionnaire', { token: adminToken(), body: { ...questionnaire, dayOptions: [5, 3, 4, 3] } });
        assert.deepEqual(days.body.data.questionnaire.dayOptions, [3, 4, 5]);
        for (const dayOptions of [[3], [0, 3], [3, 8], 'tre']) {
            assert.equal((await api('PUT', '/api/admin/trial-questionnaire', { token: adminToken(), body: { ...questionnaire, dayOptions } })).status, 400);
        }
        // 5 days too, for the closest-plan test below
        await api('PUT', '/api/admin/trial-questionnaire', { token: adminToken(), body: { ...questionnaire, dayOptions: [2, 3, 4, 5] } });

        const dupId = { questions: [{ id: 'a', text: 'A', options: [{ id: 'x', text: 'X', points: 0 }, { id: 'x', text: 'Y', points: 1 }] }] };
        assert.equal((await api('PUT', '/api/admin/trial-questionnaire', { token: adminToken(), body: dupId })).status, 400);
        const oneOption = { questions: [{ id: 'a', text: 'A', options: [{ id: 'x', text: 'X', points: 0 }] }] };
        assert.equal((await api('PUT', '/api/admin/trial-questionnaire', { token: adminToken(), body: oneOption })).status, 400);
    });

    it('questions without points: one answer, several answers, free text', () => {
        const { validateQuestionnaire, scoreAnswers } = require('../services/trialQuestionnaire');
        const two = [{ id: 'a', text: 'A', points: 4 }, { id: 'b', text: 'B', points: 9 }];
        const questionnaire = validateQuestionnaire({
            questions: [
                { id: 'level', text: 'Livello?', options: two },
                { id: 'pain', text: 'Dolori?', type: 'choice', options: two },
                { id: 'goals', text: 'Obiettivi?', type: 'multiple', options: [...two, { id: 'c', text: 'C', points: 1 }] },
                { id: 'notes', text: 'Raccontaci', type: 'open', options: two },
            ],
        });
        assert.deepEqual(questionnaire.questions.map((q) => q.type), ['scored', 'choice', 'multiple', 'open'], 'no type: scored');
        assert.deepEqual(questionnaire.questions[1].options.map((o) => o.points), [0, 0], 'unscored answers keep no points');
        assert.deepEqual(questionnaire.questions[3].options, []);
        assert.throws(() => validateQuestionnaire({ questions: [{ id: 'x', text: 'X', type: 'free', options: two }] }), /invalid type/);

        const answers = { level: 'b', pain: 'a', goals: ['c', 'a', 'zzz'] };
        const result = scoreAnswers({ ...questionnaire, dayOptions: [3] }, 'gym', { ...answers, notes: '  Mal di schiena  ' }, 3);
        assert.equal(result.score, 9, 'only the scored question counts');
        assert.deepEqual(result.answers.slice(1), [
            { question: 'Livello?', answer: 'B', points: 9 },
            { question: 'Dolori?', answer: 'A' },
            { question: 'Obiettivi?', answer: 'A, C' },
            { question: 'Raccontaci', answer: 'Mal di schiena' },
        ]);
        assert.equal(scoreAnswers({ ...questionnaire, dayOptions: [3] }, 'gym', answers, 3).answers.length, 4, 'the open one may be left out');
        for (const goals of [[], 'a', undefined]) {
            assert.throws(() => scoreAnswers({ ...questionnaire, dayOptions: [3] }, 'gym', { ...answers, goals }, 3), /answer every question/);
        }
        assert.throws(() => scoreAnswers({ ...questionnaire, dayOptions: [3] }, 'gym', { ...answers, pain: undefined }, 3), /answer every question/);
    });

    // Each signup comes from its own IP unless one is given (the per-IP daily limit is tested apart)
    let nextIp = 1;
    const signup = (body, ip = `10.0.0.${nextIp++}`) => api('POST', '/api/trials/signup', {
        headers: { 'X-Forwarded-For': ip },
        body: {
            discipline: 'calisthenics', daysPerWeek: 3, answers: { pullups: 'many', years: 'old' },
            firstName: 'Giulia', lastName: 'Bianchi', email: 'giulia.prova@example.com', phone: '+39 333 0000000', privacy: true, disclaimer: true,
            elapsedMs: 30000, website: '',
            ...body,
        },
    });
    const onlineTrials = async () => Number((await db().execute("SELECT COUNT(*) AS n FROM trials WHERE kind = 'online'")).rows[0].n);

    it('signup validates contacts, privacy and answers', async () => {
        assert.equal((await signup({ email: 'nope' })).body.code, 'INVALID_EMAIL');
        assert.equal((await signup({ phone: '' })).body.code, 'INVALID_PHONE');
        assert.equal((await signup({ privacy: false })).body.code, 'PRIVACY_REQUIRED');
        assert.equal((await signup({ disclaimer: undefined })).body.code, 'DISCLAIMER_REQUIRED');
        assert.equal((await signup({ answers: { pullups: 'many' } })).body.code, 'MISSING_ANSWER');
        assert.equal((await signup({ daysPerWeek: undefined })).body.code, 'MISSING_ANSWER');
        assert.equal((await signup({ daysPerWeek: 6 })).body.code, 'MISSING_ANSWER', 'not one of the days offered');
    });

    it('the score picks the template; the trial keeps contacts and answers', async () => {
        const res = await signup({});
        assert.equal(res.status, 201);
        assert.equal(res.body.data.resent, false);
        assert.equal(res.body.data.emailSent, false, 'no email key in tests');

        const trial = (await api('GET', '/api/admin/trials', { token: adminToken() })).body.data.trials
            .find((t) => t.email === 'giulia.prova@example.com');
        assert.equal(trial.kind, 'online');
        assert.equal(trial.score, 6);
        assert.equal(trial.templateId, high.id);
        assert.equal(trial.phone, '+39 333 0000000');
        assert.deepEqual(trial.answers.map((a) => a.answer), ['3', 'Tante', 'Anni'], 'the days first; gym questions are not asked');
        assert.equal(trial.answers[0].days, 3);
        assert.ok(trial.disclaimerAcceptedAt, 'accepted at signup');
        assert.equal(trial.state, 'not_opened');
    });

    it('the same email gets its link again while the trial runs, and a 409 once it is over', async () => {
        const again = await signup({ email: 'GIULIA.prova@example.com' });
        assert.equal(again.status, 200);
        assert.equal(again.body.data.resent, true);

        await db().execute("UPDATE trials SET opened_at = datetime('now', '-8 days'), expires_at = datetime('now', '-1 day') WHERE email = 'giulia.prova@example.com'");
        const over = await signup({});
        assert.equal(over.status, 409);
        assert.equal(over.body.code, 'TRIAL_ALREADY_USED');
    });

    it('bots get a fake success and nothing is created: hidden field filled, or sent too fast', async () => {
        const before = await onlineTrials();
        const trap = await signup({ email: 'bot1@example.com', phone: '347 0000001', website: 'http://spam.example' });
        assert.equal(trap.status, 201);
        assert.deepEqual(trap.body.data, { resent: false, emailSent: true });
        const fast = await signup({ email: 'bot2@example.com', phone: '347 0000002', elapsedMs: 900 });
        assert.equal(fast.status, 201);
        const noTiming = await signup({ email: 'bot3@example.com', phone: '347 0000003', elapsedMs: undefined });
        assert.equal(noTiming.status, 201);
        assert.equal(await onlineTrials(), before);
    });

    it('throwaway email domains are refused', async () => {
        assert.equal((await signup({ email: 'x@mailinator.com', phone: '347 0000004' })).body.code, 'INVALID_EMAIL');
    });

    it('the same phone with another email cannot start a second trial', async () => {
        const res = await signup({ email: 'giulia.altra@example.com', phone: '3330000000' });
        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'TRIAL_ALREADY_USED');
    });

    it('at most 3 signups a day from one IP', async () => {
        const ip = '10.9.9.9';
        for (let i = 0; i < 3; i++) {
            assert.equal((await signup({ email: `ip${i}@example.com`, phone: `348 000000${i}` }, ip)).status, 201);
        }
        const fourth = await signup({ email: 'ip3@example.com', phone: '348 0000003' }, ip);
        assert.equal(fourth.status, 429);
        assert.equal(fourth.body.code, 'TOO_MANY_SIGNUPS');
        const stored = await db().execute("SELECT ip_hash FROM trials WHERE email = 'ip0@example.com'");
        assert.match(stored.rows[0].ip_hash, /^[0-9a-f]{32}$/, 'only a hash of the IP is stored');
    });

    it('a total daily cap pauses online signups', async () => {
        const config = require('../config');
        const cap = config.trials.maxDailySignups;
        config.trials.maxDailySignups = await onlineTrials();
        try {
            const res = await signup({ email: 'cap@example.com', phone: '349 0000000' });
            assert.equal(res.status, 503);
            assert.equal(res.body.code, 'TRIAL_UNAVAILABLE');
        } finally {
            config.trials.maxDailySignups = cap;
        }
    });

    it('with Turnstile on, a missing or refused token is CAPTCHA_FAILED', async () => {
        const config = require('../config');
        const realFetch = global.fetch;
        let verified;
        global.fetch = async (url, init) => {
            if (String(url).includes('challenges.cloudflare.com')) {
                verified = Object.fromEntries(new URLSearchParams(String(init.body)));
                return new Response(JSON.stringify({ success: verified.response === 'good-token' }));
            }
            return realFetch(url, init);
        };
        config.turnstile.secretKey = 'turnstile-secret';
        try {
            assert.equal((await signup({ email: 'cap1@example.com', phone: '349 1000000' })).body.code, 'CAPTCHA_FAILED');
            assert.equal((await signup({ email: 'cap1@example.com', phone: '349 1000000', captchaToken: 'bad' })).body.code, 'CAPTCHA_FAILED');
            const ok = await signup({ email: 'cap1@example.com', phone: '349 1000000', captchaToken: 'good-token' });
            assert.equal(ok.status, 201);
            assert.equal(verified.secret, 'turnstile-secret');
        } finally {
            config.turnstile.secretKey = '';
            global.fetch = realFetch;
        }
    });

    it('a low score gets the base template', async () => {
        const res = await signup({ email: 'base@example.com', phone: '347 1111111', answers: { pullups: 'few', years: 'old' } });
        assert.equal(res.status, 201);
        const trial = (await api('GET', '/api/admin/trials', { token: adminToken() })).body.data.trials.find((t) => t.email === 'base@example.com');
        assert.equal(trial.templateId, low.id);
    });

    it('the days chosen come before the score: the template with that many days, else the closest', async () => {
        const four = (await make({ name: 'Calisthenics 4 giorni', maxScore: 1 })).body.data.template;
        await planOfDays(four.userId, 4);
        const listed = (await api('GET', '/api/admin/trial-templates', { token: adminToken() })).body.data.templates;
        assert.equal(listed.find((t) => t.id === four.id).dayCount, 4);

        const templateOf = async (email) =>
            (await api('GET', '/api/admin/trials', { token: adminToken() })).body.data.trials.find((t) => t.email === email).templateId;
        await signup({ email: 'quattro@example.com', phone: '347 2222222', daysPerWeek: 4 });
        assert.equal(await templateOf('quattro@example.com'), four.id, 'a high score, but the only 4-day plan');
        await signup({ email: 'cinque@example.com', phone: '347 3333333', daysPerWeek: 5 });
        assert.equal(await templateOf('cinque@example.com'), four.id, 'no 5-day plan: the closest');
        await signup({ email: 'due@example.com', phone: '347 4444444', daysPerWeek: 2 });
        assert.equal(await templateOf('due@example.com'), high.id, '3-day plans are closer; then the score');
        await api('DELETE', `/api/admin/trial-templates/${four.id}`, { token: adminToken() });
    });

    it('the nightly job deletes old trial users but keeps the contacts', async () => {
        const trial = (await api('GET', '/api/admin/trials', { token: adminToken() })).body.data.trials.find((t) => t.email === 'giulia.prova@example.com');
        await db().execute({ sql: "UPDATE trials SET expires_at = datetime('now', '-31 days') WHERE id = ?", args: [trial.id] });
        const res = await api('GET', '/api/cron/cleanup-users', { headers: { Authorization: 'Bearer cron-test-secret' } });
        assert.equal(res.status, 200);
        assert.ok(res.body.trials.deletedUsers.includes(trial.userId));
        assert.equal(res.body.deleted.some((u) => u.id === trial.userId), false, 'not counted as a client deletion');

        const after = (await api('GET', '/api/admin/trials', { token: adminToken() })).body.data.trials.find((t) => t.id === trial.id);
        assert.equal(after.userId, null);
        assert.equal(after.state, 'deleted');
        assert.equal(after.email, 'giulia.prova@example.com');
        const user = await db().execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [trial.userId] });
        assert.equal(user.rows.length, 0);
        const logged = await db().execute({ sql: 'SELECT id FROM retention_log WHERE user_id = ?', args: [trial.userId] });
        assert.equal(logged.rows.length, 0, 'trial users are not in the retention log');
    });

    it('trial records are deleted after 12 months', async () => {
        const res = await api('POST', '/api/admin/trials', { token: adminToken(), body: { templateId: high.id, firstName: 'Vecchia' } });
        const { id: trialId, userId } = res.body.data.trial;
        await db().execute({ sql: "UPDATE trials SET created_at = datetime('now', '-13 months') WHERE id = ?", args: [trialId] });
        const cron = await api('GET', '/api/cron/cleanup-users', { headers: { Authorization: 'Bearer cron-test-secret' } });
        assert.ok(cron.body.trials.deletedUsers.includes(userId), 'the unopened link died long ago');
        assert.ok(cron.body.trials.deletedRecords >= 1);
        const left = await db().execute({ sql: 'SELECT id FROM trials WHERE id = ?', args: [trialId] });
        assert.equal(left.rows.length, 0);
    });

    it('deleting a template keeps the trials made from it', async () => {
        const res = await api('DELETE', `/api/admin/trial-templates/${low.id}`, { token: adminToken() });
        assert.equal(res.status, 200);
        const trial = (await api('GET', '/api/admin/trials', { token: adminToken() })).body.data.trials.find((t) => t.email === 'base@example.com');
        assert.equal(trial.templateId, null);
        assert.equal(trial.templateName, 'Calisthenics base');
        const holder = await db().execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [low.userId] });
        assert.equal(holder.rows.length, 0);
    });
});
