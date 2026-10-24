const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { db } = require('../utils/database');
const { route, badRequest, unauthorized, forbidden } = require('../utils/http');
const { isAccessExpired, PLAN_EXPIRED_MESSAGE } = require('../utils/userRetention');
const { trialAccess, TRIAL_EXPIRED_MESSAGE } = require('../services/trials');
const { parseDbDate } = require('../services/checkins');

// Sessions: password login (admin), dashboard login links (clients), token check
const router = express.Router();

const SESSION_TTL = '7d';

// Password guessing: 10 attempts per IP every 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Troppi tentativi di accesso, riprova tra qualche minuto' },
});

/** A trial's session ends with the trial, so no API call works after it. */
const sessionToken = (user, trial = null) => {
    const trialSeconds = trial && Math.floor((parseDbDate(trial.expiresAt) - Date.now()) / 1000);
    return jwt.sign({ userId: user.id, username: user.username, email: user.email }, config.jwtSecret,
        { expiresIn: trialSeconds ? Math.max(60, trialSeconds) : SESSION_TTL });
};

const toUser = (u, trial = null) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    trainerId: u.trainer_id || 1,
    // Trial users see the dashboard in trial mode (see services/trials)
    ...(trial ? { trial: { kind: trial.kind, expiresAt: trial.expiresAt, daysLeft: trial.daysLeft } } : {}),
});

function recordLogin(userId) {
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId])
        .catch((err) => console.error('Error updating last login:', err.message));
}

/** Client links stop working some days after the plan expired (see userRetention). */
async function planAccessExpired(userId) {
    try {
        return await isAccessExpired(userId);
    } catch (err) {
        console.error('Plan expiry check failed:', err); // never lock clients out because of a failed check
        return false;
    }
}

const planExpired = () => forbidden(PLAN_EXPIRED_MESSAGE, 'PLAN_EXPIRED');

/**
 * Trial users: the first use of the link starts the 7 days (open); an ended trial is a 403 TRIAL_EXPIRED.
 * Returns the trial for the session, or null for every other user.
 */
async function checkTrial(user, { open = false } = {}) {
    if (user.account_type !== 'trial') return null;
    const access = await trialAccess(user.id, { open });
    if (!access || access.expired) throw forbidden(TRIAL_EXPIRED_MESSAGE, 'TRIAL_EXPIRED');
    return access.trial;
}

const verifyJwt = (token) => new Promise((resolve) => {
    jwt.verify(token, config.jwtSecret, (err, payload) => resolve(err ? null : payload));
});

// POST /api/auth/login — Body: { username, password }
router.post('/login', loginLimiter, route(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) throw badRequest('Username and password are required');

    const user = await db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
        throw unauthorized('Invalid credentials');
    }

    recordLogin(user.id);
    const { trainerId, ...profile } = toUser(user);
    res.json({ success: true, message: 'Login successful', data: { token: sessionToken(user), user: profile } });
}));

// POST /api/auth/login-link — Body: { token } (from the dashboard link) → session token
router.post('/login-link', route(async (req, res) => {
    const { token } = req.body;
    if (!token) throw badRequest('Token is required');

    const payload = await verifyJwt(token);
    if (!payload) throw unauthorized('Invalid or expired token');
    if (payload.type !== 'login_link') throw unauthorized('Invalid token type');

    const user = await db.get('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
    if (!user) throw unauthorized('User not found or inactive');
    if (await planAccessExpired(user.id)) throw planExpired();
    const trial = await checkTrial(user, { open: true });

    recordLogin(user.id);
    res.json({ success: true, message: 'Login successful', data: { token: sessionToken(user, trial), user: toUser(user, trial) } });
}));

// GET /api/auth/verify — the current session's user
router.get('/verify', route(async (req, res) => {
    const header = req.headers.authorization;
    const token = header && header.split(' ')[1];
    if (!token) throw unauthorized('No token provided');

    const payload = await verifyJwt(token);
    if (!payload) throw unauthorized('Invalid token');

    const user = await db.get(
        'SELECT id, username, email, first_name, last_name, trainer_id, account_type FROM users WHERE id = ? AND is_active = 1',
        [payload.userId]
    );
    if (!user) throw unauthorized('User not found');
    if (await planAccessExpired(user.id)) throw planExpired();
    const trial = await checkTrial(user);

    res.json({ success: true, data: { user: toUser(user, trial) } });
}));

module.exports = router;
