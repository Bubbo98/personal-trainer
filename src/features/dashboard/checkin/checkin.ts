import { daysUntil, parseDate } from '../../../lib/format';
import type { CheckinStatus } from '../types';

// Stored in Italian and read by the trainer: only the labels are translated
export const MUSCULAR_ZONES = [
  'Collo', 'Spalla', 'Petto', 'Schiena alta', 'Lombare', 'Addome', 'Bicipite',
  'Tricipite', 'Avambraccio', 'Gluteo', 'Quadricipite', 'Femorali', 'Polpaccio', 'Tibiale',
] as const;
export const ARTICULAR_ZONES = ['Cervicale', 'Spalla', 'Gomito', 'Polso', 'Colonna', 'Anca', 'Ginocchio', 'Caviglia', 'Piede'] as const;

export type Zone = (typeof MUSCULAR_ZONES)[number] | (typeof ARTICULAR_ZONES)[number];

/** Weight typed with a comma or a dot, between 20 and 300 kg. */
export function parseWeight(value: string): number | null {
  const weight = Number(value.trim().replace(',', '.'));
  return value.trim() && Number.isFinite(weight) && weight >= 20 && weight <= 300 ? weight : null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the next check opens and how far along the wait is (too_soon* reasons only). */
export function nextCheckin(status: CheckinStatus, now = new Date()): { date: Date; daysLeft: number; progress: number } | null {
  const [from, waitDays] =
    status.reason === 'too_soon' ? [status.pdfUpdatedAt, 7] : status.reason === 'too_soon_since_last' ? [status.lastFeedbackAt, 14] : [null, 0];
  const start = parseDate(from);
  if (!start) return null;
  const date = new Date(start.getTime() + waitDays * DAY_MS);
  const daysLeft = Math.max(0, daysUntil(date, now) ?? 0);
  const progress = Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / (waitDays * DAY_MS)) * 100));
  return { date, daysLeft, progress };
}
