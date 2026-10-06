/** Shapes of the admin API answers. */

export interface Trainer {
  id: number;
  name: string;
  email?: string | null;
  createdAt: string;
}

export interface PlanSummary {
  expirationDate: string | null;
  durationMonths: number | null;
  durationDays: number | null;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isPaying: boolean;
  checkinExempt: boolean;
  trainerId: number | null;
  trainerName?: string | null;
  createdAt: string;
  lastLogin?: string | null;
  videoCount: number;
  pdf: (PlanSummary & { originalName: string }) | null;
}

export interface UserInput {
  firstName: string;
  lastName: string;
  email: string;
  isPaying: boolean;
  trainerId: number;
}

export interface CreateUserInput extends UserInput {
  username: string;
}

export interface UpdateUserInput extends UserInput {
  checkinExempt: boolean;
}

export const VIDEO_CATEGORIES = ['palestra', 'corpoLibero'] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

// Stored values: the labels are translated (admin:muscleGroups.*)
export const MUSCLE_GROUPS = [
  'Polpaccio', 'Quadricipite', 'Femorale', 'Gluteo', 'Lombare', 'Dorsale', 'Trapezio', 'Pettorale', 'Spalle',
  'Bicipite', 'Tricipite', 'Addome', 'Avambraccio', 'Cardio', 'Stability', 'Transizioni', 'Tecniche', 'Stretching',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Muscle groups with a special role: technique videos and stretching extras. */
export const TECHNIQUES_GROUP: MuscleGroup = 'Tecniche';
export const STRETCHING_GROUP: MuscleGroup = 'Stretching';

export interface AdminVideo {
  id: number;
  title: string;
  description: string | null;
  filePath: string;
  signedUrl?: string | null;
  duration: number | null;
  thumbnailKey?: string | null;
  category: string;
  muscleGroup?: string | null;
  createdAt: string;
  userCount?: number;
  grantedAt?: string;
  expiresAt?: string | null;
}

export interface VideoPage {
  videos: AdminVideo[];
  totalCount: number;
  totalPages?: number;
  currentPage?: number;
  missingThumbnailCount: number;
}

export interface VideoInput {
  title: string;
  description: string;
  muscleGroup: string;
}

export interface CreateVideoInput extends VideoInput {
  filePath: string;
  duration: number;
  category: VideoCategory | '';
}

export interface PlanPdf {
  id: number;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  updatedAt: string;
  durationMonths: number | null;
  durationDays: number | null;
  expirationDate: string | null;
  visibleFrom: string | null;
}

export interface BodyReportSummary {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  uploadedBy: string;
  originalName: string;
  fileSize: number;
}

/** A plan exercise as the editor holds it (key = stable id for React and drag & drop). */
export interface PlanExercise {
  key: string;
  id?: number;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  weightSlots: number;
}

export interface PlanDay {
  key: string;
  dayNumber: number;
  dayName: string;
  exercises: PlanExercise[];
}

export interface ServerExercise {
  id: number;
  day_number: number;
  day_name: string | null;
  order_index: number;
  name: string;
  sets: string | null;
  reps: string | null;
  rest: string | null;
  notes: string | null;
  weight_slots: number | null;
}

export interface AdminWeightLog {
  id: number;
  exercise_id: number | null;
  exercise_name: string | null;
  day_number: number | null;
  day_name: string | null;
  week_start: string;
  weight: string | null;
  sets_done: number | null;
  reps_done: string | null;
  planned_sets: string | null;
  planned_reps: string | null;
}

export interface Technique {
  id: number;
  title: string;
}

export interface DayVideo extends AdminVideo {
  assignmentId: number;
  orderIndex: number;
  addedAt: string;
  techniques: Technique[];
  groupId: number | null;
  groupLabel: string | null;
  exerciseId?: number | null;
}

export interface TrainingDay {
  id: number;
  dayNumber: number;
  dayName: string | null;
  videos: DayVideo[];
}

export interface Checkin {
  id: number;
  user_id: number;
  username: string;
  user_first_name: string | null;
  user_last_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  feedback_date: string;
  energy_level: string;
  workouts_completed: string;
  meal_plan_followed: string;
  sleep_quality: string;
  physical_discomfort: string;
  discomfort_details: string | null;
  muscular_zones: string | null;
  muscular_notes: string | null;
  articular_zones: string | null;
  articular_notes: string | null;
  motivation_level: string;
  weekly_highlights: string | null;
  current_weight: number | null;
  created_at: string;
  pdf_change_date: string | null;
  trainer_seen_at: string | null;
  is_first_of_scheda?: number | boolean;
}

export interface CheckinStats {
  total: number;
  withDiscomfort: number;
  lowMotivation: number;
  missedWorkouts: number;
}

export interface CheckinPage {
  feedbacks: Checkin[];
  total: number;
  totalPages: number;
  stats: CheckinStats;
}

export interface CheckinUserSummary {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  total_feedbacks: number;
  last_feedback_date: string;
  last_energy_level: string;
  last_motivation_level: string;
  last_physical_discomfort: string;
  last_current_weight: number | null;
}

export interface AdminReview {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean | number;
  isFeatured: boolean | number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  user: { firstName: string | null; lastName: string | null; username: string; email: string | null };
}

export interface CatalogProduct {
  key: string;
  name: string;
  imageUrl: string;
  productUrl: string;
}

export interface CatalogCategory {
  key: string;
  name: string;
  products: CatalogProduct[];
}

/** Full name, or the username when the client has no name. */
export const displayName = (u: { firstName?: string | null; lastName?: string | null; username: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username;
