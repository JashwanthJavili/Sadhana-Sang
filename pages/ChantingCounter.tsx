import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Undo2, Maximize2, X, Settings2, Minus, Plus, RotateCcw, Vibrate, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ChantingSession, loadSessions, saveSession } from '../services/japa';
import { localDateKey, parseDateKey, daysUntil } from '../utils/date';
import { JAPA_SETTINGS_KEY } from '../utils/japaGoal';

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

interface Live {
  beads: number;
  rounds: number;
  laps: number[]; // seconds per finished round
  startedAt: number | null;
  roundStartedAt: number | null;
}

interface JapaSettings {
  goal: number; // 0 = no goal
  perRound: number;
  vibrate: boolean;
  sound: boolean;
}

const EMPTY: Live = { beads: 0, rounds: 0, laps: [], startedAt: null, roundStartedAt: null };
const DEFAULT_SETTINGS: JapaSettings = { goal: 0, perRound: 108, vibrate: true, sound: true };
const SETTINGS_KEY = JAPA_SETTINGS_KEY;

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked */
  }
};

const mins = (sec: number) => {
  const m = Math.max(1, Math.round(sec / 60));
  return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
};

/* -------------------------------------------------------------------------- */
/* Bell + vibration                                                            */
/* -------------------------------------------------------------------------- */

