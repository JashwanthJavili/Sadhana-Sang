import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Send,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Sparkles,
  MessageCircle,
  Plus,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserData } from '../../contexts/UserDataContext';
import { DailyEntry, DailyMetrics, WeeklyCardNotes, SadhanaCardProfile } from '../../types';
import { getEntry, saveEntry, getWeeklyNotes, saveWeeklyNotes, getCardProfile, saveCardProfile, emptyWeeklyNotes } from '../../services/storage';
import { localDateKey, parseDateKey, shiftDateKey } from '../../utils/date';
import { PageLoader } from '../LoadingScreen';
import PracticeEditor from './PracticeEditor';
import { getJapaGoal } from '../../utils/japaGoal';
import WeekReport from './WeekReport';
import {
  PRACTICES,
  WEEKDAYS,
  DAY_GOAL,
  PracticeRow,
  mondayOf,
  weekDays,
  formatWeekRange,
  normalizeEntry,
  isFilled,
  filledCount,
  cellText,
  time12,
  withMetric,
  shareMessage,
  cardFileName,
} from './weekCard';

const AUTOSAVE_MS = 800;
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const REFLECTIONS: { key: 'nicePoints' | 'realizations' | 'concerns'; label: string; hint: string; Icon: React.ComponentType<any> }[] = [
  { key: 'nicePoints', label: 'Nice points I heard or read', hint: 'A verse, a class, a line from a book…', Icon: Lightbulb },
  { key: 'realizations', label: 'My realisations', hint: 'What did Krishna teach you this week?', Icon: Sparkles },
  { key: 'concerns', label: 'Concerns or questions', hint: 'Anything you would like to ask your mentor', Icon: MessageCircle },
];

/* ----------------------------- progress ring ----------------------------- */

