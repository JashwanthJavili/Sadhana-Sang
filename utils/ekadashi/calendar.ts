/**
 * Ekadashi observance calculator — Hari-bhakti-vilasa rules as implemented
 * in ISKCON's Gaurabda Calendar (GCal, "new" post-2006 fasting schema).
 *
 * The day-by-day logic mirrors GCal's open-source port
 * (github.com/gopa810/gaurabda-calendar, TCalendar.py: MahadvadasiCalc,
 * EkadasiCalc, IsMhd58, NextNewFullIsVriddhi, CalculateEParana):
 *
 *  • A day is reckoned at local sunrise (Sun's upper limb + refraction, −0.833°).
 *  • Arunodaya = 96 minutes (two muhurtas) before sunrise (HBV 12.316).
 *    Ekadashi touched by Dashami at arunodaya is rejected (viddha) and the
 *    fast moves to Dvadashi.
 *  • The eight Mahadvadashis: Unmilani, Vyanjuli, Trisprsa, Paksavardhini,
 *    and the nakshatra-based Jaya, Vijaya, Jayanti, Papanasini.
 *  • Parana: from sunrise (or after the first quarter of the running tithi —
 *    Hari-vasara, HBV 13.258), until the end of that tithi or one-third of
 *    daylight, whichever is earlier; nakshatra Mahadvadashis use the
 *    nakshatra's end.
 *
 * Results are CALCULATED. The UI labels them so until an admin records the
 * official entry for the city. Validated against official GCal 11 output for
 * six cities over 2026–2027 (see scripts/validate-ekadashi.mjs).
 */

import {
  MS_PER_DAY,
  findElongation,
  elongation,
  nakshatraAt,
  nakshatraEnd,
  moonLongitude,
  ayanamsa,
  lunarMonthAt,
  sunTimes,
  norm360,
} from './astronomy';
import { addDaysKey, localMidnight } from './timezone';

export interface EkadashiLocation {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lon: number;
  tz: string;
  /** true when coordinates came from the device rather than the city list */
  custom?: boolean;
}

export type ObservanceRule =
  | 'shuddha'
  | 'dashami_viddha'
  | 'kshaya'
  | 'unmilani'
  | 'vyanjuli'
  | 'trisprsa'
  | 'paksavardhini'
  | 'jaya'
  | 'vijaya'
  | 'jayanti'
  | 'papanasini';

const NAK_RULE_TEXT = (name: string, nak: string) =>
  `${name} Mahadvadashi: Shukla Dvadashi coincides with ${nak} nakshatra (present at two consecutive sunrises). The fast is kept on Dvadashi and parana follows the end of the nakshatra.`;

export const RULE_LABELS: Record<ObservanceRule, { title: string; mahadvadashi: boolean; explain: string }> = {
  shuddha: {
    title: 'Shuddha Ekadashi',
    mahadvadashi: false,
    explain: 'Ekadashi is present at sunrise and not touched by Dashami at arunodaya (96 minutes before sunrise), so the fast is kept on Ekadashi.',
  },
  dashami_viddha: {
    title: 'Dashami-viddha — fast on Dvadashi',
    mahadvadashi: false,
    explain: 'Dashami was still present at arunodaya on the Ekadashi day. Hari-bhakti-vilasa rejects such a "pierced" Ekadashi, so the fast is observed the next day.',
  },
  kshaya: {
    title: 'Kshaya Ekadashi — fast on Dvadashi',
    mahadvadashi: false,
    explain: 'The Ekadashi tithi began after one sunrise and ended before the next, so it never touched a sunrise. The fast is observed on the following day.',
  },
  unmilani: {
    title: 'Unmilani Mahadvadashi',
    mahadvadashi: true,
    explain: 'Ekadashi is present at two consecutive sunrises. The fast is kept on the second day.',
  },
  vyanjuli: {
    title: 'Vyanjuli Mahadvadashi',
    mahadvadashi: true,
    explain: 'Dvadashi is present at two consecutive sunrises. The fast is kept on the first Dvadashi day instead of Ekadashi.',
  },
  trisprsa: {
    title: 'Trisprsa Mahadvadashi',
    mahadvadashi: true,
    explain: 'Ekadashi, Dvadashi and Trayodashi all touch a single sunrise-to-sunrise day. That day is fasted.',
  },
  paksavardhini: {
    title: 'Paksavardhini Mahadvadashi',
    mahadvadashi: true,
    explain: 'The Purnima / Amavasya ending this fortnight touches two sunrises (the fortnight "increases"), so the fast is kept on Dvadashi.',
  },
  jaya: { title: 'Jaya Mahadvadashi', mahadvadashi: true, explain: NAK_RULE_TEXT('Jaya', 'Punarvasu') },
  vijaya: { title: 'Vijaya Mahadvadashi', mahadvadashi: true, explain: NAK_RULE_TEXT('Vijaya', 'Shravana') },
  jayanti: { title: 'Jayanti Mahadvadashi', mahadvadashi: true, explain: NAK_RULE_TEXT('Jayanti', 'Rohini') },
  papanasini: { title: 'Papanasini Mahadvadashi', mahadvadashi: true, explain: NAK_RULE_TEXT('Papanasini', 'Pushya') },
};

