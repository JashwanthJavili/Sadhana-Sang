import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateEkadashis, type EkadashiLocation } from '../../utils/ekadashi/calendar';
import { DEFAULT_LOCATION_ID, findPreset, PRESET_LOCATIONS } from '../../utils/ekadashi/locations';
import { mergeObservances } from '../../utils/ekadashi/merge';
import { dateKeyInTz, localMidnight } from '../../utils/ekadashi/timezone';
import type { DisplayEkadashi, EkadashiContent, ObservanceRecord } from '../../utils/ekadashi/types';
import { getSavedLocation, getSavedLocationLocal, loadEkadashiContent, loadObservances, saveLocation } from '../../services/ekadashi';

const initialLocation = (): EkadashiLocation => {
  const saved = getSavedLocationLocal();
  if (saved) return saved;
  // First visit: pick a preset city in the browser's own time zone when possible
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const sameZone = PRESET_LOCATIONS.find((l) => l.tz === tz);
    if (sameZone) return sameZone;
  } catch {
    /* ignore */
  }
  return findPreset(DEFAULT_LOCATION_ID)!;
};

/** Window of civil years computed around today */
const yearRange = (tz: string) => {
  const y = Number(dateKeyInTz(Date.now(), tz).slice(0, 4));
  return { from: `${y - 1}-01-01`, to: `${y + 1}-12-31` };
};

export interface EkadashiCalendarState {
  location: EkadashiLocation;
  setLocation: (l: EkadashiLocation) => void;
  rows: DisplayEkadashi[];
  content: Record<string, EkadashiContent>;
  records: ObservanceRecord[];
  loading: boolean;
  todayKey: string;
  /** index in rows of the next (or current) fast */
  nextIndex: number;
  /** epoch ms when the fast begins (sunrise of the fast date, else local midnight) */
  fastStartMs: (row: DisplayEkadashi) => number;
  refresh: () => void;
}

export function useEkadashiCalendar(): EkadashiCalendarState {
  const { user } = useAuth();
  const [location, setLocationState] = useState<EkadashiLocation>(initialLocation);
  const [content, setContent] = useState<Record<string, EkadashiContent>>({});
  const [records, setRecords] = useState<ObservanceRecord[]>([]);
  const [rows, setRows] = useState<DisplayEkadashi[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // A location saved on another device
  useEffect(() => {
    if (getSavedLocationLocal()) return;
    getSavedLocation(user?.uid).then((l) => l && setLocationState(l));
  }, [user?.uid]);

  useEffect(() => {
    loadEkadashiContent(tick > 0).then(setContent);
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      const recs = location.custom ? [] : await loadObservances(location.id, tick > 0);
      // let the spinner paint before the (≈0.3 s) calculation
      await new Promise((r) => setTimeout(r, 16));
      const { from, to } = yearRange(location.tz);
      const calc = calculateEkadashis(location, from, to);
      if (cancelled) return;
      setRecords(recs);
      setRows(mergeObservances(calc, recs, location, from, to));
      setLoading(false);
    };
    run().catch((err) => {
      console.error('Ekadashi calendar failed', err);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [location, tick]);

  const setLocation = useCallback(
    (l: EkadashiLocation) => {
      setLocationState(l);
      saveLocation(l, user?.uid);
    },
    [user?.uid]
  );

  const todayKey = dateKeyInTz(Date.now(), location.tz);

  const fastStartMs = useCallback(
    (row: DisplayEkadashi) =>
      row.calc && row.calc.fastDate === row.fastDate && row.calc.sunriseOnFast !== null
        ? row.calc.sunriseOnFast
        : localMidnight(row.fastDate, location.tz),
    [location.tz]
  );

  const nextIndex = useMemo(() => {
    // the fast stays "current" through its parana day
    const i = rows.findIndex((r) => r.paranaDate >= todayKey);
    return i === -1 ? rows.length - 1 : i;
  }, [rows, todayKey]);

  return {
    location,
    setLocation,
    rows,
    content,
    records,
    loading,
    todayKey,
    nextIndex,
    fastStartMs,
    refresh: () => setTick((t) => t + 1),
  };
}
