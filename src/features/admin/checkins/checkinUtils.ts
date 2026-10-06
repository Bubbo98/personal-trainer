import { parseDate } from '../../../lib/format';
import type { Checkin } from '../types';

/**
 * Ids of each client's first check-in for every plan version (same
 * pdf_change_date): earliest feedback date, then earliest submission.
 */
export function firstOfPlanIds(checkins: Checkin[]): Set<number> {
  const first = new Map<string, Checkin>();
  const time = (value: string) => parseDate(value)?.getTime() ?? 0;
  for (const checkin of checkins) {
    if (!checkin.pdf_change_date) continue;
    const key = `${checkin.user_id}|${checkin.pdf_change_date}`;
    const current = first.get(key);
    const earlier =
      !current ||
      time(checkin.feedback_date) < time(current.feedback_date) ||
      (time(checkin.feedback_date) === time(current.feedback_date) && time(checkin.created_at) < time(current.created_at));
    if (earlier) first.set(key, checkin);
  }
  return new Set([...first.values()].map((c) => c.id));
}

/** Zones are stored as a JSON array of Italian names. */
export function parseZones(value: string | null): string[] {
  if (!value) return [];
  try {
    const zones = JSON.parse(value);
    return Array.isArray(zones) ? zones.map(String) : [];
  } catch {
    return [];
  }
}
