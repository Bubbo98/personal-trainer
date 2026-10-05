import i18n from '../i18n';
import { daysUntil, formatDate, formatDuration, formatFileSize, parseDate, toDateKey, weekStart } from './format';

describe('parseDate', () => {
  it('reads SQLite timestamps as UTC', () => {
    expect(parseDate('2026-03-10 12:54:04')?.toISOString()).toBe('2026-03-10T12:54:04.000Z');
  });

  it('reads plain dates as local calendar days', () => {
    const date = parseDate('2026-09-21')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 21, 0]);
  });

  it('accepts ISO strings and Date objects', () => {
    expect(parseDate('2026-01-02T03:04:05.000Z')?.toISOString()).toBe('2026-01-02T03:04:05.000Z');
    const now = new Date();
    expect(parseDate(now)).toBe(now);
  });

  it('returns null for missing or invalid values', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(new Date('nope'))).toBeNull();
  });
});

describe('formatDate', () => {
  afterEach(() => i18n.changeLanguage('it'));

  it('follows the active language', async () => {
    expect(formatDate('2026-10-05', 'long')).toBe('5 ottobre 2026');
    await i18n.changeLanguage('en');
    expect(formatDate('2026-10-05', 'long')).toBe('5 October 2026');
  });

  it('is empty for a missing date', () => {
    expect(formatDate(null)).toBe('');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [75, '1:15'],
    [3600, '60:00'],
    [null, '0:00'],
    [-3, '0:00'],
  ])('%s s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [2048, '2.0 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
  ])('%s → %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('daysUntil', () => {
  const now = new Date(2026, 9, 5, 23, 30); // Monday 5 Oct 2026, late evening

  it('counts calendar days, not 24h periods', () => {
    expect(daysUntil('2026-10-05', now)).toBe(0);
    expect(daysUntil('2026-10-06', now)).toBe(1);
    expect(daysUntil('2026-10-03', now)).toBe(-2);
  });

  it('is null without a date', () => {
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe('weekStart', () => {
  it.each([
    ['Monday', new Date(2026, 9, 5, 0, 30), '2026-10-05'],
    ['Wednesday', new Date(2026, 9, 7, 12), '2026-10-05'],
    ['Sunday night', new Date(2026, 9, 11, 23, 59), '2026-10-05'],
    ['next Monday', new Date(2026, 9, 12, 0, 1), '2026-10-12'],
    ['across a month', new Date(2026, 10, 1, 10), '2026-10-26'],
    ['across a year', new Date(2027, 0, 2, 10), '2026-12-28'],
  ])('%s', (_, now, expected) => {
    expect(weekStart(now)).toBe(expected);
  });
});

describe('toDateKey', () => {
  it('uses local time', () => {
    expect(toDateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});
