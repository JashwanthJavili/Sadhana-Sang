/**
 * Local-calendar date helpers.
 *
 * `new Date().toISOString()` is UTC — in India that is 5½ hours behind, so
 * anything logged before 5:30 AM (prime time for japa) would land on the
 * previous day. Always use these helpers for "which day is it?" logic.
 */

/** YYYY-MM-DD for the given date in the user's local timezone */
export const localDateKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Parse a YYYY-MM-DD key as a local date (midnight) */
export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Date key `n` days before/after the given one */
export const shiftDateKey = (key: string, days: number): string => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
};

/** Whole days from today until the given key (0 = today, negative = past) */
export const daysUntil = (key: string): number => {
  const today = parseDateKey(localDateKey());
  return Math.round((parseDateKey(key).getTime() - today.getTime()) / 86_400_000);
};
