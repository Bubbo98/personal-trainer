import { parseDate, toDateKey } from '../../../../lib/format';

/** A date input value (YYYY-MM-DD) as the ISO instant of local midnight, or null. */
export const localMidnightIso = (value: string): string | null => (value ? new Date(`${value}T00:00:00`).toISOString() : null);

/** YYYY-MM-DD of a stored date, for a date input. */
export const toInputDate = (value: string | null): string => {
  const date = parseDate(value);
  return date ? toDateKey(date) : '';
};
