import type { Discipline, Question, Questionnaire, Trial, TrialTemplate } from './types';

/** Questions a person of that discipline answers. */
export const questionsFor = (questionnaire: Pick<Questionnaire, 'questions'>, discipline: Discipline) =>
  questionnaire.questions.filter((q) => !q.discipline || q.discipline === discipline);

export const questionType = (q: Pick<Question, 'type'>) => q.type ?? 'scored';

/** Lowest and highest score a person of that discipline can get (scored questions only). */
export function scoreRange(questionnaire: Pick<Questionnaire, 'questions'>, discipline: Discipline) {
  return questionsFor(questionnaire, discipline).filter((q) => questionType(q) === 'scored').reduce(
    (range, q) => {
      const points = q.options.map((o) => Number(o.points) || 0);
      if (points.length === 0) return range;
      return { min: range.min + Math.min(...points), max: range.max + Math.max(...points) };
    },
    { min: 0, max: 0 },
  );
}

/**
 * Online templates of a discipline that no score reaches, and scores that fall in
 * no template's range (they get the closest template): hints for the admin.
 */
export function rangeGaps(templates: TrialTemplate[], questionnaire: Questionnaire, discipline: Discipline) {
  const { min, max } = scoreRange(questionnaire, discipline);
  const online = templates.filter((t) => t.online && t.discipline === discipline);
  const covers = (t: TrialTemplate, score: number) => (t.minScore === null || score >= t.minScore) && (t.maxScore === null || score <= t.maxScore);
  const uncovered: number[] = [];
  for (let score = min; score <= max; score++) if (online.length > 0 && !online.some((t) => covers(t, score))) uncovered.push(score);
  return { min, max, uncovered, hasOnline: online.length > 0 };
}

/** Training days offered in the questionnaire that no online template of the discipline has: they get the closest plan. */
export function missingDays(templates: TrialTemplate[], questionnaire: Questionnaire, discipline: Discipline) {
  const online = templates.filter((t) => t.online && t.discipline === discipline);
  if (online.length === 0) return [];
  return questionnaire.dayOptions.filter((d) => !online.some((t) => t.dayCount === d));
}

/** "0-6", "7+", "≤ 3", "tutti" (any) — the score range of a template. */
export function rangeLabel(t: Pick<TrialTemplate, 'minScore' | 'maxScore'>, any: string) {
  if (t.minScore === null && t.maxScore === null) return any;
  if (t.minScore === null) return `≤ ${t.maxScore}`;
  if (t.maxScore === null) return `${t.minScore}+`;
  return t.minScore === t.maxScore ? String(t.minScore) : `${t.minScore}-${t.maxScore}`;
}

/** wa.me link for a phone number; Italian mobiles without prefix get +39. null when there are no digits. */
export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^3\d{8,9}$/.test(digits)) digits = `39${digits}`;
  digits = digits.replace(/\D/g, '');
  return digits.length >= 6 ? `https://wa.me/${digits}` : null;
}

/** Short unique id for a new question or answer. */
export const newId = (taken: string[]) => {
  let id = '';
  do id = Math.random().toString(36).slice(2, 8);
  while (taken.includes(id));
  return id;
};

export const emptyQuestion = (taken: string[]): Question => {
  const id = newId(taken);
  return { id, text: '', textEn: '', discipline: null, type: 'scored', options: [{ id: 'a', text: '', textEn: '', points: 0 }, { id: 'b', text: '', textEn: '', points: 1 }] };
};

/** The trials to call first: ended and still to contact, then running ones. */
export function sortTrials(trials: Trial[]) {
  const rank = (t: Trial) => (t.status === 'to_contact' && t.state === 'ended' ? 0 : t.state === 'active' ? 1 : t.state === 'not_opened' ? 2 : 3);
  return [...trials].sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
}

export type TrialFilter = 'all' | 'to_call' | 'running' | 'done';

export function filterTrials(trials: Trial[], filter: TrialFilter, search: string) {
  const q = search.trim().toLowerCase();
  return sortTrials(trials).filter((t) => {
    if (filter === 'to_call' && !(t.status === 'to_contact' && t.state !== 'active' && t.state !== 'not_opened')) return false;
    if (filter === 'running' && t.state !== 'active' && t.state !== 'not_opened') return false;
    if (filter === 'done' && (t.status === 'to_contact' || t.state === 'active' || t.state === 'not_opened')) return false;
    if (!q) return true;
    return [t.firstName, t.lastName, t.email, t.phone, t.templateName, t.notes].some((v) => v?.toLowerCase().includes(q));
  });
}
