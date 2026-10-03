const express = require('express');
const router = express.Router();

// Middleware: validate CRON_SECRET header
const requireCronSecret = (req, res, next) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error('CRON_SECRET not configured');
        return res.status(500).json({ success: false, error: 'Cron not configured' });
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    next();
};

// GET /api/cron/send-reminders
// Called by Vercel Cron daily at 9:00 AM Europe/Rome
router.get('/send-reminders', requireCronSecret, async (req, res) => {
    console.log('🔔 Cron: send-reminders triggered at', new Date().toISOString());

    try {
        const { run } = require('../scripts/send-checkin-reminders');
        const result = await run();

        res.json({
            success: true,
            sent: result.sent,
            failed: result.failed,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Cron send-reminders failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/cron/cleanup-users[?dryRun=1]
// Called by Vercel Cron daily: permanently deletes deactivated clients and
// clients whose plan expired more than DELETE_AFTER_DAYS ago (see userRetention).
// With ?dryRun=1 it only lists who would be deleted.
router.get('/cleanup-users', requireCronSecret, async (req, res) => {
    const dryRun = req.query.dryRun === '1';
    console.log(`🧹 Cron: cleanup-users${dryRun ? ' (dry run)' : ''} triggered at`, new Date().toISOString());

    const { createDatabase } = require('../utils/database');
    const { findUsersToDelete, deleteUserCompletely } = require('../utils/userRetention');
    const db = createDatabase();

    try {
        const users = await findUsersToDelete(db);
        const deleted = [];
        const failed = [];

        for (const user of users) {
            const label = { id: user.id, username: user.username, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() };
            if (dryRun) {
                deleted.push(label);
                continue;
            }
            try {
                await deleteUserCompletely(db, user.id);
                deleted.push(label);
                console.log(`🗑️  Deleted user ${user.id} (${user.username})`);
            } catch (err) {
                console.error(`Failed to delete user ${user.id}:`, err);
                failed.push({ ...label, error: err.message });
            }
        }

        db.close();
        res.json({ success: true, dryRun, deletedCount: deleted.length, deleted, failed });
    } catch (err) {
        db.close();
        console.error('Cron cleanup-users error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
