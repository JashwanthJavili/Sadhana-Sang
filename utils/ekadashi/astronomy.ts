/**
 * Lightweight astronomy for the Vaishnava (Hari-bhakti-vilasa) calendar.
 *
 * No external dependencies. Algorithms follow Jean Meeus, "Astronomical
 * Algorithms" (2nd ed.):
 *   - Sun: ch. 25 (low-precision, ~0.01°)
 *   - Moon: ch. 47 (main periodic terms of ELP-2000/82, ~10")
 *   - Sidereal time: ch. 12
 *
 * Tithi = (Moon longitude − Sun longitude) / 12°. Nutation cancels in this
 * difference, so the dominant error is the Sun term (~0.01° ≈ 1–2 minutes of
 * tithi time). Every result built on these numbers is labelled "calculated"
 * in the UI until an admin verifies it against an official ISKCON calendar.
 *
 * All instants are JavaScript epoch milliseconds (UTC).
 */

const DEG = Math.PI / 180;
const sin = (d: number) => Math.sin(d * DEG);
const cos = (d: number) => Math.cos(d * DEG);
export const norm360 = (d: number) => ((d % 360) + 360) % 360;
const wrap180 = (d: number) => {
  const x = norm360(d);
  return x > 180 ? x - 360 : x;
};

export const MS_PER_DAY = 86_400_000;
const JD_UNIX_EPOCH = 2440587.5;

export const msToJd = (ms: number) => ms / MS_PER_DAY + JD_UNIX_EPOCH;
export const jdToMs = (jd: number) => (jd - JD_UNIX_EPOCH) * MS_PER_DAY;

/** ΔT (TT − UT) in seconds — Espenak & Meeus polynomial for 2005–2050 */
const deltaT = (year: number) => {
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
};

/** Julian centuries of Terrestrial Time since J2000 */
const centuriesTT = (ms: number) => {
  const year = 1970 + ms / (365.2425 * MS_PER_DAY);
  const jde = msToJd(ms) + deltaT(year) / 86400;
  return (jde - 2451545.0) / 36525;
};

/* ---------------------------------------------------------------- Sun --- */

/** Apparent geocentric ecliptic longitude of the Sun (degrees) */
export function sunLongitude(ms: number): number {
  const T = centuriesTT(ms);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const omega = 125.04 - 1934.136 * T;
  return norm360(L0 + C - 0.00569 - 0.00478 * sin(omega));
}

/* --------------------------------------------------------------- Moon --- */

// Meeus Table 47.A — [D, M, M', F, Σl coefficient (1e-6 degrees)]
const MOON_LON_TERMS: [number, number, number, number, number][] = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399], [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330], [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
];

/** Apparent geocentric ecliptic longitude of the Moon (degrees) */
export function moonLongitude(ms: number): number {
  const T = centuriesTT(ms);
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  let sum = 0;
  for (const [d, m, mp, f, c] of MOON_LON_TERMS) {
    const eFactor = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sum += c * eFactor * sin(d * D + m * M + mp * Mp + f * F);
  }
  sum += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);

  // nutation in longitude (same approximation as the Sun, so it cancels in tithi)
  const omega = 125.04 - 1934.136 * T;
  return norm360(Lp + sum / 1e6 - 0.00478 * sin(omega));
}

/* ------------------------------------------------- Tithi & nakshatra --- */

/** Moon − Sun elongation, 0…360° */
export const elongation = (ms: number) => norm360(moonLongitude(ms) - sunLongitude(ms));

/** Tithi index 0…29 (0 = Shukla Pratipat, 10 = Shukla Ekadashi, 14 = Purnima, 25 = Krishna Ekadashi, 29 = Amavasya) */
export const tithiAt = (ms: number) => Math.floor(elongation(ms) / 12);

/**
 * Instant (ms) at which the elongation equals `targetDeg`, searching near `guessMs`.
 * Newton iteration on the mean synodic rate; converges to < 1 s.
 */
export function findElongation(targetDeg: number, guessMs: number): number {
  let t = guessMs;
  for (let i = 0; i < 30; i++) {
    const diff = wrap180(elongation(t) - targetDeg);
    if (Math.abs(diff) < 1e-6) break;
    // derivative estimate (deg/day) — numerically, for robustness
    const rate = wrap180(elongation(t + 3_600_000) - elongation(t)) * 24;
    t -= (diff / (rate > 5 ? rate : 12.19)) * MS_PER_DAY;
  }
  return t;
}

/** Next instant after `fromMs` when the elongation reaches `targetDeg` */
export function nextElongation(targetDeg: number, fromMs: number): number {
  const ahead = norm360(targetDeg - elongation(fromMs));
  const guess = fromMs + (ahead / 12.19) * MS_PER_DAY;
  let t = findElongation(targetDeg, guess);
  if (t <= fromMs) t = findElongation(targetDeg, t + 29.53 * MS_PER_DAY);
  return t;
}

/** Start and end of the tithi with index `k` that is current/near `nearMs` */
export function tithiSpan(k: number, nearMs: number): { start: number; end: number } {
  const start = findElongation(k * 12, nearMs - 0.5 * MS_PER_DAY);
  const end = findElongation(norm360((k + 1) * 12), start + MS_PER_DAY);
  return { start, end };
}

