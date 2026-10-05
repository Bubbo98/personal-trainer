const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
const { renderNewFeedback, renderCheckInReminder, renderTrainerSeen } = require('../services/emailService');

describe('emails', () => {
    const feedback = {
        first_name: 'Mario<script>', last_name: 'Rossi', email: 'mario@example.com',
        energy_level: 'high', workouts_completed: 'almost_all', meal_plan_followed: 'mostly',
        sleep_quality: 'fair', physical_discomfort: 'minor', motivation_level: 'good', current_weight: 72.5,
        muscular_zones: '["spalla","<b>schiena</b>"]', muscular_notes: 'tira un po\'',
        discomfort_details: '<a href="https://evil.example">clicca</a>', weekly_highlights: 'Tutto ok & più forte',
    };

    it('new-check email escapes what the client wrote', () => {
        const { subject, html } = renderNewFeedback(feedback, 'Joshua');
        assert.match(subject, /\[PT Joshua\] Nuovo Check da Mario<script> Rossi/); // plain-text subject
        assert.ok(!html.includes('<script>'));
        assert.ok(!html.includes('<a href="https://evil.example">'));
        assert.ok(html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;clicca&lt;/a&gt;'));
        assert.ok(html.includes('&lt;b&gt;schiena&lt;/b&gt;'));
        assert.ok(html.includes('Tutto ok &amp; più forte'));
    });

    it('new-check email shows the answers with their Italian labels', () => {
        const { html } = renderNewFeedback(feedback);
        for (const label of ['Alta', 'Quasi tutti', 'In gran parte', 'Così così', 'Fastidi lievi', 'Buona', '72.5 kg']) {
            assert.ok(html.includes(label), label);
        }
        assert.ok(html.includes('https://www.esercizifacili.com/admin'));
    });

    it('client emails greet the client and link the dashboard', () => {
        const reminder = renderCheckInReminder('a@example.com', 'Anna', 'Denise');
        assert.equal(reminder.to, 'a@example.com');
        assert.ok(reminder.html.includes('Ciao Anna!') && reminder.html.includes('Denise'));
        assert.ok(reminder.html.includes('https://www.esercizifacili.com/dashboard'));

        const seen = renderTrainerSeen('a@example.com', '<i>Anna</i>', 'Joshua', '2026-10-01');
        assert.ok(seen.html.includes('&lt;i&gt;Anna&lt;/i&gt;'));
        assert.ok(seen.html.includes('1 ottobre 2026'));
    });
});
