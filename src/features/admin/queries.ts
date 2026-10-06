import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import type {
  AdminReview,
  AdminUser,
  AdminVideo,
  AdminWeightLog,
  BodyReportSummary,
  Checkin,
  CheckinPage,
  CheckinUserSummary,
  PlanPdf,
  ServerExercise,
  Trainer,
  TrainingDay,
  VideoPage,
} from './types';
import type { LinkDay } from './users/detail/linker';

/** Query keys of the admin area: invalidations go through these. */
export const adminKeys = {
  all: ['admin'] as const,
  trainers: ['admin', 'trainers'] as const,
  users: ['admin', 'users'] as const,
  unread: (trainerId: number) => ['admin', 'checkins', 'unread', trainerId] as const,
  checkins: ['admin', 'checkins'] as const,
  checkinPage: (params: Record<string, string | number>) => ['admin', 'checkins', 'page', params] as const,
  checkinUsers: (params: Record<string, string | number>) => ['admin', 'checkins', 'users', params] as const,
  userCheckins: (userId: number) => ['admin', 'checkins', 'user', userId] as const,
  library: ['admin', 'videos', 'library'] as const,
  videoPage: (params: Record<string, string | number>) => ['admin', 'videos', 'page', params] as const,
  videos: ['admin', 'videos'] as const,
  user: (userId: number) => ['admin', 'user', userId] as const,
  userVideos: (userId: number) => ['admin', 'user', userId, 'videos'] as const,
  pdf: (userId: number) => ['admin', 'user', userId, 'pdf'] as const,
  plan: (userId: number) => ['admin', 'user', userId, 'plan'] as const,
  logs: (userId: number) => ['admin', 'user', userId, 'logs'] as const,
  links: (userId: number) => ['admin', 'user', userId, 'links'] as const,
  days: (userId: number) => ['admin', 'user', userId, 'days'] as const,
  bodyReports: (userId: number) => ['admin', 'user', userId, 'body-reports'] as const,
  reviews: ['admin', 'reviews'] as const,
  catalog: ['admin', 'catalog'] as const,
};

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== false) search.set(k, String(v));
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const useTrainers = () =>
  useQuery({
    queryKey: adminKeys.trainers,
    queryFn: ({ signal }) => adminApi.get<{ trainers: Trainer[] }>('/admin/trainers', signal).then((d) => d.trainers),
    staleTime: Infinity,
  });

export const useUsers = () =>
  useQuery({
    queryKey: adminKeys.users,
    queryFn: ({ signal }) => adminApi.get<{ users: AdminUser[] }>('/admin/users', signal).then((d) => d.users),
  });

export const useUnreadCheckins = (trainerId: number) =>
  useQuery({
    queryKey: adminKeys.unread(trainerId),
    queryFn: ({ signal }) =>
      adminApi.get<{ unreadCount: number }>(`/feedback/admin/unread-count${query({ trainerId })}`, signal).then((d) => d.unreadCount),
  });

/** The whole video library (pickers, technique lists…), shared by every editor. */
export const useLibrary = () =>
  useQuery({
    queryKey: adminKeys.library,
    queryFn: ({ signal }) => adminApi.get<VideoPage>('/admin/videos', signal).then((d) => d.videos),
    staleTime: 5 * 60_000,
  });

export interface VideoFilters {
  page: number;
  limit: number;
  search: string;
  muscleGroup: string;
  missingThumbnail: boolean;
}

export const useVideoPage = (filters: VideoFilters) =>
  useQuery({
    queryKey: adminKeys.videoPage({ ...filters, missingThumbnail: Number(filters.missingThumbnail) }),
    queryFn: ({ signal }) => adminApi.get<VideoPage>(`/admin/videos${query({ ...filters })}`, signal),
    placeholderData: keepPreviousData,
  });

