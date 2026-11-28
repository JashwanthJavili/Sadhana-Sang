import { getJapaGoal } from '../utils/japaGoal';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { PenLine, ChevronRight, ArrowRight, Flame, BookOpen, CalendarDays } from 'lucide-react';
import { useEkadashiCalendar } from '../components/ekadashi/useEkadashiCalendar';
import { ekadashiName } from '../components/ekadashi/shared';
import { paranaLabel } from '../utils/ekadashi/merge';
import { db } from '../services/firebase';
import { getAllEntries } from '../services/storage';
import { DailyEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { PageLoader } from '../components/LoadingScreen';
import MalaIcon from '../components/MalaIcon';
import { localDateKey, shiftDateKey, parseDateKey, daysUntil } from '../utils/date';
// @ts-ignore
import heroImage from '../utils/Images/krishna-embrace.jpg';

/* -------------------------------------------------------------------------- */
/* Types, constants & in-memory cache                                          */
/* -------------------------------------------------------------------------- */

interface ChantingSession {
  id: string;
  rounds: number;
  timestamp: number;
}
interface ChantingStats {
  totalRounds: number;
  totalTime: number;
}
interface Festival {
  id: string;
  name: string;
  date: string;
  shortDescription?: string;
}

interface DashboardData {
  entries: DailyEntry[];
  sessions: ChantingSession[];
  stats: ChantingStats | null;
  festivals: Festival[] | null;
}

const safeGet = async (path: string) => {
  try {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { userSettings } = useUserData();
  const navigate = useNavigate();
  const isGuest = user?.uid === 'guest';

  // Always wait for fresh data - never paint stale numbers first
  const [data, setData] = useState<DashboardData>({ entries: [], sessions: [], stats: null, festivals: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const uid = user.uid;

    const update = (patch: Partial<DashboardData>) => {
      if (cancelled) return;
      setData((prev) => ({ ...prev, ...patch }));
    };

    const load = async () => {
      // 1) Personal data - needed for the first paint
      const [entries, sessionsVal, statsVal] = await Promise.all([
        getAllEntries(uid).catch(() => [] as DailyEntry[]),
        isGuest ? null : safeGet(`users/${uid}/chantingSessions`),
        isGuest ? null : safeGet(`users/${uid}/chantingStats`),
      ]);
      update({
        entries,
        sessions: sessionsVal ? (Object.values(sessionsVal) as ChantingSession[]) : [],
        stats: statsVal,
      });
      if (!cancelled) setLoading(false);

      // 2) Shared calendar - loads in the background
      if (!isGuest) {
        const festivalsVal = await safeGet('festivals');
        update({
          festivals: festivalsVal ? Object.entries(festivalsVal).map(([id, v]: [string, any]) => ({ id, ...v })) : [],
        });
      }
    };

    load();
    window.addEventListener('userDataUpdated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('userDataUpdated', load);
    };
  }, [user, isGuest]);

  /* ------------------------------ derived data ----------------------------- */

  const { entries, sessions, festivals } = data;
  const today = localDateKey();

  const roundsByDay = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      if (!s?.timestamp) return;
      const key = localDateKey(new Date(s.timestamp));
      map.set(key, (map.get(key) || 0) + (Number(s.rounds) || 0));
    });
    // A planner entry may record more rounds (e.g. chanted on physical beads)
    entries.forEach((e) => {
      const r = Number(e.metrics?.chantingRounds) || 0;
      if (r > (map.get(e.id) || 0)) map.set(e.id, r);
    });
    return map;
  }, [sessions, entries]);

  const practicedDays = useMemo(() => {
    const set = new Set<string>();
    roundsByDay.forEach((r, k) => r > 0 && set.add(k));
    entries.forEach((e) => set.add(e.id));
    return set;
  }, [roundsByDay, entries]);

  const roundsToday = roundsByDay.get(today) || 0;
  const goal = getJapaGoal();
  const remaining = Math.max(goal - roundsToday, 0);

  const streak = useMemo(() => {
    let day = practicedDays.has(today) ? today : shiftDateKey(today, -1);
    let count = 0;
    while (practicedDays.has(day)) {
      count++;
      day = shiftDateKey(day, -1);
    }
    return count;
  }, [practicedDays, today]);

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const key = shiftDateKey(today, i - 6);
        return {
          key,
          label: parseDateKey(key).toLocaleDateString('en-IN', { weekday: 'narrow' }),
          rounds: roundsByDay.get(key) || 0,
          isToday: key === today,
        };
      }),
    [roundsByDay, today]
  );
  const weekMax = Math.max(goal, 1, ...week.map((d) => d.rounds));

  // Single nearest upcoming item: next Ekadashi (astronomical calendar) or next festival
  const ekadashi = useEkadashiCalendar();
  const nextEkRow = ekadashi.loading ? undefined : ekadashi.rows[ekadashi.nextIndex];
  const nextEkadasi =
    nextEkRow && nextEkRow.paranaDate >= ekadashi.todayKey
      ? {
          kind: 'ekadashi' as const,
          name: ekadashiName(nextEkRow.slug, ekadashi.content),
          date: nextEkRow.fastDate,
          effective: nextEkRow.fastDate < today ? today : nextEkRow.fastDate,
          to: `/ekadashi/${nextEkRow.slug}?date=${nextEkRow.fastDate}`,
          parana: paranaLabel(nextEkRow, ekadashi.location.tz),
          note: '',
        }
      : undefined;
  const nextFestival = (festivals || [])
    .filter((f) => f.date && f.date >= today && !/ekad/i.test(f.name))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const festivalItem = nextFestival
    ? {
        kind: 'festival' as const,
        name: nextFestival.name,
        date: nextFestival.date,
        effective: nextFestival.date,
        to: `/festival/${nextFestival.id}`,
        parana: null as ReturnType<typeof paranaLabel>,
        note: nextFestival.shortDescription || '',
      }
    : undefined;
  const nextItem =
    nextEkadasi && festivalItem
      ? festivalItem.effective < nextEkadasi.effective
        ? festivalItem
        : nextEkadasi
      : nextEkadasi || festivalItem;
  const upcomingLoading = !nextItem && (ekadashi.loading || (!isGuest && festivals === null));

  /* ------------------------------- greeting ------------------------------- */

  const hour = new Date().getHours();
  const timeGreeting = hour < 4 ? 'Brahma muhurta' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const nudge =
    goal && roundsToday >= goal
      ? 'You reached your japa goal today. All glories to your sadhana!'
      : hour < 7
        ? 'The early morning is the best time to chant.'
        : roundsToday > 0
          ? goal
            ? `${remaining} more to reach your goal - keep going.`
            : 'Lovely chanting today - every round counts.'
          : hour < 12
            ? 'Begin your day with the holy names.'
            : hour < 20
              ? 'There is still time today to complete your rounds.'
              : 'End the day peacefully - chant a little before rest.';
  const name = userSettings?.userName || user?.displayName || 'Devotee';
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // wait for everything on the page (incl. the upcoming Ekadashi / festival) before painting
  if (loading || ekadashi.loading || (!isGuest && festivals === null)) return <PageLoader label="Preparing your day…" />;

  const formatCountdown = (key: string, kind: 'ekadashi' | 'festival') => {
    const d = daysUntil(key);
    if (d < 0) return kind === 'ekadashi' ? 'Break your fast today' : 'Today';
    return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`;
  };
  const formatDate = (key: string) =>
    parseDateKey(key).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const quickLinks = [
    { to: '/planner', label: 'Planner', icon: <PenLine size={18} /> },
    { to: '/chanting', label: 'Chanting', icon: <MalaIcon size={18} /> },
    { to: '/slokas', label: 'Slokas', icon: <BookOpen size={18} /> },
    { to: '/festivals', label: 'Calendar', icon: <CalendarDays size={18} /> },
  ];

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">
      {/* 1. Greeting */}
      <section className="relative animate-rise-in overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 text-maroon-900 shadow-soft ring-1 ring-amber-200/70">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[50%] object-cover object-[45%_20%] opacity-80 [mask-image:linear-gradient(to_right,transparent,black_70%)] sm:w-[42%] sm:opacity-100"
        />
        <div className="relative p-5 sm:p-7">
          <div className="max-w-[62%] sm:max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700/80">{dateLabel}</p>
            <h1 className="mt-2 break-words text-2xl font-semibold leading-tight sm:text-[28px]">
              {timeGreeting}, {name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-maroon-900/65">{nudge}</p>
          </div>
          <button
            onClick={() => navigate('/planner')}
            className="btn-primary mt-5 h-11 rounded-xl px-5 transition active:scale-[0.98]"
          >
            <PenLine size={16} /> Log today's sadhana
          </button>
        </div>
      </section>

      {/* 2. Today's japa — compact */}
      <section className="animate-rise-in rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#fef3c7" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#f97316"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${goal > 0 ? Math.min(roundsToday / goal, 1) * 97.4 : roundsToday > 0 ? 97.4 : 0} 97.4`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-lg font-semibold tabular-nums text-maroon-900">{roundsToday}</span>
              {goal > 0 && <span className="text-[9px] font-medium text-maroon-900/45">/ {goal}</span>}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-maroon-900">Today's japa</h2>
              {streak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-maroon-900/60">
                  <Flame size={13} className="text-brand-600" /> {streak}d
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-maroon-900/55">
              {goal > 0
                ? roundsToday >= goal
                  ? `Goal of ${goal} reached`
                  : `${remaining} more to your goal`
                : `${roundsToday} round${roundsToday === 1 ? '' : 's'} today`}
            </p>
            <div className="mt-2 flex items-end gap-1" aria-label="Rounds in the last 7 days">
              {week.map((d) => (
                <div key={d.key} className="flex h-5 flex-1 items-end" title={`${d.label}: ${d.rounds} rounds`}>
                  <div
                    className={`w-full rounded-sm transition-all duration-700 ${d.isToday ? 'bg-brand-500' : 'bg-amber-200'}`}
                    style={{ height: `${Math.max((d.rounds / weekMax) * 100, d.rounds > 0 ? 15 : 10)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/chanting')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow transition active:scale-95"
            aria-label={roundsToday > 0 ? 'Continue chanting' : 'Start chanting'}
            style={{ minHeight: 0 }}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 3. Next upcoming (single item) */}
      {upcomingLoading ? (
        <div className="skeleton h-28 rounded-3xl" />
      ) : nextItem ? (
        <Link
          to={nextItem.to}
          className="group block animate-rise-in rounded-3xl bg-white p-5 shadow-soft ring-1 ring-sandal-200 transition hover:-translate-y-0.5 hover:ring-brand-300 sm:p-6"
          style={{ minHeight: 0 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700/80">
            Coming up · {nextItem.kind === 'ekadashi' ? 'Ekadashi' : 'Festival'}
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words text-xl font-semibold leading-snug text-maroon-900">{nextItem.name}</h2>
            <ChevronRight size={20} className="mt-1 shrink-0 text-maroon-900/35 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
          </div>
          <p className="mt-1 text-sm text-maroon-900/65">
            <span className="font-semibold text-brand-700">{formatCountdown(nextItem.date, nextItem.kind)}</span>
            <span className="mx-1.5 text-maroon-900/30">·</span>
            {formatDate(nextItem.date)}
          </p>
          {nextItem.parana && (
            <p className="mt-2 break-words text-xs text-maroon-900/55">
              Break fast: {nextItem.parana.start}
              {nextItem.parana.end ? ` - ${nextItem.parana.end}` : ''}
            </p>
          )}
          {nextItem.note && <p className="mt-2 line-clamp-2 break-words text-sm text-maroon-900/60">{nextItem.note}</p>}
        </Link>
      ) : (
        <p className="animate-rise-in rounded-2xl bg-sandal-50 px-4 py-3 text-sm text-maroon-900/55 ring-1 ring-sandal-200">
          No upcoming dates yet.
        </p>
      )}

      {/* 4. Quick actions */}
      <section className="animate-rise-in grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-maroon-900 shadow-soft ring-1 ring-sandal-200 transition hover:ring-brand-300 active:scale-[0.98]"
            style={{ minHeight: 0 }}
          >
            <span className="text-brand-600">{q.icon}</span>
            {q.label}
          </Link>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
