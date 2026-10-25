const express = require('express');
const config = require('../config');
const rateLimit = require('express-rate-limit');
const { db } = require('../utils/database');
const { route, badRequest, conflict, HttpError } = require('../utils/http');
const { authenticateToken } = require('../middleware/auth');
const { loadQuestionnaire, publicQuestionnaire, scoreAnswers } = require('../services/trialQuestionnaire');
const {
    TRIAL_DAYS, pickTemplate, onlineDisciplines, createTrial, trialLink, trialState, phoneDigits, markEmailSent, acceptDisclaimer,
} = require('../services/trials');
const { isTrapped, isDisposableEmail, ipHash, verifyCaptcha, checkLimits } = require('../services/signupGuard');
const { sendTrialAccess, sendTrialSignupNotification } = require('../services/emailService');

// Public: the online trial (questionnaire → signup → access link by email). See services/trials;
// bot protection in services/signupGuard.
const router = express.Router();

// First line against floods (per serverless instance: the real limits are in the database)
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.env === 'test',
    message: { success: false, error: 'Troppe richieste, riprova più tardi', code: 'TOO_MANY_SIGNUPS' },
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().\-\/]{6,20}$/;
const RESEND_EVERY_MINUTES = 15;

const field = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// What a bot (or a throttled resend) gets: the same answer as a real signup, so it learns nothing
const fakeSuccess = (res, resent = false) => res.status(resent ? 200 : 201).json({ success: true, data: { resent, emailSent: true } });

// GET /api/trials/questionnaire — the questions (without points) and the disciplines that can be chosen
router.get('/questionnaire', route(async (req, res) => {
    const [questionnaire, disciplines] = await Promise.all([loadQuestionnaire(), onlineDisciplines()]);
    res.json({ success: true, data: { disciplines, trialDays: TRIAL_DAYS, ...publicQuestionnaire(questionnaire) } });
}));

// POST /api/trials/signup — Body: { discipline, daysPerWeek, answers: { [questionId]: optionId }, firstName, lastName, email,
// phone, privacy: true, disclaimer: true (the notice on the use of the plan), marketing?, lang? ('it' | 'en'), elapsedMs, website (hidden trap, empty), captchaToken? }.
// The access link goes to the email address only. An email or phone that already has a running trial gets
// the link again (at most every 15 minutes); one whose trial is over gets 409 TRIAL_ALREADY_USED.
router.post('/signup', signupLimiter, route(async (req, res) => {
    const body = req.body || {};
    if (isTrapped(body)) return fakeSuccess(res);

    const firstName = field(body.firstName, 100);
    const lastName = field(body.lastName, 100);
    const email = field(body.email, 200).toLowerCase();
    const phone = field(body.phone, 40);
    const lang = body.lang === 'en' ? 'en' : 'it';
    if (!firstName) throw badRequest('First name is required', 'INVALID_NAME');
    if (!EMAIL.test(email) || isDisposableEmail(email)) throw badRequest('Invalid email address', 'INVALID_EMAIL');
    if (!PHONE.test(phone) || !phoneDigits(phone)) throw badRequest('Invalid phone number', 'INVALID_PHONE');
    if (body.privacy !== true) throw badRequest('The privacy policy must be accepted', 'PRIVACY_REQUIRED');
    if (body.disclaimer !== true) throw badRequest('The notice on the use of the plan must be accepted', 'DISCLAIMER_REQUIRED');

    const { score, days, answers } = scoreAnswers(await loadQuestionnaire(), body.discipline, body.answers, body.daysPerWeek);
    await verifyCaptcha(body.captchaToken, req.ip);

    const previous = await db.get(
        `SELECT * FROM trials WHERE kind = 'online' AND (lower(email) = ? OR phone_digits = ?)
         ORDER BY (lower(email) = ?) DESC, created_at DESC LIMIT 1`,
        [email, phoneDigits(phone), email]
    );
    if (previous) {
        const { state } = trialState(previous);
        const running = state === 'not_opened' || state === 'active';
        // The link only ever goes to the address of that trial, never to a new one typed in now
        if (!running || previous.email !== email) throw conflict('A trial was already used with this email or phone', 'TRIAL_ALREADY_USED');
        const recent = previous.last_email_at && await db.get(
            "SELECT 1 FROM trials WHERE id = ? AND last_email_at > datetime('now', ?)",
            [previous.id, `-${RESEND_EVERY_MINUTES} minutes`]
        );
        if (recent) return fakeSuccess(res, true);
        const loginUrl = await trialLink(previous.id);
        const sent = await sendTrialAccess(email, previous.first_name || firstName, loginUrl, TRIAL_DAYS, lang);
        if (sent.success) await markEmailSent(previous.id);
        return res.json({ success: true, data: { resent: true, emailSent: sent.success } });
    }

    const hash = ipHash(req.ip);
    await checkLimits(hash);

    const template = await pickTemplate(body.discipline, score, days);
    if (!template) throw new HttpError(503, 'The trial is not available right now', 'TRIAL_UNAVAILABLE');

    const { trial, loginUrl } = await createTrial({
        kind: 'online',
        templateId: template.id,
        firstName,
        lastName,
        email,
        phone,
        discipline: body.discipline,
        score,
        answers,
        privacyAccepted: true,
        disclaimerAccepted: true,
        marketingConsent: body.marketing === true,
        ipHash: hash,
    });
    const [sent] = await Promise.all([
        sendTrialAccess(email, firstName, loginUrl, TRIAL_DAYS, lang),
        sendTrialSignupNotification(trial),
    ]);
    if (sent.success) await markEmailSent(trial.id);
    res.status(201).json({ success: true, data: { resent: false, emailSent: sent.success } });
}));

// POST /api/trials/accept-disclaimer — the trial person (session token) accepts the notice on the use of the plan;
// the dashboard asks for it before showing the plan when it wasn't accepted at signup (free sessions)
router.post('/accept-disclaimer', authenticateToken, route(async (req, res) => {
    await acceptDisclaimer(req.user.userId);
    res.json({ success: true });
}));

module.exports = router;
