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

module.exports = router;
