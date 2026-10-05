import i18n from '../i18n';

/**
 * Dates, durations and sizes in the user's language.
 *
 * The backend sends SQLite timestamps ("2026-03-10 12:54:04", UTC without a
 * zone), plain dates ("2026-09-21", calendar days) and sometimes ISO strings.
 */

const SQL_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;
const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const plain = value.match(PLAIN_DATE);
  // A calendar day: midnight local time, so it never shows as the day before
  const date = plain
    ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
    : new Date(SQL_TIMESTAMP.test(value) ? value.replace(SQL_TIMESTAMP, '$1T$2Z') : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const locale = () => (i18n.language?.startsWith('en') ? 'en-GB' : 'it-IT');

type DateStyle = 'short' | 'medium' | 'long' | 'full';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'numeric', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
};

/** "5 ott 2026" (medium), "5 ottobre 2026" (long)… — '' for a missing/invalid date. */
export function formatDate(value: string | Date | null | undefined, style: DateStyle = 'medium'): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString(locale(), DATE_OPTIONS[style]) : '';
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date
    ? date.toLocaleString(locale(), { ...DATE_OPTIONS.medium, hour: '2-digit', minute: '2-digit' })
    : '';
}

/** 75 → "1:15" */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of a date. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calendar days from today to a date: 0 = today, 1 = tomorrow, -2 = two days ago.
 * Null for a missing date.
 */
export function daysUntil(value: string | Date | null | undefined, now: Date = new Date()): number | null {
  const date = parseDate(value);
  if (!date) return null;
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

/** YYYY-MM-DD of a date in local time (toISOString would shift it to UTC). */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Monday of the week containing `now`, as YYYY-MM-DD: the key of the weekly weight logs. */
export function weekStart(now: Date = new Date()): string {
  const monday = startOfDay(now);
  const day = monday.getDay(); // 0 = Sunday
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateKey(monday);
}
