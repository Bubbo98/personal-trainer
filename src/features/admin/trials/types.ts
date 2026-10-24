/** 7-day trials (backend: services/trials, routes/admin/trials). */

export type Discipline = 'gym' | 'calisthenics';
export const DISCIPLINES: Discipline[] = ['gym', 'calisthenics'];

export type TrialKind = 'free_session' | 'online';
export type TrialStatus = 'to_contact' | 'contacted' | 'client' | 'not_interested';
export const TRIAL_STATUSES: TrialStatus[] = ['to_contact', 'contacted', 'client', 'not_interested'];
/** not_opened → active → ended; link_expired: never opened in time; deleted: the trial account is gone. */
export type TrialState = 'not_opened' | 'active' | 'ended' | 'link_expired' | 'deleted';

export interface TrialTemplate {
  id: number;
  name: string;
  discipline: Discipline;
  description: string | null;
  /** The hidden user that holds the template's plan: edit it with the usual plan editors. */
  userId: number;
  online: boolean;
  minScore: number | null;
  maxScore: number | null;
  exerciseCount: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInput {
  name: string;
  discipline: Discipline;
  description: string;
  online: boolean;
  minScore: number | null;
  maxScore: number | null;
}

export interface TrialAnswer {
  question: string;
  answer: string;
  points: number;
}

export interface Trial {
  id: number;
  kind: TrialKind;
  templateId: number | null;
  templateName: string | null;
  /** The trial account (plan copy); null once deleted by the nightly cleanup. */
  userId: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  discipline: Discipline | null;
  score: number | null;
  answers: TrialAnswer[];
  marketingConsent: boolean;
  status: TrialStatus;
  notes: string | null;
  createdAt: string;
  openedAt: string | null;
  expiresAt: string | null;
  lastLogin: string | null;
  /** Exercises the person logged during the trial. */
  logCount: number;
  state: TrialState;
  daysLeft: number;
}

export interface FreeSessionInput {
  templateId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  textEn?: string;
  points: number;
}

export interface Question {
  id: string;
  text: string;
  textEn?: string;
  /** null: asked for both disciplines. */
  discipline: Discipline | null;
  options: QuestionOption[];
}

export interface Questionnaire {
  questions: Question[];
}

export const trialName = (t: Pick<Trial, 'firstName' | 'lastName'>) => [t.firstName, t.lastName].filter(Boolean).join(' ').trim();
