import { getJapaGoal } from '../utils/japaGoal';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { PenLine, ChevronRight, Trophy, CalendarDays, Moon, ArrowRight } from 'lucide-react';
import { useEkadashiCalendar } from '../components/ekadashi/useEkadashiCalendar';
import { ekadashiName } from '../components/ekadashi/shared';
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
}

interface DashboardData {
  entries: DailyEntry[];
  sessions: ChantingSession[];
  stats: ChantingStats | null;
  festivals: Festival[] | null;
}

/** Keeps the last loaded data so returning to Home renders instantly */
const cache = new Map<string, DashboardData>();

const safeGet = async (path: string) => {
  try {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* -------------------------------------------------------------------------- */

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <section
    className={`rounded-3xl bg-white/90 p-5 shadow-[0_1px_2px_rgba(67,27,17,0.04),0_8px_24px_-12px_rgba(67,27,17,0.12)] ring-1 ring-sandal-200 sm:p-6 ${className}`}
  >
    {children}
  </section>
);

const CardTitle: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-maroon-900">
      <span className="text-brand-600">{icon}</span>
      {title}
    </h2>
    {action}
  </div>
);

const TextLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700 transition hover:text-brand-800" style={{ minHeight: 0 }}>
    {children}
    <ChevronRight size={14} />
  </Link>
);

const EmptyHint: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-sandal-50 p-4 ring-1 ring-sandal-200">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-maroon-900/40 shadow-sm">{icon}</span>
    <p className="text-sm text-maroon-900/55">{text}</p>
  </div>
);