/** Lahiri ayanamsa — same formula GCal uses (GCAyanamsha.py, type 1) */
export const ayanamsa = (ms: number) => {
  const T = (msToJd(ms) - 2451545.0) / 36525;
  return 23.85305555555 + ((5028.796195 - 1.1054348 * T) * T) / 3600;
};

export const NAKSHATRAS = [
  'Ashvini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Svati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

/** Moon's nakshatra index 0…26 */
export const nakshatraAt = (ms: number) =>
  Math.floor(norm360(moonLongitude(ms) - ayanamsa(ms)) / (360 / 27));

/** Instant at which the nakshatra current at `ms` ends */
export function nakshatraEnd(ms: number): number {
  const span = 360 / 27;
  const target = (nakshatraAt(ms) + 1) * span;
  let t = ms;
  for (let i = 0; i < 30; i++) {
    const sid = norm360(moonLongitude(t) - ayanamsa(t));
    const diff = wrap180(sid - target);
    if (Math.abs(diff) < 1e-6) break;
    t -= (diff / 13.18) * MS_PER_DAY;
  }
  return t;
}

/** Sun's sidereal rashi 0…11 (0 = Mesha) */
export const sunRashiAt = (ms: number) => Math.floor(norm360(sunLongitude(ms) - ayanamsa(ms)) / 30);

/**
 * Amanta lunar month containing `ms`.
 * index 0 = Chaitra … 11 = Phalguna; `adhika` when no solar sankranti falls inside it.
 */
export function lunarMonthAt(ms: number): { index: number; adhika: boolean; newMoonStart: number; newMoonEnd: number } {
  const e = elongation(ms);
  const newMoonStart = findElongation(0, ms - (e / 12.19) * MS_PER_DAY);
  const newMoonEnd = findElongation(0, newMoonStart + 29.53 * MS_PER_DAY);
  const r1 = sunRashiAt(newMoonStart);
  const r2 = sunRashiAt(newMoonEnd);
  const adhika = r1 === r2;
  // Sun in Mina (11) at the opening new moon → Chaitra (0)
  const index = (r1 + 1) % 12;
  return { index, adhika, newMoonStart, newMoonEnd };
}

/* ------------------------------------------------- Sunrise / sunset --- */

function sunEquatorial(ms: number): { ra: number; dec: number } {
  const T = centuriesTT(ms);
  const lambda = sunLongitude(ms);
  const omega = 125.04 - 1934.136 * T;
  const eps = 23.439291 - 0.0130042 * T + 0.00256 * cos(omega);
  const ra = norm360(Math.atan2(cos(eps) * sin(lambda), cos(lambda)) / DEG);
  const dec = Math.asin(sin(eps) * sin(lambda)) / DEG;
  return { ra, dec };
}

/** Greenwich mean sidereal time (degrees) */
const gmst = (ms: number) => {
  const jd = msToJd(ms);
  const T = (jd - 2451545.0) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000);
};

/** Solar altitude (degrees) at a place */
export function sunAltitude(ms: number, lat: number, lon: number): number {
  const { ra, dec } = sunEquatorial(ms);
  const H = gmst(ms) + lon - ra;
  return Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H)) / DEG;
}

/**
 * Standard altitude for sunrise/sunset: upper limb on the horizon with
 * mean atmospheric refraction (−0°50′). This is the common almanac
 * definition; published Vaishnava calendars may differ by ~1–2 minutes.
 */
export const SUNRISE_ALTITUDE = -0.8333;

/**
 * Find the instant in [fromMs, toMs) where the Sun's altitude crosses
 * SUNRISE_ALTITUDE in the given direction. Returns null when it doesn't
 * (polar day/night).
 */
function findSunCrossing(fromMs: number, toMs: number, lat: number, lon: number, rising: boolean): number | null {
  const step = 20 * 60_000;
  let prevT = fromMs;
  let prevA = sunAltitude(prevT, lat, lon) - SUNRISE_ALTITUDE;
  for (let t = fromMs + step; t <= toMs; t += step) {
    const a = sunAltitude(t, lat, lon) - SUNRISE_ALTITUDE;
    if (rising ? prevA < 0 && a >= 0 : prevA > 0 && a <= 0) {
      let lo = prevT, hi = t;
      for (let i = 0; i < 25; i++) {
        const mid = (lo + hi) / 2;
        const m = sunAltitude(mid, lat, lon) - SUNRISE_ALTITUDE;
        if (rising ? m < 0 : m > 0) lo = mid;
        else hi = mid;
      }
      return Math.round((lo + hi) / 2);
    }
    prevT = t;
    prevA = a;
  }
  return null;
}

/** Sunrise and sunset for the civil day starting at `localMidnightMs` */
export function sunTimes(localMidnightMs: number, lat: number, lon: number): { sunrise: number | null; sunset: number | null } {
  const end = localMidnightMs + MS_PER_DAY;
  const sunrise = findSunCrossing(localMidnightMs, end, lat, lon, true);
  const sunset = findSunCrossing(sunrise ?? localMidnightMs, end + 6 * 3_600_000, lat, lon, false);
  return { sunrise, sunset };
}