let audioCtx: AudioContext | null = null;
const playBell = () => {
  try {
    audioCtx ||= new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    [
      [523, 0.35, 1.8],
      [659, 0.22, 1.6],
      [784, 0.16, 1.4],
    ].forEach(([freq, vol, dur]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now);
      o.stop(now + dur);
    });
  } catch {
    /* no audio */
  }
};

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
};

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-gradient-to-r from-marigold-400 to-brand-500' : 'bg-sandal-300'}`}
    style={{ minHeight: 0 }}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${on ? 'left-6' : 'left-1'}`} />
  </button>
);

const MiniStepper: React.FC<{ value: number; onChange: (v: number) => void; max: number }> = ({ value, onChange, max }) => (
  <div className="inline-flex items-center gap-1.5">
    {[
      { d: -1, Icon: Minus, label: 'Decrease', off: value <= 0 },
      { d: 1, Icon: Plus, label: 'Increase', off: value >= max },
    ].map(({ d, Icon, label, off }, i) => (
      <React.Fragment key={label}>
        {i === 1 && <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums text-maroon-900">{value}</span>}
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Math.max(0, value + d)))}
          disabled={off}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-maroon-800 ring-1 ring-sandal-300 transition active:scale-95 disabled:opacity-40"
          aria-label={label}
          style={{ minHeight: 0 }}
        >
          <Icon size={15} />
        </button>
      </React.Fragment>
    ))}
  </div>
);

/** Simple round tap target with a thin progress line around it */
const TapCircle: React.FC<{ value: number; total: number; className?: string; children: React.ReactNode }> = ({ value, total, className = '', children }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative aspect-square ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="3" className="stroke-amber-100" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / total)}
          className="stroke-brand-500 transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-white to-amber-50 text-center shadow-[0_10px_30px_-12px_rgba(238,154,30,0.55)] ring-1 ring-amber-100">
        {children}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function ChantingCounter() {
  const { user } = useAuth();
  const { showSuccess, showWarning } = useToast();
  const uid = user?.uid || 'guest';
  const liveKey = `ss_japa_live_${uid}`;

  const [settings, setSettings] = useState<JapaSettings>(() => readJSON(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [live, setLiveState] = useState<Live>(() => readJSON(liveKey, EMPTY));
  const liveRef = useRef(live);
  const [sessions, setSessions] = useState<ChantingSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const savedTodayRef = useRef(0);
  const flushingRef = useRef(false);
  const [focus, setFocus] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pulse, setPulse] = useState(0);

  const setLive = useCallback(
    (next: Live) => {
      liveRef.current = next;
      setLiveState(next);
      writeJSON(liveKey, next);
    },
    [liveKey]
  );

  const updateSettings = (patch: Partial<JapaSettings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeJSON(SETTINGS_KEY, next);
      return next;
    });

  useEffect(() => {
    setSessionsLoaded(false);
    loadSessions(uid).then((s) => {
      setSessions(s);
      setSessionsLoaded(true);
    });
  }, [uid]);

  // Restore the in-progress count (bead + round) whenever the page/user changes
  useEffect(() => {
    const saved = readJSON(liveKey, EMPTY);
    liveRef.current = saved;
    setLiveState(saved);
  }, [liveKey]);

  // Keep the screen awake in full-screen mode
  useEffect(() => {
    if (!focus) return;
    let lock: any = null;
    let done = false;
    (async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
        if (done) lock?.release?.();
      } catch {
        /* not supported */
      }
    })();
    return () => {
      done = true;
      lock?.release?.();
    };
  }, [focus]);

  /* ----------------------------- counting ----------------------------- */

  const count = useCallback(() => {
    const now = Date.now();
    let l = { ...liveRef.current };
    if (!l.startedAt) l = { ...l, startedAt: now, roundStartedAt: now };

    if (l.beads + 1 >= settings.perRound) {
      const rounds = l.rounds + 1;
      l = { ...l, beads: 0, rounds, laps: [...l.laps, (now - (l.roundStartedAt || now)) / 1000], roundStartedAt: now };
      if (settings.sound) playBell();
      if (settings.vibrate) buzz([140, 70, 140]);
      if (settings.goal && savedTodayRef.current + rounds === settings.goal) showSuccess('Goal reached!', 'Hare Krishna');
    } else {
      l = { ...l, beads: l.beads + 1 };
      if (settings.vibrate) buzz(18);
    }
    setLive(l);
    setPulse((p) => p + 1);
  }, [settings, setLive, showSuccess]);

  const undo = useCallback(() => {
    const l = liveRef.current;
    if (l.beads > 0) setLive({ ...l, beads: l.beads - 1 });
    else if (l.rounds > 0) setLive({ ...l, rounds: l.rounds - 1, beads: settings.perRound - 1, laps: l.laps.slice(0, -1) });
  }, [settings.perRound, setLive]);

  const reset = () => {
    setLive(EMPTY);
    setConfirmReset(false);
    setShowSettings(false);
  };

  // Keyboard: Space to count, Backspace to undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (showSettings || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) count();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
      } else if (e.key === 'Escape') setFocus(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, undo, showSettings]);

  /* ----------------------------- auto-save ----------------------------- */

  const today = localDateKey();
  const savedToday = useMemo(
    () => sessions.filter((s) => localDateKey(new Date(s.timestamp)) === today).reduce((a, s) => a + (Number(s.rounds) || 0), 0),
    [sessions, today]
  );
  savedTodayRef.current = savedToday;

  // live.rounds = finished rounds not yet saved. Each completed round is saved
  // automatically; if offline they stay pending here and are retried.
  const flush = useCallback(async () => {
    const l = liveRef.current;
    if (flushingRef.current || !sessionsLoaded || l.rounds <= 0) return;
    flushingRef.current = true;
    const rounds = l.rounds;
    const laps = l.laps.slice(0, rounds);
    try {
      const started = l.startedAt || Date.now();
      const session = await saveSession(
        uid,
        { rounds, beads: 0, beadsPerRound: settings.perRound, startedAt: started, durationSec: laps.reduce((a, s) => a + s, 0), laps },
        savedTodayRef.current
      );
      setSessions((s) => [session, ...s]);
      const cur = liveRef.current;
      const pending = Math.max(cur.rounds - rounds, 0);
      setLive({ ...cur, rounds: pending, laps: cur.laps.slice(rounds), startedAt: pending ? cur.startedAt : cur.roundStartedAt });
    } catch (e) {
      console.error(e);
      showWarning('Could not save round', 'It is kept on this phone and will be saved when you are back online.');
    } finally {
      flushingRef.current = false;
    }
  }, [uid, sessionsLoaded, settings.perRound, setLive, showWarning]);

  useEffect(() => {
    if (live.rounds > 0) flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [live.rounds, flush]);

  /* ----------------------------- derived ----------------------------- */

  const goal = settings.goal;
  const todayTotal = savedToday + live.rounds;
  const hasCount = live.rounds > 0 || live.beads > 0;
  const left = Math.max(goal - todayTotal, 0);

  const dayName = (ts: number) => {
    const off = daysUntil(localDateKey(new Date(ts)));
    return off === 0 ? 'Today' : off === -1 ? 'Yesterday' : parseDateKey(localDateKey(new Date(ts))).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderCount = (big?: boolean) => (
    <>
      <span key={pulse} className={`font-semibold leading-none tabular-nums text-maroon-900 animate-[japaPop_160ms_ease-out] ${big ? 'text-8xl' : 'text-6xl'}`}>
        {live.beads}
      </span>
      <span className="mt-1.5 text-xs font-medium text-maroon-900/50">
        of {settings.perRound} · Round {todayTotal + 1}
      </span>
    </>
  );

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="mx-auto max-w-md space-y-4">
      <style>{`@keyframes japaPop { 0% { transform: scale(0.9); opacity: .6 } 100% { transform: scale(1); opacity: 1 } }`}</style>

      {/* Today */}
      <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-maroon-900">Today</p>
          <p className="text-sm text-maroon-900/60">
            <span className="text-lg font-semibold text-brand-600">{todayTotal}</span> round{todayTotal === 1 ? '' : 's'}
            {goal > 0 && <span> of {goal}</span>}
          </p>
        </div>
        {goal > 0 && (
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sandal-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-marigold-400 to-brand-500 transition-all duration-500"
              style={{ width: `${Math.min((todayTotal / goal) * 100, 100)}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-maroon-900/55">
          {goal > 0
            ? left
              ? `${left} more to reach your goal`
              : 'Goal reached — Hare Krishna'
            : todayTotal
              ? 'Every round is precious'
              : 'Even one round is a beautiful start'}
        </p>
      </div>

      {/* Counter */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-amber-50 via-white to-orange-50 p-4 sm:p-5 shadow-card ring-1 ring-amber-200/70">
        <div className="pointer-events-none absolute left-1/2 top-[38%] h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/40 blur-3xl" />

        <button
          type="button"
          onPointerDown={(e) => e.button === 0 && count()}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && e.preventDefault()}
          className="relative mx-auto block w-full max-w-[220px] select-none rounded-full outline-none transition-transform duration-100 [-webkit-tap-highlight-color:transparent] [touch-action:manipulation] focus-visible:ring-2 focus-visible:ring-marigold-400 active:scale-[0.98]"
          aria-label={`Count. ${live.beads} beads, round ${live.rounds + 1}`}
        >
          <TapCircle value={live.beads} total={settings.perRound}>
            {renderCount()}
          </TapCircle>
        </button>

        {/* Hint only before the first bead — then the controls take over */}
        {!hasCount && <p className="relative mt-3 text-center text-xs text-maroon-900/45">Tap the circle to start counting</p>}

        <div className={`relative flex items-center justify-center gap-2 ${hasCount ? 'mt-4' : 'mt-3'}`}>
          {hasCount && (
            <button
              type="button"
              onClick={undo}
              className="inline-flex h-11 animate-fadeIn items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-maroon-800 shadow-soft ring-1 ring-sandal-200 transition active:scale-95"
              style={{ minHeight: 0 }}
            >
              <Undo2 size={17} className="text-brand-500" /> Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setFocus(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-maroon-700 shadow-soft ring-1 ring-sandal-200 transition active:scale-95"
            aria-label="Full screen"
            title="Full screen"
            style={{ minHeight: 0 }}
          >
            <Maximize2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-maroon-700 shadow-soft ring-1 ring-sandal-200 transition active:scale-95"
            aria-label="Settings"
            title="Settings"
            style={{ minHeight: 0 }}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </section>

      {/* Recent */}
      {sessions.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200">
          <p className="mb-2 text-sm font-semibold text-maroon-900">Recent</p>
          <ul className="divide-y divide-sandal-200/70">
            {sessions.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-maroon-900/70">
                  {dayName(s.timestamp)} · {s.startTime}
                </span>
                <span className="font-semibold text-maroon-900">
                  {s.rounds} round{s.rounds === 1 ? '' : 's'}
                  {s.duration ? <span className="ml-1.5 font-normal text-maroon-900/45">({mins(s.duration)})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===================== Full screen ===================== */}
      {focus &&
        createPortal(
          <div
            className="fixed inset-0 z-[140] flex select-none flex-col bg-gradient-to-b from-amber-50 via-white to-orange-50 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
            onPointerDown={(e) => {
              if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-count]')) return;
              count();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Full screen — tap anywhere to count"
          >
            <div className="flex items-center justify-between px-5" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }} data-no-count>
              <span className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-maroon-900 shadow-soft ring-1 ring-sandal-200">
                {todayTotal} round{todayTotal === 1 ? '' : 's'} today
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={undo} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-maroon-800 shadow-soft ring-1 ring-sandal-200" aria-label="Undo" style={{ minHeight: 0 }}>
                  <Undo2 size={19} />
                </button>
                <button type="button" onClick={() => setFocus(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-maroon-800 shadow-soft ring-1 ring-sandal-200" aria-label="Close full screen" style={{ minHeight: 0 }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center px-6">
              <TapCircle value={live.beads} total={settings.perRound} className="w-full max-w-[min(80vw,55vh)]">
                {renderCount(true)}
              </TapCircle>
            </div>
            <p className="pb-8 text-center text-sm text-maroon-900/45">Tap anywhere to count</p>
          </div>,
          document.body
        )}

      {/* ===================== Settings ===================== */}
      {showSettings &&
        createPortal(
          <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Settings">
            <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={() => setShowSettings(false)} />
            <div
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              className="relative max-h-[90dvh] w-full animate-rise-in overflow-y-auto rounded-t-[28px] bg-white p-5 sm:max-w-sm sm:rounded-[28px] sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-maroon-900">Settings</h3>
                <button type="button" onClick={() => setShowSettings(false)} className="icon-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-maroon-900">Daily goal</p>
                  <p className="mb-2 text-xs text-maroon-900/50">Optional — choose what feels right for you</p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 4, 8, 16].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateSettings({ goal: n })}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${goal === n ? 'bg-brand-500 text-white' : 'bg-sandal-100 text-maroon-800/75'}`}
                        style={{ minHeight: 0 }}
                      >
                        {n === 0 ? 'No goal' : n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-maroon-900">Beads in one round</p>
                  <div className="flex gap-2">
                    {[27, 54, 108].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          updateSettings({ perRound: n });
                          if (liveRef.current.beads >= n) setLive({ ...liveRef.current, beads: n - 1 });
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${settings.perRound === n ? 'bg-brand-500 text-white' : 'bg-sandal-100 text-maroon-800/75'}`}
                        style={{ minHeight: 0 }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-sandal-50 p-4">
                  {[
                    { key: 'vibrate' as const, label: 'Vibrate', Icon: Vibrate },
                    { key: 'sound' as const, label: 'Bell after each round', Icon: Bell },
                  ].map(({ key, label, Icon }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-sm font-medium text-maroon-900/80">
                        <Icon size={16} className="text-brand-500" /> {label}
                      </span>
                      <Switch on={settings[key]} onChange={(v) => updateSettings({ [key]: v })} label={label} />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-2xl bg-sandal-50 p-4">
                  <p className="text-sm font-semibold text-maroon-900">Change the count</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-maroon-900/70">Rounds</span>
                    <MiniStepper value={live.rounds} max={200} onChange={(v) => setLive({ ...liveRef.current, rounds: v, laps: liveRef.current.laps.slice(0, v) })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-maroon-900/70">Beads</span>
                    <MiniStepper value={live.beads} max={settings.perRound - 1} onChange={(v) => setLive({ ...liveRef.current, beads: v })} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {confirmReset ? (
                    <>
                      <span className="flex-1 text-sm font-medium text-rose-700">Clear the count?</span>
                      <button type="button" onClick={() => setConfirmReset(false)} className="btn-ghost btn-sm">
                        No
                      </button>
                      <button type="button" onClick={reset} className="btn-sm inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 font-semibold text-white">
                        Yes, clear
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setConfirmReset(true)} disabled={!hasCount} className="btn-ghost btn-sm text-rose-600 disabled:opacity-30">
                        <RotateCcw size={14} /> Start again
                      </button>
                      <div className="flex-1" />
                      <button type="button" onClick={() => setShowSettings(false)} className="btn-primary btn-sm">
                        Done
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
