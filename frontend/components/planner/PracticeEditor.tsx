import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Eraser, Check } from 'lucide-react';
import { DailyMetrics } from '../../types';
import { PracticeRow, isFilled, duration as fmtDuration } from './weekCard';
import { parseDateKey } from '../../utils/date';
import { TimeWheels, DurationWheels, NumberWheel } from './Wheel';

interface Props {
  row: PracticeRow;
  dateKey: string;
  metrics: DailyMetrics;
  onSet: (key: keyof DailyMetrics, value: unknown) => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

/** Where a wheel starts when the box is still empty */
const TIME_START: Partial<Record<keyof DailyMetrics, string>> = { wakeUpTime: '05:00', sleepTime: '22:00' };
const DURATION_START: Partial<Record<keyof DailyMetrics, number>> = { exerciseMinutes: 30, daySleepMinutes: 30, phoneUsage: 60, readingMinutes: 30 };
const FINISH_START = '07:00';
const ROUNDS_START = 4;

interface Draft {
  time: string; // time practices
  minutes: number; // duration practices
  rounds: number; // japa
  finish: string; // japa finishing time ('' = not set)
}

const initialDraft = (row: PracticeRow, m: DailyMetrics): Draft => ({
  time: ((m[row.key] as string) || TIME_START[row.key] || '05:00') as string,
  minutes: isFilled(row, m) ? Number(m[row.key]) || 0 : DURATION_START[row.key] ?? 30,
  rounds: (Number(m.chantingRounds) || 0) > 0 ? Number(m.chantingRounds) : ROUNDS_START,
  finish: m.chantingTime || '',
});

/** Bottom sheet (phone) / dialog (computer) for filling one practice on one day. */
const PracticeEditor: React.FC<Props> = ({ row, dateKey, metrics: m, onSet, onClose, onPrev, onNext }) => {
  const panel = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(row, m));
  const [tab, setTab] = useState<'rounds' | 'finish'>('rounds');
  const touched = useRef(false);

  const change = (patch: Partial<Draft>) => {
    touched.current = true;
    setDraft((d) => ({ ...d, ...patch }));
  };

  /** Writes the chosen values. `force` also saves a box the person never scrolled. */
  const commit = (force: boolean) => {
    if (!force && !touched.current) return;
    if (row.kind === 'time') onSet(row.key, draft.time);
    else if (row.kind === 'duration') onSet(row.key, draft.minutes);
    else if (row.kind === 'rounds') {
      onSet('chantingRounds', draft.rounds);
      if (draft.finish && (touched.current || force)) onSet('chantingTime', draft.finish);
    }
    touched.current = false;
  };

  const closeSaving = () => {
    commit(false);
    onClose();
  };
  const goPrev = onPrev && (() => (commit(false), onPrev()));
  const goNext = onNext && (() => (commit(false), onNext()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSaving();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    panel.current?.focus();
  }, []);

  const dayLabel = parseDateKey(dateKey).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  const filled = isFilled(row, m);

  const clear = () => {
    if (row.kind === 'rounds') {
      onSet('chantingRounds', 0);
      onSet('chantingTime', undefined);
    } else if (row.key === 'phoneUsage') onSet('phoneUsage', 0);
    else if (row.kind === 'text') onSet(row.key, '');
    else if (row.key === 'wakeUpTime' || row.key === 'sleepTime') onSet(row.key, '');
    else onSet(row.key, undefined);
    touched.current = false;
    onClose();
  };

  let body: React.ReactNode = null;

  if (row.kind === 'time') {
    body = <TimeWheels value={draft.time} onChange={(v) => change({ time: v })} />;
  }

  if (row.kind === 'duration') {
    body = (
      <>
        <DurationWheels value={draft.minutes} onChange={(v) => change({ minutes: v })} />
        {row.allowNone && <p className="mt-2 text-center text-sm font-medium text-maroon-900/50">{draft.minutes === 0 ? 'None — no day sleep' : fmtDuration(draft.minutes)}</p>}
      </>
    );
  }

