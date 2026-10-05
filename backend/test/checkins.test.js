const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkinStatus, parseDbDate } = require('../services/checkins');

const now = new Date('2026-10-05T12:00:00Z');
const daysAgo = (days, hours = 0) => {
    const d = new Date(now.getTime() - (days * 24 + hours) * 3600 * 1000);
    return d.toISOString().slice(0, 19).replace('T', ' '); // SQLite CURRENT_TIMESTAMP format (UTC)
};

describe('check-in rule', () => {
    it('reads SQLite timestamps as UTC', () => {
        assert.equal(parseDbDate('2026-10-05 10:00:00').toISOString(), '2026-10-05T10:00:00.000Z');
        assert.equal(parseDbDate('2026-10-05T10:00:00.000Z').toISOString(), '2026-10-05T10:00:00.000Z');
        assert.equal(parseDbDate(null), null);
    });

    it('never asks exempt clients or clients without a plan', () => {
        assert.equal(checkinStatus({ checkin_exempt: 1, pdf_updated_at: daysAgo(30) }, now).reason, 'exempt');
        assert.equal(checkinStatus({ checkin_exempt: 0, pdf_updated_at: null }, now).reason, 'no_pdf');
    });

    it('asks the first check one week after the plan', () => {
        assert.equal(checkinStatus({ pdf_updated_at: daysAgo(6, 23) }, now).reason, 'too_soon');
        assert.equal(checkinStatus({ pdf_updated_at: daysAgo(7, 1) }, now).shouldShow, true);
    });

    it('then every two weeks since the last check', () => {
        const plan = daysAgo(40);
        assert.equal(checkinStatus({ pdf_updated_at: plan, last_feedback_at: daysAgo(13) }, now).reason, 'too_soon_since_last');
        assert.equal(checkinStatus({ pdf_updated_at: plan, last_feedback_at: daysAgo(14, 1) }, now).shouldShow, true);
    });
});
