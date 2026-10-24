const crypto = require('crypto');
const config = require('../config');
const { db } = require('../utils/database');
const { badRequest, HttpError } = require('../utils/http');

/**
 * Bot protection of the public online-trial signup (routes/trials), in layers:
 *   1. traps: a hidden field only bots fill in, and a minimum time between the page
 *      opening and the submit. A caught bot gets a fake success and nothing happens;
 *   2. Cloudflare Turnstile, when TURNSTILE_SECRET_KEY is set;
 *   3. limits stored in the database (the in-memory rate limiter resets with every
 *      serverless instance): signups per IP per day, signups in total per day;
 *   4. throwaway email domains are refused.
 * The IP is stored only as a keyed hash.
 */

const MIN_FILL_MS = 4000;
const MAX_PER_IP_PER_DAY = 3;

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'yopmail.com', 'yopmail.fr', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
    '10minutemail.com', '10minutemail.net', 'temp-mail.org', 'tempmail.com', 'tempmail.net', 'tempmailo.com',
    'trashmail.com', 'trashmail.de', 'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'mintemail.com',
    'throwawaymail.com', 'fakeinbox.com', 'mailnesia.com', 'mohmal.com', 'emailondeck.com', 'spamgourmet.com',
    'mailcatch.com', 'moakt.com', 'tmpmail.org', 'tmpmail.net', 'burnermail.io', 'inboxkitten.com', 'mail.tm',
    'jetable.org', 'mytemp.email', 'tempail.com', 'luxusmail.org', 'cock.li', 'grr.la', 'spam4.me',
]);

/** True when the request looks automated: the hidden field is filled or the form was sent too fast. */
function isTrapped(body) {
    if (typeof body.website === 'string' && body.website.trim() !== '') return true;
    const elapsed = Number(body.elapsedMs);
    return !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS;
}

const isDisposableEmail = (email) => DISPOSABLE_DOMAINS.has(String(email).split('@')[1] || '');

/** Keyed hash of the client IP: lets us count signups per IP without storing it. */
const ipHash = (ip) => crypto.createHmac('sha256', config.jwtSecret).update(String(ip || '')).digest('hex').slice(0, 32);

/** Checks the Turnstile token when Turnstile is configured; a 400 CAPTCHA_FAILED otherwise. */
async function verifyCaptcha(token, ip) {
    const secret = config.turnstile.secretKey;
    if (!secret) return;
    if (!token || typeof token !== 'string') throw badRequest('Captcha required', 'CAPTCHA_FAILED');
    let result;
    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
            signal: AbortSignal.timeout(8000),
        });
        result = await res.json();
    } catch (err) {
        // Cloudflare unreachable: better a signup without captcha than no signups (the DB limits still apply)
        console.error('Turnstile verification unavailable:', err.message);
        return;
    }
    if (!result || !result.success) throw badRequest('Captcha failed', 'CAPTCHA_FAILED');
}

/** Signups per IP and in total over the last 24 hours. */
async function checkLimits(hash) {
    const row = await db.get(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN ip_hash = ? THEN 1 ELSE 0 END) AS fromIp
         FROM trials WHERE kind = 'online' AND created_at > datetime('now', '-1 day')`,
        [hash]
    );
    if (Number(row.fromIp || 0) >= MAX_PER_IP_PER_DAY) {
        throw new HttpError(429, 'Too many signups from this connection', 'TOO_MANY_SIGNUPS');
    }
    if (Number(row.total || 0) >= config.trials.maxDailySignups) {
        console.error(`Online trial signups paused: ${row.total} in the last 24 hours (TRIAL_MAX_DAILY_SIGNUPS)`);
        throw new HttpError(503, 'The trial is not available right now', 'TRIAL_UNAVAILABLE');
    }
}

module.exports = { MIN_FILL_MS, MAX_PER_IP_PER_DAY, isTrapped, isDisposableEmail, ipHash, verifyCaptcha, checkLimits };
