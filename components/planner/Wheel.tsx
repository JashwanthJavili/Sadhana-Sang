import React, { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Scroll-wheel pickers (time, duration, number) — scroll or tap to choose. */

const ITEM_H = 44;
const WHEEL_H = ITEM_H * 5;

export interface WheelOption {
  value: string;
  label: string;
}

export const Wheel: React.FC<{ options: WheelOption[]; value: string; onChange: (v: string) => void; label: string; width?: number }> = ({
  options,
  value,
  onChange,
  label,
  width = 72,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const startIdx = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(startIdx);
  const lastEmitted = useRef(value);
  const settle = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = startIdx * ITEM_H;
    // only on mount: after that the wheel itself is the source of truth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
    setActive(i);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const v = options[i].value;
      if (v !== lastEmitted.current) {
        lastEmitted.current = v;
        onChange(v);
      }
    }, 90);
  };

  return (
    <div className="relative" style={{ width }}>
      <div
        ref={ref}
        onScroll={onScroll}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            goTo(Math.min(options.length - 1, active + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            goTo(Math.max(0, active - 1));
          }
        }}
        className="scrollbar-none relative snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none"
        style={{ height: WHEEL_H, paddingBlock: (WHEEL_H - ITEM_H) / 2 }}
      >
        {options.map((o, i) => (
          <div
            key={o.value}
            role="option"
            aria-selected={i === active}
            onClick={() => goTo(i)}
            className={`flex cursor-pointer snap-center items-center justify-center tabular-nums transition-[color,font-size] duration-100 ${
              i === active ? 'text-[24px] font-semibold text-maroon-900' : Math.abs(i - active) === 1 ? 'text-[18px] text-maroon-900/45' : 'text-[16px] text-maroon-900/25'
            }`}
            style={{ height: ITEM_H }}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Lays wheels side by side with one shared highlight band across the chosen row */
const WheelGroup: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="relative flex items-center justify-center gap-1 px-1" style={{ height: WHEEL_H }}>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-1 rounded-2xl bg-amber-100/70 ring-1 ring-amber-300/60"
      style={{ top: (WHEEL_H - ITEM_H) / 2, height: ITEM_H }}
    />
    {children}
  </div>
);

const pad2 = (n: number) => String(n).padStart(2, '0');
const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

const HOURS = range(1, 12).map((h) => ({ value: String(h), label: String(h) }));
const MINUTES = range(0, 55, 5).map((m) => ({ value: String(m), label: pad2(m) }));
const AMPM = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

const parseTime = (v: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(v) ?? ['', '05', '00'];
  const h = Number(m[1]);
  const min = Math.min(55, Math.round(Number(m[2]) / 5) * 5);
  return { h12: h % 12 === 0 ? 12 : h % 12, min, period: h >= 12 ? 'PM' : 'AM' };
};
const toTime = (h12: number, min: number, period: string) => `${pad2((h12 % 12) + (period === 'PM' ? 12 : 0))}:${pad2(min)}`;

/** value / onChange use 24-hour "HH:MM" */
export const TimeWheels: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const t = parseTime(value);
  // latest composed value, so two wheels settling together do not overwrite each other
  const cur = useRef(t);
  const lastValue = useRef(value);
  if (value !== lastValue.current) {
    lastValue.current = value;
    cur.current = t;
  }
  const set = (patch: Partial<typeof t>) => {
    const n = { ...cur.current, ...patch };
    cur.current = n;
    const v = toTime(n.h12, n.min, n.period);
    lastValue.current = v;
    onChange(v);
  };
  return (
    <WheelGroup>
      <Wheel label="Hour" options={HOURS} value={String(t.h12)} onChange={(v) => set({ h12: Number(v) })} />
      <span className="relative pb-0.5 text-xl font-semibold text-maroon-900/40">:</span>
      <Wheel label="Minute" options={MINUTES} value={String(t.min)} onChange={(v) => set({ min: Number(v) })} />
      <Wheel label="AM or PM" options={AMPM} value={t.period} onChange={(v) => set({ period: v })} />
    </WheelGroup>
  );
};

const DUR_HOURS = range(0, 12).map((h) => ({ value: String(h), label: String(h) }));

/** value / onChange are total minutes */
export const DurationWheels: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const h = Math.min(12, Math.floor(value / 60));
  const m = Math.min(55, Math.round((value % 60) / 5) * 5);
  const cur = useRef({ h, m });
  const lastValue = useRef(value);
  if (value !== lastValue.current) {
    lastValue.current = value;
    cur.current = { h, m };
  }
  const set = (patch: Partial<{ h: number; m: number }>) => {
    cur.current = { ...cur.current, ...patch };
    const v = cur.current.h * 60 + cur.current.m;
    lastValue.current = v;
    onChange(v);
  };
  return (
    <WheelGroup>
      <Wheel label="Hours" options={DUR_HOURS} value={String(h)} onChange={(v) => set({ h: Number(v) })} />
      <span className="relative text-sm font-medium text-maroon-900/45">hr</span>
      <Wheel label="Minutes" options={MINUTES} value={String(m)} onChange={(v) => set({ m: Number(v) })} />
      <span className="relative pr-2 text-sm font-medium text-maroon-900/45">min</span>
    </WheelGroup>
  );
};

const ROUNDS = range(0, 64).map((r) => ({ value: String(r), label: String(r) }));

export const NumberWheel: React.FC<{ value: number; onChange: (v: number) => void; unit?: string }> = ({ value, onChange, unit = 'rounds' }) => (
  <WheelGroup>
    <Wheel label={unit} options={ROUNDS} value={String(Math.min(64, value))} onChange={(v) => onChange(Number(v))} />
    <span className="relative pr-2 text-sm font-medium text-maroon-900/45">{unit}</span>
  </WheelGroup>
);
