import { filterTrials, missingDays, rangeGaps, rangeLabel, scoreRange, whatsappUrl } from './helpers';
import type { Questionnaire, Trial, TrialTemplate } from './types';

const questionnaire: Questionnaire = {
  dayOptions: [2, 3, 4],
  questions: [
    { id: 'a', text: 'A', discipline: null, options: [{ id: 'x', text: 'X', points: 0 }, { id: 'y', text: 'Y', points: 3 }] },
    { id: 'b', text: 'B', discipline: 'gym', options: [{ id: 'x', text: 'X', points: 1 }, { id: 'y', text: 'Y', points: 2 }] },
    { id: 'c', text: 'C', discipline: 'calisthenics', options: [{ id: 'x', text: 'X', points: -1 }, { id: 'y', text: 'Y', points: 5 }] },
  ],
};

const template = (over: Partial<TrialTemplate>): TrialTemplate => ({
  id: 1, name: 'T', discipline: 'gym', description: null, userId: 9, online: true, minScore: null, maxScore: null,
  exerciseCount: 0, videoCount: 0, dayCount: 3, createdAt: '', updatedAt: '', ...over,
});

const trial = (over: Partial<Trial>): Trial => ({
  id: 1, kind: 'free_session', templateId: 1, templateName: 'Palestra base', userId: 5, firstName: 'Mario', lastName: 'Rossi',
  email: null, phone: '333 1234567', discipline: 'gym', score: null, answers: [], marketingConsent: false, status: 'to_contact',
  notes: null, createdAt: '2026-10-01 10:00:00', disclaimerAcceptedAt: null, openedAt: null, expiresAt: null, lastLogin: null, logCount: 0, state: 'not_opened', daysLeft: 7,
  ...over,
});

describe('trial helpers', () => {
  it('scoreRange adds the lowest and highest points of the questions of the discipline', () => {
    expect(scoreRange(questionnaire, 'gym')).toEqual({ min: 1, max: 5 });
    expect(scoreRange(questionnaire, 'calisthenics')).toEqual({ min: -1, max: 8 });
    const unscored = { questions: [...questionnaire.questions, { ...questionnaire.questions[0], id: 'd', type: 'choice' as const }, { id: 'e', text: 'E', discipline: null, type: 'open' as const, options: [] }] };
    expect(scoreRange(unscored, 'gym')).toEqual({ min: 1, max: 5 });
  });

  it('rangeGaps lists the scores no online template covers', () => {
    const templates = [template({ minScore: 1, maxScore: 2 }), template({ id: 2, minScore: 4 }), template({ id: 3, online: false, minScore: 3, maxScore: 3 })];
    expect(rangeGaps(templates, questionnaire, 'gym')).toEqual({ min: 1, max: 5, uncovered: [3], hasOnline: true });
    expect(rangeGaps(templates, questionnaire, 'calisthenics').hasOnline).toBe(false);
  });

  it('missingDays lists the days offered that no online template of the discipline has', () => {
    const templates = [template({ dayCount: 3 }), template({ id: 2, dayCount: 4, online: false }), template({ id: 3, discipline: 'calisthenics', dayCount: 2 })];
    expect(missingDays(templates, questionnaire, 'gym')).toEqual([2, 4]);
    expect(missingDays(templates, questionnaire, 'calisthenics')).toEqual([3, 4]);
    expect(missingDays([], questionnaire, 'gym')).toEqual([]);
  });

  it('rangeLabel', () => {
    expect(rangeLabel({ minScore: null, maxScore: null }, 'any')).toBe('any');
    expect(rangeLabel({ minScore: 0, maxScore: 6 }, 'any')).toBe('0-6');
    expect(rangeLabel({ minScore: 7, maxScore: null }, 'any')).toBe('7+');
    expect(rangeLabel({ minScore: null, maxScore: 3 }, 'any')).toBe('≤ 3');
  });

  it('whatsappUrl adds +39 to Italian mobiles and keeps other prefixes', () => {
    expect(whatsappUrl('333 123 4567')).toBe('https://wa.me/393331234567');
    expect(whatsappUrl('+39 333-1234567')).toBe('https://wa.me/393331234567');
    expect(whatsappUrl('0041 79 123 45 67')).toBe('https://wa.me/41791234567');
    expect(whatsappUrl('')).toBeNull();
    expect(whatsappUrl(null)).toBeNull();
  });

  it('filterTrials: ended trials to contact come first; filters and search', () => {
    const trials = [
      trial({ id: 1, state: 'active', daysLeft: 3 }),
      trial({ id: 2, state: 'ended', firstName: 'Giulia', email: 'giulia@example.com' }),
      trial({ id: 3, state: 'ended', status: 'client' }),
      trial({ id: 4, state: 'not_opened' }),
    ];
    expect(filterTrials(trials, 'all', '').map((t) => t.id)).toEqual([2, 1, 4, 3]);
    expect(filterTrials(trials, 'to_call', '').map((t) => t.id)).toEqual([2]);
    expect(filterTrials(trials, 'running', '').map((t) => t.id)).toEqual([1, 4]);
    expect(filterTrials(trials, 'done', '').map((t) => t.id)).toEqual([3]);
    expect(filterTrials(trials, 'all', 'GIULIA').map((t) => t.id)).toEqual([2]);
  });
});
