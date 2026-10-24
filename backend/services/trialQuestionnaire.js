const { db } = require('../utils/database');
const { badRequest } = require('../utils/http');

/**
 * The online trial questionnaire, edited by the admin and stored as JSON in
 * app_settings ('trial_questionnaire'):
 *
 *   { questions: [{ id, text, textEn?, discipline: 'gym' | 'calisthenics' | null,
 *                   options: [{ id, text, textEn?, points }] }] }
 *
 * The person first picks the discipline (gym or calisthenics); then answers the
 * questions of that discipline plus those with discipline null. The points of the
 * chosen options add up to the score, and the score picks the trial template
 * (see services/trials). Visitors never see the points.
 */

const SETTING_KEY = 'trial_questionnaire';
const DISCIPLINES = ['gym', 'calisthenics'];
const LIMITS = { questions: 20, options: 8, text: 300, points: 100 };

/** Used until the admin saves their own: a starting point to edit. */
const DEFAULT_QUESTIONNAIRE = {
    questions: [
        {
            id: 'experience',
            text: 'Da quanto tempo ti alleni con continuità?',
            textEn: 'How long have you been training consistently?',
            discipline: null,
            options: [
                { id: 'none', text: 'Non mi alleno / ho appena iniziato', textEn: "I don't train / I just started", points: 0 },
                { id: 'lt6m', text: 'Da meno di 6 mesi', textEn: 'Less than 6 months', points: 1 },
                { id: '6m2y', text: 'Da 6 mesi a 2 anni', textEn: '6 months to 2 years', points: 2 },
                { id: 'gt2y', text: 'Da più di 2 anni', textEn: 'More than 2 years', points: 3 },
            ],
        },
        {
            id: 'frequency',
            text: 'Quante volte ti alleni a settimana?',
            textEn: 'How many times a week do you train?',
            discipline: null,
            options: [
                { id: '0-1', text: '0-1 volte', textEn: '0-1 times', points: 0 },
                { id: '2', text: '2 volte', textEn: '2 times', points: 1 },
                { id: '3', text: '3 volte', textEn: '3 times', points: 2 },
                { id: '4+', text: '4 o più', textEn: '4 or more', points: 3 },
            ],
        },
        {
            id: 'technique',
            text: 'Conosci la tecnica degli esercizi fondamentali (squat, panca, stacco)?',
            textEn: 'Do you know the technique of the main lifts (squat, bench press, deadlift)?',
            discipline: 'gym',
            options: [
                { id: 'no', text: 'No', textEn: 'No', points: 0 },
                { id: 'some', text: 'In parte', textEn: 'Partly', points: 1 },
                { id: 'yes', text: 'Sì, li eseguo con sicurezza', textEn: 'Yes, I do them confidently', points: 2 },
            ],
        },
        {
            id: 'pushups',
            text: 'Quanti piegamenti completi riesci a fare di fila?',
            textEn: 'How many full push-ups can you do in a row?',
            discipline: 'calisthenics',
            options: [
                { id: '0-5', text: 'Da 0 a 5', textEn: '0 to 5', points: 0 },
                { id: '6-15', text: 'Da 6 a 15', textEn: '6 to 15', points: 1 },
                { id: '16-30', text: 'Da 16 a 30', textEn: '16 to 30', points: 2 },
                { id: '30+', text: 'Più di 30', textEn: 'More than 30', points: 3 },
            ],
        },
        {
            id: 'pullups',
            text: 'Quante trazioni alla sbarra riesci a fare di fila?',
            textEn: 'How many pull-ups can you do in a row?',
            discipline: 'calisthenics',
            options: [
                { id: '0', text: 'Nessuna', textEn: 'None', points: 0 },
                { id: '1-3', text: 'Da 1 a 3', textEn: '1 to 3', points: 1 },
                { id: '4-10', text: 'Da 4 a 10', textEn: '4 to 10', points: 2 },
                { id: '10+', text: 'Più di 10', textEn: 'More than 10', points: 3 },
            ],
        },
    ],
};

const text = (value, field, required = true) => {
    const s = typeof value === 'string' ? value.trim() : '';
    if (required && !s) throw badRequest(`${field} is required`);
    if (s.length > LIMITS.text) throw badRequest(`${field} is too long`);
    return s;
};