export const useUserVideos = (userId: number) =>
  useQuery({
    queryKey: adminKeys.userVideos(userId),
    queryFn: ({ signal }) => adminApi.get<{ videos: AdminVideo[] }>(`/admin/users/${userId}/videos`, signal).then((d) => d.videos),
  });

export const usePlanPdf = (userId: number) =>
  useQuery({
    queryKey: adminKeys.pdf(userId),
    queryFn: ({ signal }) => adminApi.get<PlanPdf | null>(`/pdf/admin/user/${userId}`, signal),
  });

export const usePlanExercises = (userId: number) =>
  useQuery({
    queryKey: adminKeys.plan(userId),
    queryFn: ({ signal }) =>
      adminApi.get<{ exercises: ServerExercise[] }>(`/workout/admin/plan/${userId}`, signal).then((d) => d.exercises),
  });

export const useWeightLogs = (userId: number) =>
  useQuery({
    queryKey: adminKeys.logs(userId),
    queryFn: ({ signal }) => adminApi.get<{ logs: AdminWeightLog[] }>(`/workout/admin/logs/${userId}`, signal).then((d) => d.logs),
  });

export const useLinks = (userId: number) =>
  useQuery({
    queryKey: adminKeys.links(userId),
    queryFn: ({ signal }) => adminApi.get<{ days: LinkDay[] }>(`/workout/admin/links/${userId}`, signal).then((d) => d.days),
  });

export const useTrainingDays = (userId: number) =>
  useQuery({
    queryKey: adminKeys.days(userId),
    queryFn: ({ signal }) =>
      adminApi
        .get<{ trainingDays: TrainingDay[] }>(`/training-days/users/${userId}/training-days`, signal)
        .then((d) => d.trainingDays),
  });

export const useBodyReports = (userId: number) =>
  useQuery({
    queryKey: adminKeys.bodyReports(userId),
    queryFn: ({ signal }) => adminApi.get<BodyReportSummary[]>(`/body-composition/admin/${userId}`, signal),
  });

export interface CheckinFilters {
  trainerId: number;
  page: number;
  search: string;
  discomfort: 'all' | 'none' | 'has_issues';
}

const checkinParams = (f: CheckinFilters, limit: number) => ({
  trainerId: f.trainerId,
  page: f.page,
  limit,
  search: f.search,
  discomfort: f.discomfort === 'all' ? '' : f.discomfort,
});

export const CHECKINS_PER_PAGE = 20;
export const CHECKIN_USERS_PER_PAGE = 15;

export const useCheckinPage = (filters: CheckinFilters, enabled: boolean) =>
  useQuery({
    queryKey: adminKeys.checkinPage(checkinParams(filters, CHECKINS_PER_PAGE)),
    queryFn: ({ signal }) => adminApi.get<CheckinPage>(`/feedback/admin/all${query(checkinParams(filters, CHECKINS_PER_PAGE))}`, signal),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCheckinUsers = (filters: CheckinFilters, enabled: boolean) =>
  useQuery({
    queryKey: adminKeys.checkinUsers(checkinParams(filters, CHECKIN_USERS_PER_PAGE)),
    queryFn: ({ signal }) =>
      adminApi.get<{ users: CheckinUserSummary[]; total: number; totalPages: number }>(
        `/feedback/admin/users-summary${query(checkinParams(filters, CHECKIN_USERS_PER_PAGE))}`,
        signal,
      ),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useUserCheckins = (userId: number, enabled = true) =>
  useQuery({
    queryKey: adminKeys.userCheckins(userId),
    queryFn: ({ signal }) => adminApi.get<{ feedbacks: Checkin[] }>(`/feedback/admin/user/${userId}`, signal).then((d) => d.feedbacks),
    enabled,
  });

export const useReviews = () =>
  useQuery({
    queryKey: adminKeys.reviews,
    queryFn: ({ signal }) => adminApi.get<{ reviews: AdminReview[] }>('/admin/reviews', signal).then((d) => d.reviews),
  });
