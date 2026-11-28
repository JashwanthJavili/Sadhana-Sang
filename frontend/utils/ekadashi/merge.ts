import type { CalculatedEkadashi, EkadashiLocation } from './calendar';
import type { DisplayEkadashi, ObservanceRecord } from './types';
import { formatTime, addDaysKey } from './timezone';

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86_400_000);

/** "HH:MM" of an instant in the zone (24h) */
const hhmm = (ms: number | null, tz: string) => (ms === null ? '' : formatTime(ms, tz, false).padStart(5, '0'));

const minutes = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Combine calculated observances with official records for a preset city.
 * An official record always wins; the calculation is kept alongside so the
 * admin can see any discrepancy.
 */
export function mergeObservances(
  calc: CalculatedEkadashi[],
  records: ObservanceRecord[],
  loc: EkadashiLocation,
  fromKey: string,
  toKey: string
): DisplayEkadashi[] {
  const used = new Set<ObservanceRecord>();
  const rows: DisplayEkadashi[] = calc.map((c) => {
    const rec = records.find((r) => !used.has(r) && r.slug === c.slug && Math.abs(dayDiff(r.fastDate, c.fastDate)) <= 3);
    if (!rec) {
      return { key: c.key, slug: c.slug, fastDate: c.fastDate, paranaDate: c.paranaDate, status: 'calculated', calc: c, discrepancies: [] };
    }
    used.add(rec);
    const d: string[] = [];
    if (rec.fastDate !== c.fastDate) d.push(`Calculated fasting date ${c.fastDate} differs from official ${rec.fastDate}.`);
    if (rec.fastDate === c.fastDate) {
      if (rec.paranaStart && c.paranaStart !== null && Math.abs(minutes(rec.paranaStart) - minutes(hhmm(c.paranaStart, loc.tz))) > 5)
        d.push(`Parana start: calculated ${hhmm(c.paranaStart, loc.tz)} vs official ${rec.paranaStart}.`);
      if (rec.paranaEnd && c.paranaEnd !== null && Math.abs(minutes(rec.paranaEnd) - minutes(hhmm(c.paranaEnd, loc.tz))) > 5)
        d.push(`Parana end: calculated ${hhmm(c.paranaEnd, loc.tz)} vs official ${rec.paranaEnd}.`);
    }
    return {
      key: `${rec.slug}_${rec.fastDate}`,
      slug: rec.slug,
      fastDate: rec.fastDate,
      paranaDate: rec.paranaDate || addDaysKey(rec.fastDate, 1),
      status: rec.status,
      calc: c,
      record: rec,
      discrepancies: d,
    };
  });

  // Official records with no matching calculation (e.g. outside the engine's understanding)
  for (const r of records) {
    if (used.has(r) || r.fastDate < fromKey || r.fastDate > toKey) continue;
    rows.push({
      key: `${r.slug}_${r.fastDate}`,
      slug: r.slug,
      fastDate: r.fastDate,
      paranaDate: r.paranaDate || addDaysKey(r.fastDate, 1),
      status: r.status,
      record: r,
      discrepancies: ['No matching calculated Ekadashi near this date.'],
    });
  }
  return rows.sort((a, b) => a.fastDate.localeCompare(b.fastDate));
}

/** Parana window text for a row, preferring official data. `end` null = "after start". */
export function paranaLabel(row: DisplayEkadashi, tz: string): { start: string; end: string | null; note: string } | null {
  if (row.record) {
    if (!row.record.paranaStart && !row.record.paranaEnd) return null; // official record without times — never substitute calculated ones
    return {
      start: row.record.paranaStart ? to12h(row.record.paranaStart) : 'Sunrise',
      end: row.record.paranaEnd ? to12h(row.record.paranaEnd) : null,
      note: row.record.paranaNote || '',
    };
  }
  const c = row.calc;
  if (!c || c.paranaStart === null) return null;
  const notes = [`from ${c.paranaStartNote.toLowerCase()}`, c.paranaEnd !== null ? `until ${c.paranaEndNote.toLowerCase()}` : ''].filter(Boolean).join(', ');
  return { start: formatTime(c.paranaStart, tz), end: c.paranaEnd !== null ? formatTime(c.paranaEnd, tz) : null, note: notes };
}

export function to12h(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
