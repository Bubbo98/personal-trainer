const express = require('express');
const { db } = require('../../utils/database');
const { route, badRequest } = require('../../utils/http');
const { normalizePhone } = require('../../utils/phone');

// Admin: the record of expired plans and deleted clients (written by the nightly cleanup, see utils/userRetention)
const router = express.Router();

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-10" → ['2026-10-01', '2026-11-01'], the month's bounds for occurred_at. */
function monthRange(month) {
    const [, year, mm] = month.match(MONTH);
    const next = Number(mm) === 12 ? `${Number(year) + 1}-01` : `${year}-${String(Number(mm) + 1).padStart(2, '0')}`;
    return [`${month}-01`, `${next}-01`];
}

/** Phones of the clients who are back: active, with a plan still valid or no plan yet (e.g. just created). */
async function returnedPhones() {
    const rows = await db.query(
        `SELECT u.phone FROM users u LEFT JOIN user_pdf_files p ON p.user_id = u.id
         WHERE u.is_active = 1 AND u.phone IS NOT NULL
           AND (p.expiration_date IS NULL OR p.expiration_date >= datetime('now'))`
    );
    return new Set(rows.map((r) => normalizePhone(r.phone)).filter(Boolean));
}

/**
 * The rows worth showing: those of clients who are back (see returnedPhones) are hidden, and
 * of the rows with the same phone number only the newest is kept, per event. Rows without a
 * phone are always kept. The rows stay in the table: only the listing leaves them out.
 */
function visibleEntries(rows, returned) {
    const seen = new Set();
    const hidden = { returned: 0, duplicates: 0 };
    const entries = rows.filter((r) => {
        const phone = normalizePhone(r.phone);
        if (!phone) return true;
        if (returned.has(phone)) {
            hidden.returned += 1;
            return false;
        }
        const key = `${r.event}:${phone}`;
        if (seen.has(key)) {
            hidden.duplicates += 1;
            return false;
        }
        seen.add(key);
        return true;
    });
    return { entries, hidden };
}

// GET /api/admin/retention-log[?month=YYYY-MM] — newest first; without month, everything.
// Clients who are back and repeated phone numbers are left out (see visibleEntries).
router.get('/retention-log', route(async (req, res) => {
    const { month } = req.query;
    if (month !== undefined && !MONTH.test(month)) throw badRequest('month must be YYYY-MM');
    const range = month ? monthRange(month) : null;

    const rows = await db.query(
        `SELECT id, event, reason, occurred_at, user_id, username, first_name, last_name, email, phone,
                trainer_name, expiration_date, created_at
         FROM retention_log
         ${range ? 'WHERE occurred_at >= ? AND occurred_at < ?' : ''}
         ORDER BY occurred_at DESC, id DESC`,
        range || []
    );
    const { entries, hidden } = visibleEntries(rows, await returnedPhones());
    res.json({
        success: true,
        data: {
            hidden,
            entries: entries.map((r) => ({
                id: r.id,
                event: r.event,
                reason: r.reason,
                occurredAt: r.occurred_at,
                userId: r.user_id,
                username: r.username,
                firstName: r.first_name,
                lastName: r.last_name,
                email: r.email,
                phone: r.phone,
                trainerName: r.trainer_name,
                expirationDate: r.expiration_date,
                recordedAt: r.created_at,
            })),
        },
    });
}));

module.exports = router;
