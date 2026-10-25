const crypto = require('crypto');
const { db } = require('../utils/database');
const { badRequest, notFound } = require('../utils/http');
const { parseDbDate } = require('./checkins');
const { loginLink } = require('./loginLinks');
const { deleteUserCompletely } = require('../utils/userRetention');
const { readFile, storeFileFor } = require('./storedFiles');
const { DISCIPLINES } = require('./trialQuestionnaire');

/**
 * 7-day trials of the method.
 *
 * A trial template is a plan (exercises, day videos, techniques) held by a hidden
 * user of account_type 'trial_template': the admin edits it with the same tools as
 * a client's plan. Starting a trial creates a user of account_type 'trial' with a
 * copy of the template's plan and plan PDF, so the admin can still change that person's copy.
 *
 * The person logs in with an ordinary dashboard link. The 7 days start the first
 * time the link is opened; a link nobody opens dies after UNOPENED_LINK_DAYS.
 * DELETE_AFTER_DAYS after the end the trial user and their plan are deleted;
 * the trials row (contacts, answers, status) stays KEEP_RECORD_MONTHS (as the
 * privacy policy says), unless the admin deletes it sooner.
 *
 * Kinds: 'free_session' (made by the admin for someone who came to the gym)
 * and 'online' (signup from the public site, after the questionnaire).
 */

const TRIAL_DAYS = 7;
const UNOPENED_LINK_DAYS = 30;
const DELETE_AFTER_DAYS = 30;
const KEEP_RECORD_MONTHS = 12;
const KINDS = ['free_session', 'online'];
const STATUSES = ['to_contact', 'contacted', 'client', 'not_interested'];
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TRIAL_EXPIRED_MESSAGE = 'La tua prova gratuita è terminata: contattaci per continuare il percorso.';

/** The digits of a phone number without the Italian prefix: "+39 333 123 4567" and "3331234567" match. null if too short. */
function phoneDigits(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0039')) digits = digits.slice(4);
    else if (digits.startsWith('39') && digits.length > 10) digits = digits.slice(2);
    return digits.length >= 6 ? digits : null;
}

const randomName = (prefix) => `${prefix}-${crypto.randomBytes(5).toString('hex')}`;

const optionalText = (value, max = 200) => {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    if (s.length > max) throw badRequest('Text too long');
    return s || null;
};

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATE_COLUMNS = `tt.id, tt.name, tt.discipline, tt.description, tt.user_id, tt.online, tt.min_score, tt.max_score,
    tt.created_at, tt.updated_at,
    (SELECT COUNT(*) FROM training_exercises e WHERE e.user_id = tt.user_id) AS exercise_count,
    (SELECT COUNT(*) FROM training_day_videos tdv JOIN user_training_days td ON td.id = tdv.training_day_id
     WHERE td.user_id = tt.user_id AND td.is_active = 1 AND tdv.is_active = 1) AS video_count,
    (SELECT COUNT(*) FROM (SELECT day_number FROM training_exercises WHERE user_id = tt.user_id
                           UNION SELECT day_number FROM user_training_days WHERE user_id = tt.user_id AND is_active = 1)) AS day_count`;

const toTemplate = (t) => ({
    id: t.id,
    name: t.name,
    discipline: t.discipline,
    description: t.description,
    userId: t.user_id,
    online: Number(t.online) === 1,
    minScore: t.min_score,
    maxScore: t.max_score,
    exerciseCount: Number(t.exercise_count || 0),
    videoCount: Number(t.video_count || 0),
    /** Training days in the template's plan: online signups get the template with the days they chose. */
    dayCount: Number(t.day_count || 0),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
});

async function listTemplates() {
    const rows = await db.query(`SELECT ${TEMPLATE_COLUMNS} FROM trial_templates tt WHERE tt.is_active = 1 ORDER BY tt.discipline, tt.name`);
    return rows.map(toTemplate);
}

async function findTemplate(templateId) {
    const row = await db.get(`SELECT ${TEMPLATE_COLUMNS} FROM trial_templates tt WHERE tt.id = ? AND tt.is_active = 1`, [templateId]);
    if (!row) throw notFound('Trial template not found');
    return toTemplate(row);
}