/** Circular progress ring (white-on-dark variant for the japa card) */
const Ring: React.FC<{ value: number; max: number; size?: number }> = ({ value, max, size = 120 }) => {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="japaRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(246,178,62,0.18)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#japaRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold leading-none text-maroon-900">{value}</span>
        <span className="mt-1 text-xs font-medium text-maroon-900/50">of {max}</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { userSettings } = useUserData();
  const navigate = useNavigate();
  const isGuest = user?.uid === 'guest';

  const cached = user ? cache.get(user.uid) : undefined;
  const [data, setData] = useState<DashboardData>(
    cached || { entries: [], sessions: [], stats: null, festivals: null }
  );
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const uid = user.uid;

    const update = (patch: Partial<DashboardData>) => {
      if (cancelled) return;
      setData((prev) => {
        const next = { ...prev, ...patch };
        cache.set(uid, next);
        return next;
      });
    };

    const load = async () => {
      // 1) Personal data — needed for the first paint
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

      // 2) Shared calendar — loads in the background
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

  const bestStreak = useMemo(() => {
    let best = 0;
    let run = 0;
    let prev = '';
    [...practicedDays].sort().forEach((d) => {
      run = prev && shiftDateKey(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    return Math.max(best, streak);
  }, [practicedDays, streak]);

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
  const weekTotal = week.reduce((a, d) => a + d.rounds, 0);
  const weekMax = Math.max(goal, 1, ...week.map((d) => d.rounds));

  const upcoming = useMemo(
    () => (festivals || []).filter((f) => f.date && daysUntil(f.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)),
    [festivals]
  );
  const nextFestivals = upcoming.filter((f) => !/ekad/i.test(f.name)).slice(0, 3);

  // Next Ekadashi comes from the astronomical calendar (no admin data needed)
  const ekadashi = useEkadashiCalendar();
  const nextEkRow = ekadashi.loading ? undefined : ekadashi.rows[ekadashi.nextIndex];
  const nextEkadasi =
    nextEkRow && nextEkRow.paranaDate >= ekadashi.todayKey
      ? {
          name: ekadashiName(nextEkRow.slug, ekadashi.content),
          date: nextEkRow.fastDate,
          to: `/ekadashi/${nextEkRow.slug}?date=${nextEkRow.fastDate}`,
        }
      : undefined;

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
            ? `${remaining} more to reach your goal — keep going.`
            : 'Lovely chanting today — every round counts.'
          : hour < 12
            ? 'Begin your day with the holy names.'
            : hour < 20
              ? 'There is still time today to complete your rounds.'
              : 'End the day peacefully — chant a little before rest.';
  const name = userSettings?.userName || user?.displayName || 'Devotee';
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) return <PageLoader label="Preparing your day…" />;

  const formatCountdown = (key: string) => {
    const d = daysUntil(key);
    return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`;
  };
  const formatDate = (key: string) => parseDateKey(key).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ===================== Hero + Japa ===================== */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <section className="relative min-h-[230px] overflow-hidden rounded-3xl bg-sandal-50 ring-1 ring-sandal-200 lg:col-span-2">
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-[45%_20%] opacity-90 [mask-image:linear-gradient(to_right,transparent_5%,black_80%)] sm:w-[58%] sm:opacity-100 sm:[mask-image:linear-gradient(to_right,transparent,black_55%)]"
          />
          <div className="relative flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
            <div className="max-w-[13.5rem] sm:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700/80">{dateLabel}</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-maroon-900 sm:text-[28px]">
                {timeGreeting},
                <br />
                {name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-maroon-900/65">{nudge}</p>
            </div>
            <div>
              <button onClick={() => navigate('/planner')} className="btn-primary rounded-2xl px-5 py-3">
                <PenLine size={16} /> Log today's sadhana
              </button>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 text-maroon-900 shadow-[0_1px_2px_rgba(67,27,17,0.04),0_8px_24px_-12px_rgba(67,27,17,0.12)] ring-1 ring-amber-200/70 sm:p-7">
          <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-marigold-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-maroon-900">
              <span className="text-brand-600"><MalaIcon size={18} /></span> Today's japa
            </h2>
            {goal > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                {roundsToday >= goal ? 'Goal reached' : `${remaining} to go`}
              </span>
            )}
          </div>
          <div className="relative mt-5 flex items-center gap-5">
            <Ring value={roundsToday} max={goal || Math.max(roundsToday, 1)} />
            <div className="min-w-0">
              <p className="text-sm text-maroon-900/60">{goal ? `Your goal: ${goal} rounds` : 'Chanted today'}</p>
              <p className="text-2xl font-semibold leading-tight">
                {roundsToday} round{roundsToday === 1 ? '' : 's'}
              </p>
              {roundsToday > 0 && <p className="mt-1 text-xs text-maroon-900/45">{(roundsToday * 108).toLocaleString('en-IN')} holy names</p>}
            </div>
          </div>
          <button
            onClick={() => navigate('/chanting')}
            className="btn-primary relative mt-6 w-full rounded-2xl py-3"
          >
            {roundsToday > 0 ? 'Continue chanting' : 'Start chanting'} <ArrowRight size={16} />
          </button>
        </section>
      </div>

      {/* ===================== Consistency + Upcoming ===================== */}
      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardTitle icon={<Trophy size={17} />} title="Consistency" />
          <div className="flex items-end gap-6">
            <div>
              <p className="text-4xl font-semibold leading-none text-maroon-900">
                {streak}
                <span className="ml-1.5 text-base font-medium text-maroon-900/45">{streak === 1 ? 'day' : 'days'}</span>
              </p>
              <p className="mt-1.5 text-xs text-maroon-900/50">Current streak</p>
            </div>
            <div className="pb-0.5">
              <p className="text-lg font-semibold leading-none text-maroon-900/80">{bestStreak}</p>
              <p className="mt-1.5 text-xs text-maroon-900/50">Best</p>
            </div>
          </div>

          <div className="mt-5 flex flex-1 flex-col justify-end">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-maroon-900/40">This week</p>
              <p className="text-xs text-maroon-900/50">{weekTotal} rounds</p>
            </div>
            <div className="relative flex h-20 items-end gap-2">
              {goal > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 border-t border-dashed border-brand-300"
                  style={{ bottom: `${(goal / weekMax) * 100}%` }}
                />
              )}
              {week.map((d) => (
                <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end" title={`${d.rounds} rounds`}>
                  <div
                    className={`w-full max-w-[26px] rounded-lg transition-all duration-700 ${
                      d.rounds > 0 && d.rounds >= (goal || 1)
                        ? 'bg-gradient-to-t from-brand-600 to-marigold-400'
                        : d.rounds > 0
                          ? 'bg-marigold-400/60'
                          : 'bg-sandal-200'
                    }`}
                    style={{ height: `${Math.max((d.rounds / weekMax) * 100, 5)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {week.map((d) => (
                <span key={d.key} className={`flex-1 text-center text-[11px] font-medium ${d.isToday ? 'text-brand-700' : 'text-maroon-900/40'}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<CalendarDays size={17} />} title="Upcoming" action={<TextLink to="/festivals">Calendar</TextLink>} />
          {ekadashi.loading && (isGuest || festivals === null) ? (
            <div className="space-y-3">
              <div className="skeleton h-[72px] rounded-2xl" />
              <div className="skeleton h-10 rounded-xl" />
              <div className="skeleton h-10 rounded-xl" />
            </div>
          ) : !nextEkadasi && nextFestivals.length === 0 ? (
            <EmptyHint icon={<Moon size={18} />} text="No upcoming dates added yet." />
          ) : (
            <div className="space-y-3">
              {nextEkadasi && (
                <Link
                  to={nextEkadasi.to}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-3.5 ring-1 ring-indigo-100 transition hover:ring-indigo-200"
                  style={{ minHeight: 0 }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                    <Moon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600/80">Next Ekadasi</span>
                    <span className="block truncate text-sm font-semibold text-maroon-900">{nextEkadasi.name}</span>
                    <span className="block text-xs text-maroon-900/50">{formatDate(nextEkadasi.date)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                    {formatCountdown(nextEkadasi.date)}
                  </span>
                </Link>
              )}
              <ul className="space-y-1">
                {nextFestivals.map((f) => (
                  <li key={f.id}>
                    <Link to={`/festival/${f.id}`} className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-sandal-100/60" style={{ minHeight: 0 }}>
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-sandal-100 py-1 leading-none">
                        <span className="text-[10px] font-semibold uppercase text-brand-700">
                          {parseDateKey(f.date).toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <span className="mt-0.5 text-base font-semibold text-maroon-900">{parseDateKey(f.date).getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-maroon-900">{f.name}</span>
                        <span className="block text-xs text-maroon-900/45">{formatCountdown(f.date)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;