  if (row.kind === 'rounds') {
    body = (
      <>
        <div className="mx-auto mb-3 grid w-full max-w-[280px] grid-cols-2 rounded-2xl bg-sandal-100 p-1">
          {(
            [
              { id: 'rounds', label: 'Rounds' },
              { id: 'finish', label: 'Finished at' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl py-1.5 text-sm font-semibold transition ${tab === t.id ? 'bg-white text-maroon-900 shadow-sm' : 'text-maroon-900/50'}`}
              style={{ minHeight: 0 }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'rounds' ? (
          <NumberWheel value={draft.rounds} onChange={(v) => change({ rounds: v })} />
        ) : (
          <>
            <TimeWheels value={draft.finish || FINISH_START} onChange={(v) => change({ finish: v })} />
            <p className="mt-2 text-center text-xs text-maroon-900/45">Optional — when you finished chanting</p>
          </>
        )}
      </>
    );
  }

  if (row.kind === 'yesno') {
    const v = m.classAttended || '';
    body = (
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { val: 'yes', text: 'Attended', on: 'bg-emerald-500 text-white ring-emerald-500' },
            { val: 'no', text: 'Missed', on: 'bg-rose-400 text-white ring-rose-400' },
          ] as const
        ).map((o) => (
          <button
            key={o.val}
            type="button"
            onClick={() => onSet('classAttended', v === o.val ? undefined : o.val)}
            className={`rounded-2xl py-5 text-base font-semibold ring-1 transition active:scale-[0.98] ${
              v === o.val ? o.on : 'bg-white text-maroon-900/70 ring-sandal-300 hover:ring-marigold-400'
            }`}
          >
            {o.text}
          </button>
        ))}
      </div>
    );
  }

  if (row.kind === 'text') {
    body = (
      <input
        type="text"
        value={String(m[row.key] ?? '')}
        autoFocus
        onChange={(e) => onSet(row.key, e.target.value)}
        placeholder="What service did you offer?"
        className="block w-full rounded-2xl border border-sandal-300/80 bg-white px-4 py-3.5 text-base text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20"
      />
    );
  }

  const wheelBased = row.kind === 'time' || row.kind === 'duration' || row.kind === 'rounds';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`${row.label}, ${dayLabel}`}>
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={closeSaving} />
      <div
        ref={panel}
        tabIndex={-1}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        className="relative w-full animate-rise-in rounded-t-[28px] bg-white p-5 shadow-[0_-12px_40px_-12px_rgba(67,27,17,0.25)] outline-none sm:max-w-sm sm:rounded-[28px] sm:p-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />

        {/* Header: practice + day navigator */}
        <div className="mb-4 flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${row.tone}`}>
            <row.Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-maroon-900">{row.label}</h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={goPrev} disabled={!goPrev} className="-ml-1 flex h-6 w-6 items-center justify-center rounded-md text-maroon-900/50 hover:bg-sandal-100 disabled:opacity-25" aria-label="Previous day" style={{ minHeight: 0 }}>
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-medium text-maroon-900/55">{dayLabel}</span>
              <button type="button" onClick={goNext} disabled={!goNext} className="flex h-6 w-6 items-center justify-center rounded-md text-maroon-900/50 hover:bg-sandal-100 disabled:opacity-25" aria-label="Next day" style={{ minHeight: 0 }}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <button type="button" onClick={closeSaving} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {body}

        <div className="mt-5 flex items-center gap-2">
          <button type="button" onClick={clear} disabled={!filled} className="btn-ghost btn-sm disabled:opacity-30">
            <Eraser size={15} /> Clear
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => {
              commit(wheelBased);
              onClose();
            }}
            className="btn-primary btn-sm px-6"
          >
            <Check size={15} /> Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PracticeEditor;