const ID = /^[\w.+-]{1,40}$/;

/** Checks and normalizes a questionnaire sent by the admin; any problem is a 400. */
function validateQuestionnaire(input) {
    const questions = input && input.questions;
    if (!Array.isArray(questions) || questions.length === 0) throw badRequest('At least one question is required');
    if (questions.length > LIMITS.questions) throw badRequest(`At most ${LIMITS.questions} questions`);

    const questionIds = new Set();
    return {
        questions: questions.map((q, i) => {
            const where = `Question ${i + 1}`;
            if (!q || !ID.test(q.id) || questionIds.has(q.id)) throw badRequest(`${where}: missing or duplicate id`);
            questionIds.add(q.id);
            const discipline = q.discipline || null;
            if (discipline !== null && !DISCIPLINES.includes(discipline)) throw badRequest(`${where}: invalid discipline`);
            if (!Array.isArray(q.options) || q.options.length < 2) throw badRequest(`${where}: at least 2 answers are required`);
            if (q.options.length > LIMITS.options) throw badRequest(`${where}: at most ${LIMITS.options} answers`);

            const optionIds = new Set();
            return {
                id: q.id,
                text: text(q.text, `${where} text`),
                textEn: text(q.textEn, `${where} English text`, false),
                discipline,
                options: q.options.map((o, j) => {
                    const at = `${where}, answer ${j + 1}`;
                    if (!o || !ID.test(o.id) || optionIds.has(o.id)) throw badRequest(`${at}: missing or duplicate id`);
                    optionIds.add(o.id);
                    const points = Number(o.points);
                    if (!Number.isInteger(points) || Math.abs(points) > LIMITS.points) throw badRequest(`${at}: points must be a whole number`);
                    return { id: o.id, text: text(o.text, `${at} text`), textEn: text(o.textEn, `${at} English text`, false), points };
                }),
            };
        }),
    };
}

async function loadQuestionnaire() {
    const row = await db.get('SELECT value FROM app_settings WHERE key = ?', [SETTING_KEY]);
    if (!row) return DEFAULT_QUESTIONNAIRE;
    try {
        return JSON.parse(row.value);
    } catch {
        console.error('Invalid trial questionnaire in app_settings: using the default');
        return DEFAULT_QUESTIONNAIRE;
    }
}

async function saveQuestionnaire(input) {
    const questionnaire = validateQuestionnaire(input);
    await db.run(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [SETTING_KEY, JSON.stringify(questionnaire)]
    );
    return questionnaire;
}

const questionsFor = (questionnaire, discipline) =>
    questionnaire.questions.filter((q) => !q.discipline || q.discipline === discipline);

/** What a visitor sees: the questions without the points. */
const publicQuestionnaire = (questionnaire) => ({
    questions: questionnaire.questions.map((q) => ({
        id: q.id,
        text: q.text,
        textEn: q.textEn || null,
        discipline: q.discipline,
        options: q.options.map((o) => ({ id: o.id, text: o.text, textEn: o.textEn || null })),
    })),
});

/**
 * Score of a signup. answers = { [questionId]: optionId }; every question of the
 * discipline must be answered with one of its options (400 otherwise).
 * @returns {{ score: number, answers: { question, answer, points }[] }}  answers as shown, for the admin
 */
function scoreAnswers(questionnaire, discipline, answers) {
    if (!DISCIPLINES.includes(discipline)) throw badRequest('Invalid discipline');
    const given = answers && typeof answers === 'object' ? answers : {};
    let score = 0;
    const shown = questionsFor(questionnaire, discipline).map((q) => {
        const option = q.options.find((o) => o.id === given[q.id]);
        if (!option) throw badRequest('Please answer every question', 'MISSING_ANSWER');
        score += option.points;
        return { question: q.text, answer: option.text, points: option.points };
    });
    return { score, answers: shown };
}

module.exports = {
    DISCIPLINES,
    DEFAULT_QUESTIONNAIRE,
    validateQuestionnaire,
    loadQuestionnaire,
    saveQuestionnaire,
    publicQuestionnaire,
    scoreAnswers,
};
