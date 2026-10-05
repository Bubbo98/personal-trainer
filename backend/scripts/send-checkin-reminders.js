/**
 * Emails a check-in reminder to every client who is due one (same rule as the
 * client's form, see services/checkins). Run daily by GET /api/cron/send-reminders,
 * or by hand: node scripts/send-checkin-reminders.js
 */
require('dotenv').config();
const { clientsToRemind } = require('../services/checkins');
const { sendCheckInReminder } = require('../services/emailService');

const DELAY_BETWEEN_EMAILS_MS = 500; // stay under the email provider's rate limit

async function run() {
    const clients = await clientsToRemind();
    let sent = 0;
    let failed = 0;

    for (const client of clients) {
        const result = await sendCheckInReminder(client.email, client.firstName, client.trainerName);
        if (result.success) {
            sent++;
        } else {
            failed++;
            console.error(`Check-in reminder to user ${client.userId} failed:`, result.error);
        }
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));
    }

    console.log(`Check-in reminders: ${sent} sent, ${failed} failed`);
    return { sent, failed };
}

module.exports = { run };

if (require.main === module) {
    run().then(() => process.exit(0), (err) => {
        console.error(err);
        process.exit(1);
    });
}
