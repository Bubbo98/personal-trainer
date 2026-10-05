/** 'warn' = something to do soon, 'alert' = needs attention now. */
export type Badge = 'warn' | 'alert' | null;

/** The most urgent of several badges. */
export const worstBadge = (...badges: Badge[]): Badge =>
  badges.includes('alert') ? 'alert' : badges.includes('warn') ? 'warn' : null;
