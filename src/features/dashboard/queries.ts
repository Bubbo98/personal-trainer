import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '../../lib/api';
import type {
  BodyReport,
  Checkin,
  CheckinStatus,
  CheckinSubmission,
  Exercise,
  ExerciseLog,
  PlanInfo,
  ProductCategory,
  Review,
  ReviewInput,
  SeenNotification,
  TrainingDay,
  Video,
} from './types';

/** Query keys of the client area: one place, so invalidations can't drift. */
export const keys = {
  videos: ['client', 'videos'] as const,
  trainingDays: ['client', 'training-days'] as const,
  plan: ['client', 'plan-pdf'] as const,
  exercises: ['client', 'workout', 'exercises'] as const,
  logs: ['client', 'workout', 'logs'] as const,
  checkinStatus: ['client', 'checkin', 'status'] as const,
  checkins: ['client', 'checkin', 'list'] as const,
  seenNotifications: ['client', 'checkin', 'seen'] as const,
  bodyReports: ['client', 'body-reports'] as const,
  products: ['client', 'products'] as const,
  review: ['client', 'review'] as const,
};

// Signed video URLs last one hour: refresh the lists before they expire
const SIGNED_URL_OPTIONS = {
  staleTime: 30 * 60_000,
  refetchInterval: 45 * 60_000,
  refetchOnWindowFocus: true,
} as const;

export const useVideos = () =>
  useQuery({
    queryKey: keys.videos,
    queryFn: ({ signal }) => clientApi.get<{ videos: Video[] }>('/videos', signal).then((d) => d.videos),
    ...SIGNED_URL_OPTIONS,
  });

export const useTrainingDays = () =>
  useQuery({
    queryKey: keys.trainingDays,
    queryFn: ({ signal }) =>
      clientApi.get<{ trainingDays: TrainingDay[] }>('/videos/training-days', signal).then((d) => d.trainingDays),
    ...SIGNED_URL_OPTIONS,
  });

export const usePlanInfo = () =>
  useQuery({
    queryKey: keys.plan,
    queryFn: ({ signal }) => clientApi.get<PlanInfo | null>('/pdf/my-pdf', signal),
  });

export const useExercises = () =>
  useQuery({
    queryKey: keys.exercises,
    queryFn: ({ signal }) => clientApi.get<{ exercises: Exercise[] }>('/workout/plan', signal).then((d) => d.exercises),
  });

/** Every weight log of the client, newest week first. */
export const useWorkoutLogs = () =>
  useQuery({
    queryKey: keys.logs,
    queryFn: ({ signal }) => clientApi.get<{ logs: ExerciseLog[] }>('/workout/logs', signal).then((d) => d.logs),
  });

export interface LogInput {
  exerciseId: number;
  weekStart: string;
  weight: string;
  repsDone: string;
}

/** Saves one exercise's log of the week and mirrors it in the cached logs. */
export function useSaveLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (log: LogInput) =>
      clientApi.post('/workout/logs', {
        exerciseId: log.exerciseId,
        weekStart: log.weekStart,
        weight: log.weight || null,
        repsDone: log.repsDone || null,
      }),
    onSuccess: (_, log) => {
      queryClient.setQueryData<ExerciseLog[]>(keys.logs, (logs = []) => {
        const index = logs.findIndex((l) => l.exercise_id === log.exerciseId && l.week_start === log.weekStart);
        const saved = { weight: log.weight || null, reps_done: log.repsDone || null };
        if (index >= 0) return logs.map((l, i) => (i === index ? { ...l, ...saved } : l));
        const created: ExerciseLog = {
          id: -log.exerciseId, // replaced by the real row on the next reload
          exercise_id: log.exerciseId,
          week_start: log.weekStart,
          sets_done: null,
          notes: null,
          exercise_name: null,
          day_number_snapshot: null,
          day_name_snapshot: null,
          ...saved,
        };
        return [created, ...logs];
      });
    },
  });
}

export const useCheckinStatus = () =>
  useQuery({
    queryKey: keys.checkinStatus,
    queryFn: ({ signal }) => clientApi.get<CheckinStatus>('/feedback/should-show', signal),
  });

export const useCheckins = () =>
  useQuery({
    queryKey: keys.checkins,
    queryFn: ({ signal }) => clientApi.get<{ feedbacks: Checkin[] }>('/feedback/my-feedbacks', signal).then((d) => d.feedbacks),
  });

export function useSubmitCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkin: CheckinSubmission) => clientApi.post('/feedback', checkin),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.checkinStatus }),
        queryClient.invalidateQueries({ queryKey: keys.checkins }),
      ]),
  });
}

/** "Your trainer read your check-in" notices; shown once, then dismissed on the server. */
export const useSeenNotifications = () =>
  useQuery({
    queryKey: keys.seenNotifications,
    queryFn: ({ signal }) =>
      clientApi
        .get<{ notifications: SeenNotification[] }>('/feedback/trainer-seen-notification', signal)
        .then((d) => d.notifications),
    staleTime: Infinity,
  });

export const dismissSeenNotifications = () => clientApi.post('/feedback/dismiss-trainer-seen');

export const useBodyReports = () =>
  useQuery({
    queryKey: keys.bodyReports,
    queryFn: ({ signal }) => clientApi.get<BodyReport[]>('/body-composition/my-reports', signal),
  });

export const useProducts = () =>
  useQuery({
    queryKey: keys.products,
    queryFn: ({ signal }) =>
      clientApi.get<{ categories: ProductCategory[] }>('/integration/products', signal).then((d) => d.categories),
  });

export const useMyReview = () =>
  useQuery({
    queryKey: keys.review,
    queryFn: ({ signal }) => clientApi.get<{ review: Review | null }>('/reviews/my', signal).then((d) => d.review ?? null),
  });

export function useSaveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (review: ReviewInput) => clientApi.post('/reviews', review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.review }),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientApi.delete('/reviews/my'),
    onSuccess: () => queryClient.setQueryData(keys.review, null),
  });
}
