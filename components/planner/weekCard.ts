import type React from 'react';
import { Sunrise, Moon, Dumbbell, GraduationCap, HandHeart, Sun, Smartphone, BookOpen } from 'lucide-react';
import MalaIcon from '../MalaIcon';
import { DailyEntry, DailyMetrics, INITIAL_METRICS, INITIAL_REFLECTIONS } from '../../types';
import { createDefaultEntry } from '../../services/storage';
import { parseDateKey, shiftDateKey } from '../../utils/date';

export type RowKind = 'time' | 'duration' | 'rounds' | 'yesno' | 'text';

export interface PracticeRow {
  id: string;
  label: string;
  short: string;
  kind: RowKind;
  key: keyof DailyMetrics;
  Icon: React.ComponentType<any>;
  tone: string; // icon chip colours
  allowNone?: boolean; // duration where 0 is a meaningful answer ("None")
}

/** The nine practices on the weekly card, in order. */
export const PRACTICES: PracticeRow[] = [
  { id: 'wake', label: 'Wake up', short: 'Wake', kind: 'time', key: 'wakeUpTime', Icon: Sunrise, tone: 'bg-amber-50 text-amber-600' },
  { id: 'japa', label: 'Japa rounds', short: 'Japa', kind: 'rounds', key: 'chantingRounds', Icon: MalaIcon, tone: 'bg-brand-50 text-brand-600' },
  { id: 'exercise', label: 'Exercise', short: 'Exercise', kind: 'duration', key: 'exerciseMinutes', Icon: Dumbbell, tone: 'bg-emerald-50 text-emerald-600' },
  { id: 'class', label: 'Class attended', short: 'Class', kind: 'yesno', key: 'classAttended', Icon: GraduationCap, tone: 'bg-sky-50 text-sky-600' },
  { id: 'seva', label: 'Seva', short: 'Seva', kind: 'text', key: 'sevaPerformed', Icon: HandHeart, tone: 'bg-rose-50 text-rose-500' },
  { id: 'daySleep', label: 'Day sleep', short: 'Day sleep', kind: 'duration', key: 'daySleepMinutes', Icon: Sun, tone: 'bg-yellow-50 text-yellow-600', allowNone: true },
  { id: 'screen', label: 'Screen time', short: 'Screen', kind: 'duration', key: 'phoneUsage', Icon: Smartphone, tone: 'bg-violet-50 text-violet-600' },
  { id: 'reading', label: 'Reading', short: 'Reading', kind: 'duration', key: 'readingMinutes', Icon: BookOpen, tone: 'bg-indigo-50 text-indigo-600' },
  { id: 'rest', label: 'Went to rest', short: 'Rest', kind: 'time', key: 'sleepTime', Icon: Moon, tone: 'bg-slate-100 text-slate-600' },
];

/** A day counts as complete when at least this many of the nine practices are filled. */
export const DAY_GOAL = 5;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday of the week that holds `key` */
export const mondayOf = (key: string) => {
  const dow = (parseDateKey(key).getDay() + 6) % 7;
  return shiftDateKey(key, -dow);
};

export const weekDays = (weekStart: string) => Array.from({ length: 7 }, (_, i) => shiftDateKey(weekStart, i));

export const formatWeekRange = (weekStart: string) => {
  const a = parseDateKey(weekStart);
  const b = parseDateKey(shiftDateKey(weekStart, 6));
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString('en-IN', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const right = b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${left} – ${right}`;
};

/** Fill in anything missing from older saved entries */
export const normalizeEntry = (data: DailyEntry, key: string): DailyEntry => {
  const base = createDefaultEntry(key);
  return {
    ...base,
    ...data,
    id: data.id || key,
    date: data.date || key,
    commitments: data.commitments?.length ? data.commitments : base.commitments,
    timeline: data.timeline?.length ? data.timeline : base.timeline,
    metrics: { ...INITIAL_METRICS, ...(data.metrics || {}) },
    reflections: { ...INITIAL_REFLECTIONS, ...(data.reflections || {}) },
    reasonNotCompleted: data.reasonNotCompleted || '',
  };
};

const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '';

export const isFilled = (row: PracticeRow, m: DailyMetrics): boolean => {
  switch (row.kind) {
    case 'rounds':
      return (Number(m.chantingRounds) || 0) > 0 || !!m.chantingTime;
    case 'text':
      return !!String(m[row.key] ?? '').trim();
    case 'duration':
      // phoneUsage defaults to 0 on every entry, so only a positive value counts as answered
      return row.key === 'phoneUsage' ? (Number(m.phoneUsage) || 0) > 0 : hasValue(m[row.key]);
    default:
      return hasValue(m[row.key]);
  }
};

export const filledCount = (m: DailyMetrics) => PRACTICES.filter((r) => isFilled(r, m)).length;

export const time12 = (hhmm?: string) => {
  if (!hhmm) return '';
  const [h, mm] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const ap = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(mm || 0).padStart(2, '0')} ${ap}`;
};

export const duration = (min?: number) => {
  const n = Number(min) || 0;
  if (n === 0) return 'None';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

/** Text shown inside a cell */
export const cellText = (row: PracticeRow, m: DailyMetrics): string => {
  if (!isFilled(row, m)) return '';
  switch (row.kind) {
    case 'time':
      return time12(m[row.key] as string);
    case 'rounds': {
      const r = Number(m.chantingRounds) || 0;
      return r ? `${r}` : '—';
    }
    case 'duration':
      return duration(m[row.key] as number);
    case 'yesno':
      return m.classAttended === 'yes' ? 'Yes' : 'No';
    default:
      return String(m[row.key] ?? '');
  }
};

/** Returns metrics with `key` set — or removed when value is undefined (Firebase rejects undefined). */
export const withMetric = (m: DailyMetrics, key: keyof DailyMetrics, value: unknown): DailyMetrics => {
  const next: any = { ...m };
  if (value === undefined) delete next[key];
  else next[key] = value;
  // keep the daily "Reading" tick in step with reading minutes
  if (key === 'readingMinutes') next.gitaReading = (Number(value) || 0) > 0;
  return next;
};

export const shareMessage = (weekStart: string, name: string) =>
  [
    'Hare Krishna 🙏',
    'Please accept my humble obeisances.',
    '',
    `Here is my sadhana card for ${formatWeekRange(weekStart)}.`,
    ...(name ? ['', 'Your servant,', name] : []),
  ].join('\n');

export const cardFileName = (weekStart: string, name: string) => {
  const clean = name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 40) || 'Sadhana';
  return `${clean}_SadhanaCard_${weekStart}.png`;
};