const score = (value, field) => {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n)) throw badRequest(`${field} must be a whole number`);
    return n;
};

/** Template fields from an admin request; `partial` allows missing fields (update). */
function templateFields(body, partial = false) {
    const fields = {};
    if (!partial || body.name !== undefined) {
        const name = optionalText(body.name, 100);
        if (!name) throw badRequest('Name is required');
        fields.name = name;
    }
    if (!partial || body.discipline !== undefined) {
        if (!DISCIPLINES.includes(body.discipline)) throw badRequest('Discipline must be gym or calisthenics');
        fields.discipline = body.discipline;
    }
    if (body.description !== undefined) fields.description = optionalText(body.description, 500);
    if (body.online !== undefined) fields.online = body.online ? 1 : 0;
    if (body.minScore !== undefined) fields.min_score = score(body.minScore, 'Minimum score');
    if (body.maxScore !== undefined) fields.max_score = score(body.maxScore, 'Maximum score');
    return fields;
}

const checkRange = (min, max) => {
    if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
        throw badRequest('The minimum score is higher than the maximum');
    }
};

/** New template with an empty plan (its holder user is created in the same batch). */
async function createTemplate(body) {
    const fields = templateFields(body);
    checkRange(fields.min_score, fields.max_score);
    const username = randomName('modello');
    const results = await db.batch([
        {
            sql: `INSERT INTO users (username, first_name, last_name, account_type, is_paying, checkin_exempt)
                  VALUES (?, ?, 'Modello prova', 'trial_template', 0, 1)`,
            params: [username, fields.name],
        },
        {
            sql: `INSERT INTO trial_templates (name, discipline, description, user_id, online, min_score, max_score)
                  VALUES (?, ?, ?, (SELECT id FROM users WHERE username = ?), ?, ?, ?)`,
            params: [fields.name, fields.discipline, fields.description ?? null, username, fields.online ?? 0,
                fields.min_score ?? null, fields.max_score ?? null],
        },
    ]);
    return findTemplate(results[1].lastId);
}

async function updateTemplate(templateId, body) {
    const current = await findTemplate(templateId);
    const fields = templateFields(body, true);
    if (Object.keys(fields).length === 0) throw badRequest('No fields to update');
    checkRange(
        'min_score' in fields ? fields.min_score : current.minScore,
        'max_score' in fields ? fields.max_score : current.maxScore
    );
    const columns = Object.keys(fields);
    await db.batch([
        {
            sql: `UPDATE trial_templates SET ${columns.map((c) => `${c} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params: [...columns.map((c) => fields[c]), templateId],
        },
        ...(fields.name ? [{ sql: 'UPDATE users SET first_name = ? WHERE id = ?', params: [fields.name, current.userId] }] : []),
    ]);
    return findTemplate(templateId);
}

/** Deletes the template and its plan; trials made from it keep their own copy. */
async function deleteTemplate(templateId) {
    const template = await findTemplate(templateId);
    await db.batch([
        { sql: 'UPDATE trials SET template_id = NULL WHERE template_id = ?', params: [templateId] },
        { sql: 'DELETE FROM trial_templates WHERE id = ?', params: [templateId] },
    ]);
    await deleteUserCompletely(template.userId, null);
}

/**
 * The online template for a signup: among the online templates of the discipline, those whose
 * plan has the chosen number of training days (else the closest number; empty plans last),
 * then the one whose score range holds the score, else the closest range. null when there is none.
 */
async function pickTemplate(discipline, points, days) {
    const candidates = (await db.query(
        `SELECT ${TEMPLATE_COLUMNS} FROM trial_templates tt
         WHERE tt.is_active = 1 AND tt.online = 1 AND tt.discipline = ? ORDER BY tt.id`,
        [discipline]
    )).map(toTemplate);
    const distance = (t) => Math.max(
        t.minScore !== null ? t.minScore - points : 0,
        t.maxScore !== null ? points - t.maxScore : 0,
        0
    );
    const daysOff = (t) => (t.dayCount === 0 ? Infinity : Math.abs(t.dayCount - days));
    return candidates.sort((a, b) => daysOff(a) - daysOff(b) || distance(a) - distance(b))[0] || null;
}