/**
 * ISKCON Ekadashi names by AMANTA lunar month (0 = Chaitra … 11 = Phalguna).
 * The Krishna-paksha of an amanta month is the first half of the next
 * purnimanta (Gaurabda) month, which is how ISKCON calendars group them.
 */
export const EKADASHI_BY_MONTH: { shukla: string; krishna: string }[] = [
  { shukla: 'kamada', krishna: 'varuthini' }, // Chaitra
  { shukla: 'mohini', krishna: 'apara' }, // Vaishakha
  { shukla: 'pandava-nirjala', krishna: 'yogini' }, // Jyeshtha
  { shukla: 'shayana', krishna: 'kamika' }, // Ashadha
  { shukla: 'pavitropana', krishna: 'annada' }, // Shravana
  { shukla: 'parshva', krishna: 'indira' }, // Bhadrapada
  { shukla: 'pashankusha', krishna: 'rama' }, // Ashvina
  { shukla: 'utthana', krishna: 'utpanna' }, // Kartika
  { shukla: 'mokshada', krishna: 'saphala' }, // Margashirsha
  { shukla: 'putrada-pausha', krishna: 'shat-tila' }, // Pausha
  { shukla: 'bhaimi', krishna: 'vijaya' }, // Magha
  { shukla: 'amalaki', krishna: 'papamochani' }, // Phalguna
];
export const ADHIKA_EKADASHI = { shukla: 'padmini', krishna: 'parama' };

export const AMANTA_MONTHS = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashvina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

export interface CalculatedEkadashi {
  /** stable key: `${slug}_${fastDate}` */
  key: string;
  slug: string;
  paksha: 'shukla' | 'krishna';
  lunarMonth: string;
  adhika: boolean;
  fastDate: string;
  rule: ObservanceRule;
  ekadashiStart: number;
  ekadashiEnd: number;
  dvadashiEnd: number;
  sunriseOnFast: number | null;
  paranaDate: string;
  paranaStart: number | null;
  /** null = "break fast after the start time" (no upper limit published) */
  paranaEnd: number | null;
  paranaStartNote: string;
  paranaEndNote: string;
  /** reasons an admin should double-check this entry */
  reviewFlags: string[];
}

/* ------------------------------------------------------------------------ */

const ARUNODAYA_MS = 96 * 60_000;

