/** The online trial signup (public page /prova-gratuita): questionnaire steps and the request body. */

export type Discipline = 'gym' | 'calisthenics';

export interface PublicOption {
  id: string;
  text: string;
  textEn: string | null;
}

export interface PublicQuestion {
  id: string;
  text: string;
  textEn: string | null;
  discipline: Discipline | null;
  options: PublicOption[];
}

/** GET /api/trials/questionnaire */
export interface PublicQuestionnaire {
  disciplines: Discipline[];
  trialDays: number;
  /** Training days a week the person can choose (always asked: they pick the template). */
  dayOptions: number[];
  questions: PublicQuestion[];
}

export interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  privacy: boolean;
  /** The notice on the use of the plan (generic plan, use at your own risk). */
  disclaimer: boolean;
  marketing: boolean;
}

/** The English text when the page is in English and the admin wrote one. */
export const localized = (item: { text: string; textEn: string | null }, lang: string) =>
  lang.startsWith('en') && item.textEn ? item.textEn : item.text;

/** The questions a person of that discipline answers, in order. */
export const questionsFor = (questions: PublicQuestion[], discipline: Discipline | null) =>
  discipline ? questions.filter((q) => !q.discipline || q.discipline === discipline) : [];

/**
 * Steps: the discipline (skipped when only one is offered), the training days, one per question, then the contacts.
 * Step ids: 'discipline' | 'days' | `q:${questionId}` | 'contact'.
 */
export function wizardSteps(questionnaire: PublicQuestionnaire, discipline: Discipline | null) {
  const questions = questionsFor(questionnaire.questions, discipline);
  return [...(questionnaire.disciplines.length > 1 ? ['discipline'] : []), 'days', ...questions.map((q) => `q:${q.id}`), 'contact'];
}

/** The discipline already chosen, or the only one offered. */
export const effectiveDiscipline = (questionnaire: PublicQuestionnaire, chosen: Discipline | null) =>
  questionnaire.disciplines.length === 1 ? questionnaire.disciplines[0] : chosen;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().\-/]{6,20}$/;

/** Field errors of the contact form, as translation keys (empty when it can be sent). */
export function contactErrors(form: ContactForm): Partial<Record<keyof ContactForm, string>> {
  const errors: Partial<Record<keyof ContactForm, string>> = {};
  if (!form.firstName.trim()) errors.firstName = 'trialSignup.errors.firstName';
  if (!EMAIL.test(form.email.trim())) errors.email = 'trialSignup.errors.email';
  if (!PHONE.test(form.phone.trim())) errors.phone = 'trialSignup.errors.phone';
  if (!form.privacy) errors.privacy = 'trialSignup.errors.privacy';
  if (!form.disclaimer) errors.disclaimer = 'trialSignup.errors.disclaimer';
  return errors;
}

/** Bot checks sent with the signup (see backend services/signupGuard). */
export interface BotCheck {
  /** Time since the questionnaire appeared: bots submit in an instant. */
  elapsedMs: number;
  /** Hidden field: people leave it empty. */
  website: string;
  /** Cloudflare Turnstile token, when the widget is on. */
  captchaToken: string | null;
}

/** POST /api/trials/signup body. */
export function signupBody(
  discipline: Discipline,
  daysPerWeek: number,
  answers: Record<string, string>,
  questions: PublicQuestion[],
  form: ContactForm,
  lang: string,
  check: BotCheck,
) {
  const asked = questionsFor(questions, discipline).map((q) => q.id);
  return {
    discipline,
    daysPerWeek,
    answers: Object.fromEntries(asked.filter((id) => answers[id]).map((id) => [id, answers[id]])),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    privacy: form.privacy,
    disclaimer: form.disclaimer,
    marketing: form.marketing,
    lang: lang.startsWith('en') ? 'en' : 'it',
    elapsedMs: Math.round(check.elapsedMs),
    website: check.website,
    ...(check.captchaToken ? { captchaToken: check.captchaToken } : {}),
  };
}