/** Disciplines that have at least one online template: the only ones a visitor can choose. */
async function onlineDisciplines() {
    const rows = await db.query('SELECT DISTINCT discipline FROM trial_templates WHERE is_active = 1 AND online = 1');
    return DISCIPLINES.filter((d) => rows.some((r) => r.discipline === d));
}

// ─── Plan copy ───────────────────────────────────────────────────────────────

/**
 * Statements that copy a user's plan to another user (looked up by username, so
 * they can run in the same batch that creates them): exercises, days, day videos with
 * their exercise links and supersets, techniques, and access to the day videos.
 * Rows are matched by day number / order / video, which are unique in a plan.
 */
function copyPlanStatements(fromUserId, toUsername) {
    const to = '(SELECT id FROM users WHERE username = ?)';
    return [
        {
            sql: `INSERT INTO training_exercises (user_id, day_number, day_name, order_index, name, sets, reps, rest, notes, weight_slots)
                  SELECT ${to}, day_number, day_name, order_index, name, sets, reps, rest, notes, weight_slots
                  FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index, id`,
            params: [toUsername, fromUserId],
        },
        {
            sql: `INSERT INTO user_training_days (user_id, day_number, day_name)
                  SELECT ${to}, day_number, day_name FROM user_training_days WHERE user_id = ? AND is_active = 1`,
            params: [toUsername, fromUserId],
        },
        {
            sql: `INSERT INTO training_day_videos (training_day_id, video_id, order_index, added_by, group_id, group_label, exercise_id)
                  SELECT nd.id, tdv.video_id, tdv.order_index, 'trial', tdv.group_id, tdv.group_label,
                         (SELECT ne.id FROM training_exercises oe
                          JOIN training_exercises ne ON ne.user_id = nd.user_id AND ne.day_number = oe.day_number
                               AND ne.order_index = oe.order_index AND ne.name = oe.name
                          WHERE oe.id = tdv.exercise_id LIMIT 1)
                  FROM training_day_videos tdv
                  JOIN user_training_days od ON od.id = tdv.training_day_id AND od.user_id = ? AND od.is_active = 1
                  JOIN user_training_days nd ON nd.user_id = ${to} AND nd.day_number = od.day_number
                  WHERE tdv.is_active = 1`,
            params: [fromUserId, toUsername],
        },
        {
            sql: `INSERT INTO training_day_video_techniques (training_day_video_id, technique_id, order_index)
                  SELECT ntdv.id, t.technique_id, t.order_index
                  FROM training_day_video_techniques t
                  JOIN training_day_videos otdv ON otdv.id = t.training_day_video_id AND otdv.is_active = 1
                  JOIN user_training_days od ON od.id = otdv.training_day_id AND od.user_id = ? AND od.is_active = 1
                  JOIN user_training_days nd ON nd.user_id = ${to} AND nd.day_number = od.day_number
                  JOIN training_day_videos ntdv ON ntdv.training_day_id = nd.id AND ntdv.video_id = otdv.video_id`,
            params: [fromUserId, toUsername],
        },
        {
            sql: `INSERT OR IGNORE INTO user_video_permissions (user_id, video_id, granted_by, is_active)
                  SELECT DISTINCT td.user_id, tdv.video_id, 'trial', 1
                  FROM training_day_videos tdv JOIN user_training_days td ON td.id = tdv.training_day_id
                  WHERE td.user_id = ${to}`,
            params: [toUsername],
        },
    ];
}

// ─── Trials ──────────────────────────────────────────────────────────────────

const TRIAL_COLUMNS = `t.*, u.username, u.last_login,
    (SELECT COUNT(*) FROM exercise_logs l WHERE l.user_id = t.user_id) AS log_count`;

/** not_opened → active → ended; link_expired: never opened in time; deleted: the trial user is gone. */
function trialState(t, now = new Date()) {
    const expiresAt = parseDbDate(t.expires_at);
    if (!t.opened_at) {
        const created = parseDbDate(t.created_at);
        if (created && now - created > UNOPENED_LINK_DAYS * DAY_MS) return { state: 'link_expired', daysLeft: 0 };
        return { state: t.user_id ? 'not_opened' : 'deleted', daysLeft: TRIAL_DAYS };
    }
    if (!t.user_id) return { state: 'deleted', daysLeft: 0 };
    if (!expiresAt || expiresAt <= now) return { state: 'ended', daysLeft: 0 };
    return { state: 'active', daysLeft: Math.ceil((expiresAt - now) / DAY_MS) };
}