// tithi indices: 0 = Shukla Pratipat … 14 = Purnima, 15 = Krishna Pratipat … 29 = Amavasya
const isEkadashi = (t: number) => t === 10 || t === 25;
const isDvadashi = (t: number) => t === 11 || t === 26;
const isTrayodashi = (t: number) => t === 12 || t === 27;
const isLessThanEkadashi = (t: number) => t === 8 || t === 9 || t === 23 || t === 24;
const isFullNew = (t: number) => t === 14 || t === 29;
const SHUKLA_DVADASHI = 11;
const tithiOf = (ms: number) => Math.floor(elongation(ms) / 12);
const moonLongitudeSidereal = (ms: number) => moonLongitude(ms) - ayanamsa(ms);

type Mhd = 'none' | 'suddha' | 'unmilani' | 'unmilani_trisprsa' | 'trisprsa' | 'vyanjuli' | 'paksavardhini' | 'jaya' | 'vijaya' | 'jayanti' | 'papanasini';

interface Day {
  key: string;
  sunrise: number;
  sunset: number;
  tithi: number;
  tithiArunodaya: number;
  tithiSunset: number;
  nakshatra: number;
  mhd: Mhd;
  fast: boolean;
}

const NAK_MHD: Record<number, Mhd> = { 6: 'jaya', 3: 'jayanti', 7: 'papanasini', 21: 'vijaya' };

/** GCal IsMhd58 */
function nakshatraMhd(t: Day, u: Day): Mhd {
  if (t.nakshatra !== u.nakshatra) return 'none';
  if (t.tithi > 14) return 'none'; // Gaura (Shukla) paksha only
  if (t.tithi === t.tithiSunset) return NAK_MHD[t.nakshatra] || 'none';
  return t.nakshatra === 21 ? 'vijaya' : 'none';
}

const resultCache = new Map<string, CalculatedEkadashi[]>();

/**
 * All Ekadashi fasts whose fasting date lies within [fromKey, toKey]
 * (inclusive, civil dates at the location).
 */
