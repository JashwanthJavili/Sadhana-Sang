/** IANA time-zone helpers built on Intl — no external libraries. */

const partsCache = new Map<string, Intl.DateTimeFormat>();

const fmtFor = (tz: string) => {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(tz, f);
  }
  return f;
};

/** Wall-clock fields of an instant in a zone */
export function zonedParts(ms: number, tz: string) {
  const out: Record<string, number> = {};
  for (const p of fmtFor(tz).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute, second: out.second };
}

/** Offset of the zone from UTC at that instant, in minutes */
export function tzOffsetMinutes(ms: number, tz: string): number {
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** UTC instant of 00:00 local time on the given civil date (YYYY-MM-DD) */
export function localMidnight(dateKey: string, tz: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - tzOffsetMinutes(guess, tz) * 60000;
  // second pass handles DST transitions near midnight
  t = guess - tzOffsetMinutes(t, tz) * 60000;
  return t;
}

/** Civil date key (YYYY-MM-DD) of an instant in the zone */
export function dateKeyInTz(ms: number, tz: string): string {
  const p = zonedParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** "06:42" style 24h time, or "6:42 AM" when `h12` */
export function formatTime(ms: number, tz: string, h12 = true): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: h12,
  }).format(new Date(ms));
}

/** "Wed, 25 Nov" style date (or long form) of an instant in the zone */
export function formatDateInTz(ms: number, tz: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }).format(new Date(ms));
}

/** Format a civil date key without any zone shifting */
export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Short zone label, e.g. "IST" / "GMT+5:30" */
export function tzAbbrev(ms: number, tz: string): string {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(ms));
    return p.find((x) => x.type === 'timeZoneName')?.value || tz;
  } catch {
    return tz;
  }
}

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};