const DayRing: React.FC<{ count: number; label: string | number; size?: number; active?: boolean; today?: boolean }> = ({
  count,
  label,
  size = 44,
  active,
  today,
}) => {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(count / PRACTICES.length, 1);
  const done = count >= DAY_GOAL;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={active ? 'stroke-white/40' : 'stroke-sandal-200'} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={`transition-[stroke-dashoffset] duration-500 ${done ? 'stroke-emerald-500' : active ? 'stroke-marigold-400' : 'stroke-brand-500'}`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${
          active ? 'text-white' : today ? 'text-brand-700' : 'text-maroon-900'
        }`}
      >
        {done ? <Check size={16} strokeWidth={3} className={active ? 'text-white' : 'text-emerald-600'} /> : label}
      </span>
    </span>
  );
};

/* ----------------------------- page ----------------------------- */

interface Props {
  anchorDate: string;
  onAnchorChange: (date: string) => void;
}

const WeeklyCard: React.FC<Props> = ({ anchorDate, onAnchorChange }) => {
  const { user } = useAuth();
  const { userSettings } = useUserData();
  const weekStart = mondayOf(anchorDate);
  const days = weekDays(weekStart);
  const today = localDateKey();
  const goal = getJapaGoal();

  const [entries, setEntries] = useState<Record<string, DailyEntry> | null>(null);
  const [notes, setNotes] = useState<WeeklyCardNotes>(emptyWeeklyNotes(weekStart));
  const [profile, setProfile] = useState<SadhanaCardProfile>({ mentor: '', phone: '' });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [editing, setEditing] = useState<{ row: PracticeRow; day: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => (days.includes(today) ? today : days[0]));
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);
  const [toast, setToast] = useState('');

  const name = (userSettings?.userName && userSettings.userName !== 'Devotee' ? userSettings.userName : '') || user?.displayName || '';

  // refs for autosave
  const latestEntries = useRef<Record<string, DailyEntry>>({});
  const latestNotes = useRef<WeeklyCardNotes>(notes);
  const latestProfile = useRef<SadhanaCardProfile>(profile);
  const dirtyDays = useRef<Set<string>>(new Set());
  const notesDirty = useRef(false);
  const profileDirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (!user) return;
    const daysToSave = [...dirtyDays.current];
    const saveNotes = notesDirty.current;
    const saveProfile = profileDirty.current;
    if (!daysToSave.length && !saveNotes && !saveProfile) return;
    dirtyDays.current.clear();
    notesDirty.current = false;
    profileDirty.current = false;
    setSaveState('saving');
    try {
      await Promise.all([
        ...daysToSave.map((d) => saveEntry(user.uid, { ...latestEntries.current[d], lastUpdated: Date.now() })),
        saveNotes ? saveWeeklyNotes(user.uid, latestNotes.current) : Promise.resolve(),
        saveProfile ? saveCardProfile(user.uid, latestProfile.current) : Promise.resolve(),
      ]);
      setSaveState('saved');
    } catch {
      daysToSave.forEach((d) => dirtyDays.current.add(d));
      notesDirty.current ||= saveNotes;
      profileDirty.current ||= saveProfile;
      setSaveState('error');
    }
  }, [user]);

  const schedule = () => {
    setSaveState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  };

  // Load the week (flushing edits from the previous week first)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await flush();
      setEntries(null);
      const [loaded, weekNotes, cardProfile] = await Promise.all([
        Promise.all(days.map((d) => getEntry(user.uid, d))),
        getWeeklyNotes(user.uid, weekStart),
        getCardProfile(user.uid),
      ]);
      if (cancelled) return;
      const map: Record<string, DailyEntry> = {};
      days.forEach((d, i) => (map[d] = normalizeEntry(loaded[i], d)));
      latestEntries.current = map;
      latestNotes.current = weekNotes;
      latestProfile.current = cardProfile;
      setEntries(map);
      setNotes(weekNotes);
      setProfile(cardProfile);
      setSaveState('idle');
      setSelectedDay((s) => (days.includes(s) ? s : days.includes(today) ? today : days[0]));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, user]);

  // Save on leave
  useEffect(() => {
    const onUnload = () => {
      flush();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ----------------------------- updaters ----------------------------- */

  const setMetric = (day: string, key: keyof DailyMetrics, value: unknown) => {
    const cur = latestEntries.current[day];
    if (!cur) return;
    const next = { ...cur, metrics: withMetric(cur.metrics, key, value) };
    latestEntries.current = { ...latestEntries.current, [day]: next };
    dirtyDays.current.add(day);
    setEntries(latestEntries.current);
    schedule();
  };

  const setNote = (key: keyof WeeklyCardNotes, value: string) => {
    latestNotes.current = { ...latestNotes.current, [key]: value };
    notesDirty.current = true;
    setNotes(latestNotes.current);
    schedule();
  };

  const setProfileField = (key: keyof SadhanaCardProfile, value: string) => {
    latestProfile.current = { ...latestProfile.current, [key]: value };
    profileDirty.current = true;
    setProfile(latestProfile.current);
    schedule();
  };

  /* ----------------------------- share / download ----------------------------- */

  const makeImage = async (): Promise<{ dataUrl: string; file: File }> => {
    await flush();
    const { toPng } = await import('html-to-image');
    const node = reportRef.current!;
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#FBF5EA' });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], cardFileName(weekStart, name), { type: 'image/png' });
    return { dataUrl, file };
  };

  const downloadUrl = (dataUrl: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = cardFileName(weekStart, name);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onDownload = async () => {
    setBusy('download');
    try {
      const { dataUrl } = await makeImage();
      downloadUrl(dataUrl);
      setToast('Card saved as an image');
    } catch (e) {
      console.error(e);
      setToast('Could not create the image. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy('share');
    const text = shareMessage(weekStart, name);
    try {
      const { dataUrl, file } = await makeImage();
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title: 'Sadhana card' });
        } catch (err: any) {
          if (err?.name !== 'AbortError') throw err;
        }
      } else {
        downloadUrl(dataUrl);
        try {
          await navigator.clipboard.writeText(text);
          setToast('Image downloaded and message copied — paste it to your mentor');
        } catch {
          setToast('Image downloaded — attach it in your chat with your mentor');
        }
      }
    } catch (e) {
      console.error(e);
      setToast('Could not create the image. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!entries) return <PageLoader label="Opening your weekly card…" />;

  /* ----------------------------- derived ----------------------------- */

  const counts = days.map((d) => filledCount(entries[d].metrics));
  const completeDays = counts.filter((c) => c >= DAY_GOAL).length;
  const rounds = days.map((d) => Number(entries[d].metrics.chantingRounds) || 0);
  const chanted = rounds.filter(Boolean);
  const avgRounds = chanted.length ? Math.round((chanted.reduce((a, b) => a + b, 0) / chanted.length) * 10) / 10 : 0;
  const readingMin = days.reduce((s, d) => s + (Number(entries[d].metrics.readingMinutes) || 0), 0);
  const isThisWeek = days.includes(today);
  const editIdx = editing ? days.indexOf(editing.day) : -1;

  const SaveBadge = () => {
    const map: Record<SaveState, { icon: React.ReactNode; text: string; cls: string }> = {
      idle: { icon: <CheckCircle2 size={15} />, text: 'Auto-saves', cls: 'text-maroon-900/45' },
      pending: { icon: <Loader2 size={15} className="animate-spin" />, text: 'Saving…', cls: 'text-maroon-900/55' },
      saving: { icon: <Loader2 size={15} className="animate-spin" />, text: 'Saving…', cls: 'text-maroon-900/55' },
      saved: { icon: <CheckCircle2 size={15} />, text: 'Saved', cls: 'text-emerald-700' },
      error: { icon: <AlertCircle size={15} />, text: 'Not saved — retry', cls: 'text-rose-700' },
    };
    const s = map[saveState];
    return (
      <button
        type="button"
        onClick={() => saveState === 'error' && flush()}
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.cls}`}
        style={{ minHeight: 0 }}
      >
        {s.icon}
        {s.text}
      </button>
    );
  };

  const renderCell = (row: PracticeRow, day: string) => {
    const m = entries[day].metrics;
    const filled = isFilled(row, m);
    const text = cellText(row, m);
    const sub = row.kind === 'rounds' && m.chantingTime ? time12(m.chantingTime) : '';
    const isToday = day === today;
    const tone =
      row.kind === 'yesno' && filled
        ? m.classAttended === 'yes'
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200'
        : row.kind === 'rounds' && filled && goal > 0 && (Number(m.chantingRounds) || 0) >= goal
          ? 'bg-gradient-to-br from-marigold-400/25 to-brand-500/15 text-maroon-900 ring-marigold-400/50'
          : filled
            ? 'bg-sandal-50 text-maroon-900 ring-sandal-300/80'
            : 'bg-white text-maroon-900/20 ring-sandal-200/80 hover:text-brand-600 hover:ring-marigold-400/60';
    return (
      <button
        key={day}
        type="button"
        onClick={() => setEditing({ row, day })}
        title={`${row.label} · ${parseDateKey(day).toLocaleDateString('en-IN', { weekday: 'long' })}`}
        className={`group flex h-14 w-full flex-col items-center justify-center rounded-xl px-1 text-center ring-1 transition hover:-translate-y-px hover:shadow-sm ${tone} ${isToday && !filled ? '!bg-marigold-400/[0.06] !ring-marigold-400/40' : ''}`}
        style={{ minHeight: 0 }}
      >
        {filled ? (
          <>
            <span className={`w-full truncate text-[13px] font-semibold leading-tight ${row.kind === 'text' ? 'text-[12px] font-medium' : ''}`}>{text}</span>
            {sub && <span className="text-[10.5px] font-medium text-maroon-900/50">{sub}</span>}
          </>
        ) : (
          <Plus size={15} className="transition group-hover:scale-110" />
        )}
      </button>
    );
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ============ Week bar ============ */}
      <div className="flex flex-col gap-3 rounded-3xl bg-white/90 p-3 ring-1 ring-sandal-200 sm:flex-row sm:items-center sm:justify-between sm:pl-5">
        <div className="flex items-center gap-2">
          <button onClick={() => onAnchorChange(shiftDateKey(weekStart, -7))} className="header-icon-btn bg-sandal-50 ring-1 ring-sandal-200" aria-label="Previous week">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center sm:flex-none sm:text-left">
            <span className="block text-base font-semibold leading-tight text-maroon-900">{isThisWeek ? 'This week' : formatWeekRange(weekStart)}</span>
            <span className="text-xs text-maroon-900/50">{isThisWeek ? formatWeekRange(weekStart) : `${completeDays} of 7 days complete`}</span>
          </div>
          <button onClick={() => onAnchorChange(shiftDateKey(weekStart, 7))} className="header-icon-btn bg-sandal-50 ring-1 ring-sandal-200" aria-label="Next week">
            <ChevronRight size={18} />
          </button>
          {!isThisWeek && (
            <button onClick={() => onAnchorChange(today)} className="btn-secondary btn-sm ml-1 hidden sm:inline-flex">
              <CalendarDays size={14} /> This week
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-1 sm:justify-end">
          <SaveBadge />
          <div className="flex items-center gap-2">
            {!isThisWeek && (
              <button onClick={() => onAnchorChange(today)} className="btn-secondary btn-sm sm:hidden">
                <CalendarDays size={14} />
              </button>
            )}
            <button onClick={onDownload} disabled={!!busy} className="btn-secondary btn-sm" aria-label="Download card">
              {busy === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span className="hidden md:inline">Download</span>
            </button>
            <button onClick={onShare} disabled={!!busy} className="btn-primary btn-sm">
              {busy === 'share' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Send to mentor
            </button>
          </div>
        </div>
      </div>

      {/* ============ The card ============ */}
      <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(67,27,17,0.04),0_12px_32px_-16px_rgba(67,27,17,0.18)] ring-1 ring-sandal-200">
        {/* Band */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-white px-5 pb-5 pt-5 text-maroon-900 sm:px-7 sm:pt-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-marigold-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">Weekly sadhana card</p>
              <h2 className="mt-1 truncate text-2xl font-semibold text-maroon-900 sm:text-[28px]">{name || 'Your card'}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 ring-amber-200 focus-within:ring-marigold-400">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-maroon-900/45">Mentor</span>
                  <input
                    value={profile.mentor}
                    onChange={(e) => setProfileField('mentor', e.target.value)}
                    placeholder="Add name"
                    className="w-36 bg-transparent text-sm font-medium text-maroon-900 outline-none placeholder:text-maroon-900/30 sm:w-44"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 ring-amber-200 focus-within:ring-marigold-400">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-maroon-900/45">Phone</span>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfileField('phone', e.target.value)}
                    placeholder="Optional"
                    inputMode="tel"
                    className="w-28 bg-transparent text-sm font-medium text-maroon-900 outline-none placeholder:text-maroon-900/30"
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { v: `${completeDays}/7`, l: 'Days complete' },
                { v: avgRounds || '—', l: 'Avg rounds' },
                { v: readingMin ? `${Math.round((readingMin / 60) * 10) / 10}h` : '—', l: 'Reading' },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-white px-3 py-2.5 text-center ring-1 ring-amber-200/80 sm:min-w-[92px]">
                  <p className="text-xl font-semibold tabular-nums">{s.v}</p>
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-maroon-900/50">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Desktop / tablet: the full grid ---------- */}
        <div className="hidden overflow-x-auto p-4 md:block lg:p-5">
          <div className="min-w-[760px]">
            {/* Day rail */}
            <div className="grid grid-cols-[156px_repeat(7,minmax(0,1fr))] gap-2 pb-3">
              <div className="flex items-end pb-1 pl-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-maroon-900/40">Practice</div>
              {days.map((d, i) => {
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition hover:bg-sandal-50 ${isToday ? 'bg-marigold-400/10 ring-1 ring-marigold-400/40' : ''}`}
                  >
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isToday ? 'text-brand-700' : 'text-maroon-900/50'}`}>
                      {isToday ? 'Today' : WEEKDAYS[i]}
                    </span>
                    <DayRing count={counts[i]} label={parseDateKey(d).getDate()} today={isToday} />
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {PRACTICES.map((row) => (
                <div key={row.id} className="grid grid-cols-[156px_repeat(7,minmax(0,1fr))] items-center gap-2 rounded-2xl px-0 py-0.5">
                  <div className="flex items-center gap-2.5 pl-1">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${row.tone}`}>
                      <row.Icon size={16} />
                    </span>
                    <span className="text-sm font-semibold text-maroon-900/85">{row.label}</span>
                  </div>
                  {days.map((d) => renderCell(row, d))}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-maroon-900/40">
              Tap any box to fill it · a day is complete when {DAY_GOAL} of the {PRACTICES.length} practices are filled
            </p>
          </div>
        </div>

        {/* ---------- Mobile: day rail + list ---------- */}
        <div className="md:hidden">
          <div className="grid grid-cols-7 gap-1 border-b border-sandal-200 px-2 py-3">
            {days.map((d, i) => {
              const active = d === selectedDay;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition ${active ? 'bg-brand-500 shadow-md' : ''}`}
                  style={{ minHeight: 0 }}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${active ? 'text-sandal-200' : isToday ? 'text-brand-700' : 'text-maroon-900/45'}`}>
                    {WEEKDAYS[i].slice(0, 2)}
                  </span>
                  <DayRing count={counts[i]} label={parseDateKey(d).getDate()} size={36} active={active} today={isToday} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-4 pb-1 pt-4">
            <p className="text-sm font-semibold text-maroon-900">
              {parseDateKey(selectedDay).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <span className="rounded-full bg-sandal-100 px-2.5 py-0.5 text-xs font-semibold text-maroon-800">
              {counts[days.indexOf(selectedDay)]}/{PRACTICES.length}
            </span>
          </div>

          <ul className="divide-y divide-sandal-200/70 px-2 pb-2">
            {PRACTICES.map((row) => {
              const m = entries[selectedDay].metrics;
              const filled = isFilled(row, m);
              const text = cellText(row, m);
              const sub = row.kind === 'rounds' && m.chantingTime ? ` · ${time12(m.chantingTime)}` : '';
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setEditing({ row, day: selectedDay })}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition active:bg-sandal-50"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${row.tone}`}>
                      <row.Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-maroon-900">{row.label}</span>
                    {filled ? (
                      <span className="max-w-[45%] truncate rounded-xl bg-sandal-100 px-3 py-1.5 text-sm font-semibold text-maroon-900">
                        {row.kind === 'rounds' ? `${text} rounds${sub}` : text}
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl text-maroon-900/30 border border-dashed border-sandal-300">
                        <Plus size={16} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ============ Weekly reflection ============ */}
      <section className="rounded-3xl bg-white/90 p-5 shadow-[0_1px_2px_rgba(67,27,17,0.04),0_8px_24px_-12px_rgba(67,27,17,0.12)] ring-1 ring-sandal-200 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-maroon-900">Looking back on the week</h2>
          <p className="mt-0.5 text-xs text-maroon-900/45">Shared with your mentor along with the card</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {REFLECTIONS.map((r) => (
            <label key={r.key} className="group block rounded-2xl bg-sandal-50/70 p-4 ring-1 ring-sandal-200 transition focus-within:bg-white focus-within:ring-marigold-400">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-maroon-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-sandal-200">
                  <r.Icon size={15} />
                </span>
                {r.label}
              </span>
              <textarea
                rows={4}
                value={notes[r.key]}
                onChange={(e) => setNote(r.key, e.target.value)}
                placeholder={r.hint}
                className="block w-full resize-none bg-transparent text-sm leading-relaxed text-maroon-900 outline-none placeholder:text-maroon-900/30"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Editor */}
      {editing && (
        <PracticeEditor
          key={`${editing.row.id}-${editing.day}`}
          row={editing.row}
          dateKey={editing.day}
          metrics={entries[editing.day].metrics}
          onSet={(key, value) => setMetric(editing.day, key, value)}
          onClose={() => setEditing(null)}
          onPrev={editIdx > 0 ? () => setEditing({ row: editing.row, day: days[editIdx - 1] }) : undefined}
          onNext={editIdx < 6 ? () => setEditing({ row: editing.row, day: days[editIdx + 1] }) : undefined}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-[130] mx-auto max-w-sm animate-rise-in rounded-2xl bg-maroon-900 px-4 py-3 text-center text-sm font-medium text-sandal-50 shadow-lg lg:bottom-8" role="status">
          {toast}
        </div>
      )}

      {/* Off-screen image source for sharing */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -12000, top: 0, pointerEvents: 'none' }}>
        <WeekReport
          ref={reportRef}
          weekStart={weekStart}
          days={days}
          entries={entries}
          notes={notes}
          name={name}
          mentor={profile.mentor}
          phone={profile.phone}
        />
      </div>
    </div>
  );
};

export default WeeklyCard;
