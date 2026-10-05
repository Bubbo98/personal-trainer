/** Shapes of the client-area API answers. */

export interface SessionUser {
  id: number;
  username: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  trainerId?: number | null;
}

export interface Technique {
  id: number;
  title: string;
  description: string;
  signedUrl: string | null;
  thumbnailKey?: string | null;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  filePath: string;
  signedUrl?: string | null;
  duration: number;
  thumbnailKey?: string | null;
  category: string;
  createdAt: string;
  grantedAt?: string;
  addedAt?: string;
  expiresAt?: string | null;
  techniques?: Technique[];
  groupId?: number | null;
  groupLabel?: string | null;
  /** Id of the video's assignment to a training day (training-days API only). */
  assignmentId?: number;
  /** Plan exercise this day video belongs to; null = extra video of the day. */
  exerciseId?: number | null;
}

export interface TrainingDay {
  id: number;
  dayNumber: number;
  dayName: string | null;
  videos: Video[];
}

export interface Exercise {
  id: number;
  day_number: number;
  day_name: string | null;
  order_index: number;
  name: string;
  sets: string | null;
  reps: string | null;
  rest: string | null;
  notes: string | null;
  /** How many weights the exercise takes (e.g. 2 for a superset). */
  weight_slots?: number | null;
}

export interface ExerciseLog {
  id: number;
  /** Null once the exercise left the plan: name and day come from the snapshots. */
  exercise_id: number | null;
  week_start: string;
  weight: string | null;
  sets_done: number | null;
  reps_done: string | null;
  notes: string | null;
  exercise_name: string | null;
  day_number_snapshot: number | null;
  day_name_snapshot: string | null;
}

export type PlanInfo =
  | { locked: true; visibleFrom: string }
  | {
      locked: false;
      originalName: string;
      fileSize: number;
      uploadedAt: string;
      updatedAt: string;
      expirationDate: string | null;
      visibleFrom: string | null;
    };

export type CheckinReason = 'exempt' | 'no_pdf' | 'too_soon' | 'too_soon_since_last';

export interface CheckinStatus {
  shouldShow: boolean;
  reason?: CheckinReason;
  pdfUpdatedAt?: string;
  lastFeedbackAt?: string | null;
}

export const ANSWER_OPTIONS = {
  energy: ['high', 'medium', 'low'],
  workouts: ['all', 'almost_all', 'few_or_none'],
  mealPlan: ['completely', 'mostly', 'sometimes', 'no'],
  sleep: ['excellent', 'good', 'fair', 'poor'],
  discomfort: ['none', 'minor', 'significant'],
  motivation: ['very_high', 'good', 'medium', 'low'],
} as const;

export type AnswerKind = keyof typeof ANSWER_OPTIONS;
export type Answer<K extends AnswerKind> = (typeof ANSWER_OPTIONS)[K][number];

export interface Checkin {
  id: number;
  feedback_date: string;
  created_at: string;
  energy_level: Answer<'energy'>;
  workouts_completed: Answer<'workouts'>;
  meal_plan_followed: Answer<'mealPlan'>;
  sleep_quality: Answer<'sleep'>;
  physical_discomfort: Answer<'discomfort'>;
  motivation_level: Answer<'motivation'>;
  weekly_highlights: string | null;
  current_weight: number | null;
}

/** Body sent to POST /feedback. Zone names stay Italian: they are stored and read by the trainer. */
export interface CheckinSubmission {
  firstName: string;
  lastName: string;
  email: string;
  energyLevel: Answer<'energy'>;
  workoutsCompleted: Answer<'workouts'>;
  mealPlanFollowed: Answer<'mealPlan'>;
  sleepQuality: Answer<'sleep'>;
  physicalDiscomfort: Answer<'discomfort'>;
  muscularZones: string[];
  muscularNotes: string;
  articularZones: string[];
  articularNotes: string;
  motivationLevel: Answer<'motivation'>;
  weeklyHighlights: string;
  currentWeight: string;
}

export interface SeenNotification {
  id: number;
  feedback_date: string;
  trainer_seen_at: string;
}

interface CompositionRow {
  value: number;
  percent: number;
  valutazione: string;
}

/** Parsed body-composition report (keys come from the Italian device printout). */
export interface ParsedBodyReport {
  header: {
    eta: number | null;
    altezzaCm: number | null;
    dataRilevazione: string | null;
  };
  bodyComposition: Record<string, CompositionRow | null>;
  bodyScore: number | null;
  weightControl: {
    pesoObiettivo: number | null;
    controlloPeso: number | null;
    controlloGrasso: number | null;
    controlloMuscoli: number | null;
  };
  obesityEvaluation: {
    imc: number | null;
    percGrasso: number | null;
    livelloObesita: number | null;
  };
  otherIndicators: {
    livelloGrassoViscerale: number | null;
    tassoMetabolicoBasale: number | null;
    massaCorporeaMagra: number | null;
    grassoSottocutaneo: number | null;
    smi: number | null;
    etaCorporea: number | null;
    rapportoVitaFianchi: number | null;
  };
}

export interface BodyReport {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  originalName: string;
  fileSize: number;
  parsedData: ParsedBodyReport | null;
}

export interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  productUrl: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  products: Product[];
}

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean | number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewInput {
  rating: number;
  title: string;
  comment: string;
}
