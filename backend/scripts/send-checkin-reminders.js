require('dotenv').config();
const { createClient } = require('@libsql/client');
const { sendCheckInReminder } = require('../services/emailService');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * Find users who should receive a check reminder
 * Logic mirrors /api/feedback/should-show:
 * - User has a PDF that was updated 1+ week ago
 * - User hasn't submitted feedback in 2+ weeks (for current PDF version)
 */
async function findUsersNeedingReminder() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Find users who:
  // 1. Have a PDF updated more than 1 week ago
  // 2. Either have no feedback OR last feedback was 2+ weeks ago
  // 3. Have an email address stored in their feedbacks (we use the most recent one)
  const query = `
    SELECT DISTINCT
      u.id as user_id,
      u.first_name,
      u.username,
      upf.updated_at as pdf_updated_at,
      (
        SELECT uf.email
        FROM user_feedbacks uf
        WHERE uf.user_id = u.id
        ORDER BY uf.created_at DESC
        LIMIT 1
      ) as last_known_email,
      (
        SELECT MAX(uf.created_at)
        FROM user_feedbacks uf
        WHERE uf.user_id = u.id AND uf.pdf_change_date = upf.updated_at
      ) as last_feedback_at
    FROM users u
    JOIN user_pdf_files upf ON upf.user_id = u.id
    WHERE
      upf.updated_at <= ?
      AND u.username NOT LIKE '%admin%'
  `;

  const result = await client.execute({ sql: query, args: [oneWeekAgo] });
  const usersNeedingReminder = [];

  for (const row of result.rows) {
    // Skip if no email available
    if (!row.last_known_email) {
      console.log(`⏭️  Skipping user ${row.user_id} (${row.first_name || row.username}): no email on file`);
      continue;
    }

    // Check if should show feedback (same logic as API)
    const lastFeedbackAt = row.last_feedback_at ? new Date(row.last_feedback_at) : null;

    if (!lastFeedbackAt) {
      // No feedback yet for this PDF version - should show
      usersNeedingReminder.push({
        userId: row.user_id,
        firstName: row.first_name || row.username,
        email: row.last_known_email,
        reason: 'first_feedback_due'
      });
    } else if (new Date(lastFeedbackAt) <= new Date(twoWeeksAgo)) {
      // Last feedback was 2+ weeks ago - should show
      usersNeedingReminder.push({
        userId: row.user_id,
        firstName: row.first_name || row.username,
        email: row.last_known_email,
        reason: 'biweekly_reminder'
      });
    } else {
      console.log(`⏭️  Skipping user ${row.user_id} (${row.first_name || row.username}): recent feedback exists`);
    }
  }

  return usersNeedingReminder;
}

/**
 * Main function to run the reminder job
 */
async function run() {
  console.log('🔔 Starting check reminder job...');
  console.log(`📅 Time: ${new Date().toISOString()}`);

  try {
    const users = await findUsersNeedingReminder();

    if (users.length === 0) {
      console.log('✅ No users need reminders today');
      return { sent: 0, failed: 0 };
    }

    console.log(`📋 Found ${users.length} users who need check reminders`);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      console.log(`📧 Sending reminder to ${user.firstName} (${user.email}) - reason: ${user.reason}`);

      const result = await sendCheckInReminder(user.email, user.firstName);

      if (result.success) {
        sent++;
        console.log(`   ✅ Sent successfully`);
      } else {
        failed++;
        console.log(`   ❌ Failed: ${result.error}`);
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Sent: ${sent}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('🏁 Check reminder job completed');

    return { sent, failed };
  } catch (err) {
    console.error('❌ Error running reminder job:', err);
    throw err;
  }
}

// Export for use as module (cron job)
module.exports = { run, findUsersNeedingReminder };

// Run directly if executed as script
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