const parseAnswers = (json) => {
    try {
        const list = JSON.parse(json || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

function toTrial(t, now = new Date()) {
    return {
        id: t.id,
        kind: t.kind,
        templateId: t.template_id,
        templateName: t.template_name,
        userId: t.user_id,
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
        phone: t.phone,
        discipline: t.discipline,
        score: t.score,
        answers: parseAnswers(t.answers),
        marketingConsent: Number(t.marketing_consent) === 1,
        status: t.status,
        notes: t.notes,
        createdAt: t.created_at,
        /** The health notice of the trial plan (generic plan, use at your own risk) was accepted. */
        disclaimerAcceptedAt: t.disclaimer_accepted_at || null,
        openedAt: t.opened_at,
        expiresAt: t.expires_at,
        lastLogin: t.last_login || null,
        logCount: Number(t.log_count || 0),
        ...trialState(t, now),
    };
}

async function listTrials() {
    const rows = await db.query(
        `SELECT ${TRIAL_COLUMNS} FROM trials t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC, t.id DESC`
    );
    return rows.map((t) => toTrial(t));
}

async function findTrial(trialId) {
    const row = await db.get(`SELECT ${TRIAL_COLUMNS} FROM trials t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?`, [trialId]);
    if (!row) throw notFound('Trial not found');
    return toTrial(row);
}

/**
 * Starts a trial: a trial user with a copy of the template's plan, and the trials row.
 * @returns {Promise<{ trial, loginUrl }>}
 */
async function createTrial({ kind, templateId, firstName, lastName, email, phone, discipline, score: points, answers,
    privacyAccepted = false, disclaimerAccepted = false, marketingConsent = false, notes, ipHash = null }) {
    if (!KINDS.includes(kind)) throw badRequest('Invalid trial kind');
    const template = await findTemplate(templateId);
    const username = randomName('prova');
    const first = optionalText(firstName, 100);
    const last = optionalText(lastName, 100);

    const writeTrial = (pdfStatements = []) => db.batch([
        {
            sql: `INSERT INTO users (username, first_name, last_name, phone, account_type, is_paying, checkin_exempt)
                  VALUES (?, ?, ?, ?, 'trial', 0, 1)`,
            params: [username, first || 'Prova', last, optionalText(phone, 40)],
        },
        ...copyPlanStatements(template.userId, username),
        ...pdfStatements,
        {
            sql: `INSERT INTO trials (kind, template_id, template_name, user_id, first_name, last_name, email, phone, discipline,
                    score, answers, privacy_accepted_at, disclaimer_accepted_at, marketing_consent, notes, ip_hash, phone_digits)
                  VALUES (?, ?, ?, (SELECT id FROM users WHERE username = ?), ?, ?, ?, ?, ?, ?, ?,
                    ${privacyAccepted ? 'CURRENT_TIMESTAMP' : 'NULL'}, ${disclaimerAccepted ? 'CURRENT_TIMESTAMP' : 'NULL'}, ?, ?, ?, ?)`,
            params: [kind, template.id, template.name, username, first, last, optionalText(email, 200), optionalText(phone, 40),
                discipline || template.discipline, points ?? null, answers ? JSON.stringify(answers) : null,
                marketingConsent ? 1 : 0, optionalText(notes, 2000), ipHash, phoneDigits(phone)],
        },
    ]);

    // The template's PDF gets its own file, so deleting either user never removes the other's
    const pdf = await db.get('SELECT original_name, file_key, file_data, file_size, mime_type FROM user_pdf_files WHERE user_id = ?', [template.userId]);
    const results = pdf
        ? await storeFileFor('plan', username, { originalname: pdf.original_name, buffer: await readFile(pdf), mimetype: pdf.mime_type }, (fileKey) =>
            writeTrial([{
                sql: `INSERT INTO user_pdf_files (user_id, original_name, file_key, file_data, file_size, mime_type, uploaded_by)
                      VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, '', ?, ?, 'trial')`,
                params: [username, pdf.original_name, fileKey, pdf.file_size, pdf.mime_type],
            }]))
        : await writeTrial();
    const trial = await findTrial(results[results.length - 1].lastId);
    return { trial, loginUrl: loginLink({ id: trial.userId, username, email: null }).loginUrl };
}

/** The dashboard link of a trial (the same link for its whole life). */
async function trialLink(trialId) {
    const trial = await findTrial(trialId);
    if (!trial.userId) throw notFound('This trial has ended and its account was deleted');
    const user = await db.get('SELECT id, username FROM users WHERE id = ?', [trial.userId]);
    return loginLink({ id: user.id, username: user.username, email: null }).loginUrl;
}

const STATUS_FIELDS = {
    status: ['status', (v) => {
        if (!STATUSES.includes(v)) throw badRequest('Invalid status');
        return v;
    }],
    notes: ['notes', (v) => optionalText(v, 2000)],
    firstName: ['first_name', (v) => optionalText(v, 100)],
    lastName: ['last_name', (v) => optionalText(v, 100)],
    email: ['email', (v) => {
        const email = optionalText(v, 200);
        if (email && !EMAIL.test(email)) throw badRequest('Invalid email address', 'INVALID_EMAIL');
        return email;
    }],
    phone: ['phone', (v) => optionalText(v, 40)],
};

async function updateTrial(trialId, body) {
    const updates = Object.entries(STATUS_FIELDS).filter(([field]) => body[field] !== undefined);
    if (updates.length === 0) throw badRequest('No fields to update');
    const trial = await findTrial(trialId);
    const values = updates.map(([field, [, convert]]) => convert(body[field]));
    if (body.phone !== undefined) {
        updates.push(['phoneDigits', ['phone_digits']]);
        values.push(phoneDigits(body.phone));
    }
    const names = {};
    updates.forEach(([field], i) => { names[field] = values[i]; });
    await db.batch([
        {
            sql: `UPDATE trials SET ${updates.map(([, [column]]) => `${column} = ?`).join(', ')} WHERE id = ?`,
            params: [...values, trialId],
        },
        // The dashboard greets the person by name
        ...(trial.userId && names.firstName !== undefined
            ? [{ sql: 'UPDATE users SET first_name = ? WHERE id = ?', params: [names.firstName || 'Prova', trial.userId] }]
            : []),
        ...(trial.userId && names.lastName !== undefined
            ? [{ sql: 'UPDATE users SET last_name = ? WHERE id = ?', params: [names.lastName, trial.userId] }]
            : []),
    ]);
    return findTrial(trialId);
}

/** Adds days to a trial; an ended one restarts from today. A link not yet opened keeps its full 7 days. */
async function extendTrial(trialId, days) {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 60) throw badRequest('Days must be between 1 and 60');
    const trial = await findTrial(trialId);
    if (!trial.userId) throw badRequest('This trial has ended and its account was deleted');
    if (!trial.openedAt) {
        // An expired unopened link becomes valid again
        await db.run('UPDATE trials SET created_at = CURRENT_TIMESTAMP WHERE id = ?', [trialId]);
    } else {
        await db.run(
            `UPDATE trials SET expires_at = datetime(MAX(COALESCE(expires_at, datetime('now')), datetime('now')), ?),
                    end_notified_at = NULL
             WHERE id = ?`,
            [`+${n} days`, trialId]
        );
    }
    return findTrial(trialId);
}

/** Deletes the trial record and, if still there, the trial user with their plan. */
async function deleteTrial(trialId) {
    const trial = await findTrial(trialId);
    await db.run('DELETE FROM trials WHERE id = ?', [trialId]);
    if (trial.userId) await deleteUserCompletely(trial.userId, null);
}

// ─── Access ──────────────────────────────────────────────────────────────────

/**
 * Login check of a trial user. When `open` is set (the link was just used) the
 * first opening starts the 7 days. Returns the trial (for the session), or
 * { expired: true }. Non-trial users get null.
 */
async function trialAccess(userId, { open = false } = {}) {
    const row = await db.get(`SELECT ${TRIAL_COLUMNS} FROM trials t JOIN users u ON u.id = t.user_id WHERE t.user_id = ?`, [userId]);
    if (!row) return null;
    let trial = toTrial(row);
    if (trial.state === 'not_opened' && open) {
        await db.run(
            `UPDATE trials SET opened_at = CURRENT_TIMESTAMP, expires_at = datetime('now', ?) WHERE id = ? AND opened_at IS NULL`,
            [`+${TRIAL_DAYS} days`, trial.id]
        );
        trial = await findTrial(trial.id);
    }
    if (trial.state !== 'active' && !(trial.state === 'not_opened' && !open)) return { expired: true };
    return { expired: false, trial };
}

// ─── Nightly jobs ────────────────────────────────────────────────────────────

/** Trials that ended and the trainer wasn't told about yet. */
async function endedTrialsToNotify() {
    const rows = await db.query(
        `SELECT ${TRIAL_COLUMNS} FROM trials t LEFT JOIN users u ON u.id = t.user_id
         WHERE t.end_notified_at IS NULL AND t.expires_at IS NOT NULL AND t.expires_at <= datetime('now')
         ORDER BY t.expires_at`
    );
    return rows.map((t) => toTrial(t));
}

async function markEndNotified(trialIds) {
    if (trialIds.length === 0) return;
    await db.run(
        `UPDATE trials SET end_notified_at = CURRENT_TIMESTAMP WHERE id IN (${trialIds.map(() => '?').join(',')})`,
        trialIds
    );
}

/**
 * Deletes the trial users DELETE_AFTER_DAYS after their trial ended (or after their
 * unopened link died). The trials rows stay, without user. Returns the deleted user ids.
 */
async function deleteOldTrialUsers() {
    const rows = await db.query(
        `SELECT t.id, t.user_id FROM trials t JOIN users u ON u.id = t.user_id AND u.account_type = 'trial'
         WHERE (t.expires_at IS NOT NULL AND t.expires_at < datetime('now', ?))
            OR (t.opened_at IS NULL AND t.created_at < datetime('now', ?))`,
        [`-${DELETE_AFTER_DAYS} days`, `-${UNOPENED_LINK_DAYS + DELETE_AFTER_DAYS} days`]
    );
    const deleted = [];
    for (const row of rows) {
        await db.run('UPDATE trials SET user_id = NULL WHERE id = ?', [row.id]);
        await deleteUserCompletely(row.user_id, null);
        deleted.push(row.user_id);
    }
    return deleted;
}

/** Deletes the trial records (contacts, answers) older than KEEP_RECORD_MONTHS. Returns how many. */
async function deleteOldTrialRecords() {
    const { changes } = await db.run(
        "DELETE FROM trials WHERE user_id IS NULL AND created_at < datetime('now', ?)",
        [`-${KEEP_RECORD_MONTHS} months`]
    );
    return changes;
}

/** The trial person accepted the health notice of the plan (first opening of a free session link). */
async function acceptDisclaimer(userId) {
    const { changes } = await db.run(
        'UPDATE trials SET disclaimer_accepted_at = COALESCE(disclaimer_accepted_at, CURRENT_TIMESTAMP) WHERE user_id = ?',
        [userId]
    );
    if (changes === 0) throw notFound('No trial for this account');
}

/** Records that the access email was just sent (resends are throttled). */
async function markEmailSent(trialId) {
    await db.run('UPDATE trials SET last_email_at = CURRENT_TIMESTAMP WHERE id = ?', [trialId]);
}

module.exports = {
    TRIAL_DAYS,
    UNOPENED_LINK_DAYS,
    DELETE_AFTER_DAYS,
    KEEP_RECORD_MONTHS,
    KINDS,
    STATUSES,
    TRIAL_EXPIRED_MESSAGE,
    listTemplates,
    findTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    pickTemplate,
    onlineDisciplines,
    listTrials,
    findTrial,
    createTrial,
    trialLink,
    updateTrial,
    extendTrial,
    deleteTrial,
    trialAccess,
    trialState,
    endedTrialsToNotify,
    markEndNotified,
    deleteOldTrialUsers,
    deleteOldTrialRecords,
    phoneDigits,
    markEmailSent,
    acceptDisclaimer,
};
