import { parseDate } from '../../../lib/format';
import type { TrialSession } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days left until expiresAt, counted now (the session may be hours old). */
export const trialDaysLeft = (trial: TrialSession, now = Date.now()) => {
  const end = parseDate(trial.expiresAt);
  return end ? Math.max(0, Math.ceil((end.getTime() - now) / DAY_MS)) : trial.daysLeft;
};