export function calculateEkadashis(loc: EkadashiLocation, fromKey: string, toKey: string): CalculatedEkadashi[] {
  const cacheKey = `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)},${loc.tz},${fromKey},${toKey}`;
  const hit = resultCache.get(cacheKey);
  if (hit) return hit;

  // Build the day table with a margin (GCal uses 8 days look-ahead for Paksavardhini)
  const MARGIN = 10;
  const days: Day[] = [];
  for (let key = addDaysKey(fromKey, -MARGIN); key <= addDaysKey(toKey, MARGIN); key = addDaysKey(key, 1)) {
    const { sunrise, sunset } = sunTimes(localMidnight(key, loc.tz), loc.lat, loc.lon);
    if (sunrise === null || sunset === null) {
      // polar day/night — no Vaishnava day can be reckoned; skip the location
      resultCache.set(cacheKey, []);
      return [];
    }
    days.push({
      key,
      sunrise,
      sunset,
      tithi: tithiOf(sunrise),
      tithiArunodaya: tithiOf(sunrise - ARUNODAYA_MS),
      tithiSunset: tithiOf(sunset),
      nakshatra: nakshatraAt(sunrise),
      mhd: 'none',
      fast: false,
    });
  }

  // 1. MahadvadasiCalc
  for (let i = 1; i < days.length - 1; i++) {
    const s = days[i - 1], t = days[i], u = days[i + 1];
    if (isDvadashi(s.tithi)) continue;
    const m58 = nakshatraMhd(t, u);
    let mhd: Mhd = 'none';
    if (t.tithi === SHUKLA_DVADASHI && t.tithiSunset === SHUKLA_DVADASHI && m58 !== 'none') mhd = m58;
    else if (isDvadashi(t.tithi)) {
      if (isDvadashi(u.tithi) && isEkadashi(s.tithi) && isEkadashi(s.tithiArunodaya)) mhd = 'vyanjuli';
      else if (nextNewFullIsVriddhi(days, i)) mhd = 'paksavardhini';
      else if (isLessThanEkadashi(s.tithiArunodaya)) mhd = 'suddha';
    }
    if (mhd !== 'none') {
      t.mhd = mhd;
      t.fast = true;
    }
  }

  // 2. EkadasiCalc
  for (let i = 1; i < days.length - 1; i++) {
    const s = days[i - 1], t = days[i], u = days[i + 1];
    if (!isEkadashi(t.tithi)) continue;
    if (isLessThanEkadashi(t.tithiArunodaya)) {
      t.mhd = 'none';
      t.fast = false;
    } else if (isEkadashi(s.tithi) && isEkadashi(s.tithiArunodaya)) {
      t.mhd = isTrayodashi(u.tithi) ? 'unmilani_trisprsa' : 'unmilani';
      t.fast = true;
    } else if (isTrayodashi(u.tithi)) {
      t.mhd = 'trisprsa';
      t.fast = true;
    } else if (isEkadashi(u.tithi) || u.mhd !== 'none') {
      t.mhd = 'none';
      t.fast = false;
    } else {
      t.mhd = 'suddha';
      t.fast = true;
    }
  }

  // 3. Assemble observances + parana
  const out: CalculatedEkadashi[] = [];
  for (let i = 1; i < days.length - 1; i++) {
    const t = days[i];
    if (!t.fast || t.key < fromKey || t.key > toKey) continue;
    const s = days[i - 1];
    const p = days[i + 1];

    const shukla = t.tithi < 15;
    const paksha: 'shukla' | 'krishna' = shukla ? 'shukla' : 'krishna';
    const k = shukla ? 10 : 25;

    // Ekadashi tithi of this paksha (search from the fast day's sunrise)
    const ekStart = findElongation(k * 12, t.sunrise - (isEkadashi(t.tithi) ? 0.5 : 1.3) * MS_PER_DAY);
    const ekEnd = findElongation(norm360((k + 1) * 12), ekStart + MS_PER_DAY);
    const dvEnd = findElongation(norm360((k + 2) * 12), ekEnd + MS_PER_DAY);

    // Rule label
    let rule: ObservanceRule;
    switch (t.mhd) {
      case 'suddha':
        if (isEkadashi(t.tithi)) rule = 'shuddha';
        else rule = isEkadashi(s.tithi) ? 'dashami_viddha' : 'kshaya';
        break;
      case 'unmilani':
        rule = 'unmilani';
        break;
      case 'unmilani_trisprsa':
      case 'trisprsa':
        rule = 'trisprsa';
        break;
      default:
        rule = t.mhd as ObservanceRule;
    }

    // Name from the fast day's lunar month and paksha
    const month = lunarMonthAt(t.sunrise);
    const slug = month.adhika ? ADHIKA_EKADASHI[paksha] : EKADASHI_BY_MONTH[month.index][paksha];

    // CalculateEParana(s = fast day, t = parana day)
    const third = p.sunrise + (p.sunset - p.sunrise) / 3;
    const pt = tithiOf(p.sunrise);
    const tStart = findElongation(pt * 12, p.sunrise - 0.5 * MS_PER_DAY);
    const tEnd = findElongation(norm360((pt + 1) * 12), p.sunrise + 0.5 * MS_PER_DAY);
    const quarter = tStart + (tEnd - tStart) / 4;
    const tithiName = isDvadashi(pt) ? 'Dvadashi' : isTrayodashi(pt) ? 'Trayodashi' : 'the tithi';

    let begin = p.sunrise;
    let end: number | null = third;
    let bNote = 'Sunrise';
    let eNote = 'One-third of daylight';
    const endOfTithi = () => {
      if (tEnd < third) {
        end = tEnd;
        eNote = `End of ${tithiName}`;
      }
    };

    if (t.mhd === 'unmilani' || t.mhd === 'vyanjuli') {
      endOfTithi();
    } else if (t.mhd === 'trisprsa' || t.mhd === 'unmilani_trisprsa') {
      // sunrise → one-third of daylight
    } else if (t.mhd === 'jayanti' || t.mhd === 'vijaya' || t.mhd === 'jaya' || t.mhd === 'papanasini') {
      const nEnd = nakshatraEnd(p.sunrise);
      const softType = t.mhd === 'jayanti' || t.mhd === 'vijaya';
      if (isDvadashi(pt)) {
        if (nEnd < tEnd) {
          begin = nEnd;
          bNote = 'End of nakshatra';
          if (nEnd < third) endOfTithi();
          else {
            end = tEnd;
            eNote = `End of ${tithiName}`;
          }
        } else endOfTithi();
      } else if (softType) {
        if (nEnd < third) {
          end = nEnd;
          eNote = 'End of nakshatra';
        }
      } else {
        begin = nEnd;
        bNote = 'End of nakshatra';
        end = nEnd < third ? third : null;
      }
    } else {
      endOfTithi();
      if (quarter > p.sunrise) {
        begin = quarter;
        bNote = `After first quarter of ${tithiName} (Hari-vasara)`;
      }
      if (isDvadashi(t.tithi)) {
        begin = p.sunrise;
        bNote = 'Sunrise';
      }
      if (end !== null && begin > end) {
        end = null;
        eNote = 'No end time — break fast after the start time';
      }
    }

    const flags: string[] = [];
    if (rule !== 'shuddha') flags.push(`${RULE_LABELS[rule].title}: please confirm the fasting day with your local ISKCON temple calendar.`);
    // Borderline cases: a few minutes of astronomical uncertainty could change the day
    const near: string[] = [];
    for (const d of [s, t, p, days[i + 2] || p]) {
      if (nearTithiBoundary(d.sunrise)) near.push(`a tithi changes within minutes of sunrise on ${d.key}`);
      if (nearTithiBoundary(d.sunrise - ARUNODAYA_MS)) near.push(`a tithi changes within minutes of arunodaya on ${d.key}`);
      if (shukla && nearNakshatraBoundary(d.sunrise)) near.push(`the nakshatra changes within minutes of sunrise on ${d.key}`);
    }
    if (near.length) flags.push(`Borderline timing — ${near.join('; ')}. The fasting day may differ from official calendars; please verify.`);

    out.push({
      key: `${slug}_${t.key}`,
      slug,
      paksha,
      lunarMonth: (month.adhika ? 'Adhika ' : '') + AMANTA_MONTHS[month.index],
      adhika: month.adhika,
      fastDate: t.key,
      rule,
      ekadashiStart: ekStart,
      ekadashiEnd: ekEnd,
      dvadashiEnd: dvEnd,
      sunriseOnFast: t.sunrise,
      paranaDate: p.key,
      paranaStart: begin,
      paranaEnd: end,
      paranaStartNote: bNote,
      paranaEndNote: eNote,
      reviewFlags: flags,
    });
  }

  // GCal can, in rare overlaps, mark two days in one fortnight — keep the first
  const deduped = out.filter((o, idx) => !out.some((x, j) => j < idx && x.paksha === o.paksha && Math.abs(Date.parse(x.fastDate) - Date.parse(o.fastDate)) <= 3 * MS_PER_DAY));
  resultCache.set(cacheKey, deduped);
  return deduped;
}

/** true when a tithi boundary is within ~6 minutes of the instant */
function nearTithiBoundary(ms: number): boolean {
  const f = elongation(ms) % 12;
  return Math.min(f, 12 - f) < 0.05;
}

/** true when a nakshatra boundary is within ~6 minutes of the instant */
function nearNakshatraBoundary(ms: number): boolean {
  const span = 360 / 27;
  const f = norm360(moonLongitudeSidereal(ms)) % span;
  return Math.min(f, span - f) < 0.055;
}

/** GCal NextNewFullIsVriddhi: Purnima/Amavasya at two consecutive sunrises within the next 8 days */
function nextNewFullIsVriddhi(days: Day[], index: number): boolean {
  let prev = 100;
  for (let i = 0; i < 8 && index + i < days.length; i++) {
    const tt = days[index + i].tithi;
    if (tt === prev && isFullNew(tt)) return true;
    prev = tt;
  }
  return false;
}
