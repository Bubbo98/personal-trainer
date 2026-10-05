const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const { route, unauthorized } = require('../utils/http');
const { run: sendReminders } = require('../scripts/send-checkin-reminders');
const { findUsersToDelete, deleteUserCompletely } = require('../utils/userRetention');

// Jobs called by Vercel Cron with "Authorization: Bearer <CRON_SECRET>"
const router = express.Router();

function requireCronSecret(req, res, next) {
    const secret = config.cronSecret;
    if (!secret) {
        console.error('CRON_SECRET not configured');
        return res.status(500).json({ success: false, error: 'Cron not configured' });
    }
    const given = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return next(unauthorized('Unauthorized'));
    next();
}

// GET /api/cron/send-reminders — daily at 9:00 Europe/Rome
router.get('/send-reminders', requireCronSecret, route(async (req, res) => {
    const { sent, failed } = await sendReminders();
    res.json({ success: true, sent, failed, timestamp: new Date().toISOString() });
}));

// GET /api/cron/cleanup-users[?dryRun=1] — daily: permanently deletes deactivated clients and
// clients whose plan expired long ago (see utils/userRetention). dryRun only lists them.
router.get('/cleanup-users', requireCronSecret, route(async (req, res) => {
    const dryRun = req.query.dryRun === '1';
    const deleted = [];
    const failed = [];

    for (const user of await findUsersToDelete()) {
        const label = { id: user.id, username: user.username, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() };
        if (dryRun) {
            deleted.push(label);
            continue;
        }
        try {
            await deleteUserCompletely(user.id);
            deleted.push(label);
            console.log(`Deleted user ${user.id} (${user.username})`);
        } catch (err) {
            console.error(`Failed to delete user ${user.id}:`, err);
            failed.push({ ...label, error: err.message });
        }
    }
    res.json({ success: true, dryRun, deletedCount: deleted.length, deleted, failed });
}));

module.exports = router;
