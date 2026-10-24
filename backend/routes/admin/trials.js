const express = require('express');
const { db } = require('../../utils/database');
const { route, id } = require('../../utils/http');
const trials = require('../../services/trials');
const { loadQuestionnaire, saveQuestionnaire } = require('../../services/trialQuestionnaire');

// Admin: trial templates, trials (free sessions and online signups), the online questionnaire.
// A template's or a trial's plan is edited with the usual plan routes, on its userId.
const router = express.Router();

// ─── Templates ───────────────────────────────────────────────────────────────

// GET /api/admin/trial-templates
router.get('/trial-templates', route(async (req, res) => {
    res.json({ success: true, data: { templates: await trials.listTemplates() } });
}));

// POST /api/admin/trial-templates — Body: { name, discipline ('gym' | 'calisthenics'), description?, online?, minScore?, maxScore? }
router.post('/trial-templates', route(async (req, res) => {
    res.status(201).json({ success: true, data: { template: await trials.createTemplate(req.body || {}) } });
}));

// PUT /api/admin/trial-templates/:id — any of the POST fields
router.put('/trial-templates/:id', route(async (req, res) => {
    res.json({ success: true, data: { template: await trials.updateTemplate(id(req.params.id, 'template ID'), req.body || {}) } });
}));

// DELETE /api/admin/trial-templates/:id — trials already started keep their copy of the plan
router.delete('/trial-templates/:id', route(async (req, res) => {
    await trials.deleteTemplate(id(req.params.id, 'template ID'));
    res.json({ success: true, message: 'Template deleted' });
}));

// ─── Trials ──────────────────────────────────────────────────────────────────

// GET /api/admin/trials — every trial, newest first, with its state (not_opened | active | ended | link_expired | deleted)
router.get('/trials', route(async (req, res) => {
    res.json({ success: true, data: { trials: await trials.listTrials() } });
}));

// POST /api/admin/trials — a free session: Body: { templateId, firstName?, lastName?, email?, phone?, notes? } → { trial, loginUrl }
router.post('/trials', route(async (req, res) => {
    const { templateId, firstName, lastName, email, phone, notes } = req.body || {};
    const created = await trials.createTrial({
        kind: 'free_session', templateId: id(templateId, 'template ID'), firstName, lastName, email, phone, notes,
    });
    res.status(201).json({ success: true, data: created });
}));

// GET /api/admin/trials/:id/link — the trial's dashboard link
router.get('/trials/:id/link', route(async (req, res) => {
    res.json({ success: true, data: { loginUrl: await trials.trialLink(id(req.params.id, 'trial ID')) } });
}));

// PUT /api/admin/trials/:id — Body: any of { status, notes, firstName, lastName, email, phone }
router.put('/trials/:id', route(async (req, res) => {
    res.json({ success: true, data: { trial: await trials.updateTrial(id(req.params.id, 'trial ID'), req.body || {}) } });
}));

// POST /api/admin/trials/:id/extend — Body: { days }
router.post('/trials/:id/extend', route(async (req, res) => {
    const trial = await trials.extendTrial(id(req.params.id, 'trial ID'), (req.body || {}).days);
    res.json({ success: true, data: { trial } });
}));

// DELETE /api/admin/trials/:id — the record, the contacts and the trial user
router.delete('/trials/:id', route(async (req, res) => {
    await trials.deleteTrial(id(req.params.id, 'trial ID'));
    res.json({ success: true, message: 'Trial deleted' });
}));

// ─── Questionnaire ───────────────────────────────────────────────────────────

// GET /api/admin/trial-questionnaire — with the points; isDefault until the admin saves one
router.get('/trial-questionnaire', route(async (req, res) => {
    const [questionnaire, saved] = await Promise.all([
        loadQuestionnaire(),
        db.get("SELECT updated_at FROM app_settings WHERE key = 'trial_questionnaire'"),
    ]);
    res.json({ success: true, data: { questionnaire, isDefault: !saved, updatedAt: saved ? saved.updated_at : null } });
}));

// PUT /api/admin/trial-questionnaire — Body: { questions } (see services/trialQuestionnaire)
router.put('/trial-questionnaire', route(async (req, res) => {
    res.json({ success: true, data: { questionnaire: await saveQuestionnaire(req.body || {}) } });
}));

module.exports = router;
