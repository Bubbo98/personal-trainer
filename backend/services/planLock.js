const { db } = require('../utils/database');

// A plan scheduled to appear later (user_pdf_files.visible_from in the future) hides
// everything that comes with it: the PDF, the exercises and the videos.

/** True while the plan row is scheduled to appear later. */
const isLocked = (pdf) => !!pdf && !!pdf.visible_from && new Date(pdf.visible_from) > new Date();

/** True while the user's plan is scheduled to appear later. */
async function isPlanLocked(userId) {
    return isLocked(await db.get('SELECT visible_from FROM user_pdf_files WHERE user_id = ?', [userId]));
}

module.exports = { isLocked, isPlanLocked };
