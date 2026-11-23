import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, ChevronDown, MapPin, Moon, UtensilsCrossed, Info } from 'lucide-react';
import { useEkadashiCalendar } from './useEkadashiCalendar';
import LocationPicker from './LocationPicker';
import { ekadashiName } from './shared';
import { FASTING_GUIDELINES } from '../../utils/ekadashi/guidelines';
import { formatDateKey } from '../../utils/ekadashi/timezone';
import { paranaLabel } from '../../utils/ekadashi/merge';
import type { DisplayEkadashi } from '../../utils/ekadashi/types';

/* ------------------------------------------------------------ helpers --- */

/** Whole days between two YYYY-MM-DD keys */
const dayDiff = (from: string, to: string) => {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
};

const whenText = (days: number) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 1 ? `In ${days} days` : `${-days} days ago`);

const breakFastText = (row: DisplayEkadashi, tz: string) => {
  const p = paranaLabel(row, tz);
  if (!p) return 'Time not available — please ask your temple';
  return p.end ? `${p.start.toLowerCase()} – ${p.end.toLowerCase()}` : `after ${p.start.toLowerCase()}`;
};

/** Only show a note when the date is not from an official calendar */
const needsCheck = (row: DisplayEkadashi) => row.status === 'calculated' || row.status === 'disputed';

/* ------------------------------------------------------- Month calendar --- */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MonthCalendar: React.FC<{
  month: string; // YYYY-MM
  rows: DisplayEkadashi[];
  todayKey: string;
  selectedKey?: string;
  onSelect: (row: DisplayEkadashi) => void;
}> = ({ month, rows, todayKey, selectedKey, onSelect }) => {
  const [y, m] = month.split('-').map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fastMap = new Map(rows.map((r) => [r.fastDate, r]));
  const breakMap = new Map(rows.map((r) => [r.paranaDate, r]));
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5 text-[11px] font-semibold text-maroon-900/40">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = `${month}-${String(d).padStart(2, '0')}`;
          const fast = fastMap.get(key);
          const brk = breakMap.get(key);
          const isToday = key === todayKey;
          const base = 'flex aspect-square items-center justify-center rounded-xl text-sm transition';
          if (fast) {
            return (
              <button
                key={key}
                onClick={() => onSelect(fast)}
                title="Fasting day"
                className={`${base} bg-gradient-to-br from-marigold-400 to-brand-500 font-semibold text-white shadow-sm hover:brightness-105 ${
                  fast.key === selectedKey ? 'ring-2 ring-brand-300 ring-offset-2' : ''
                }`}
              >
                {d}
              </button>
            );
          }
          return (
            <div
              key={key}
              title={brk ? 'Break the fast' : undefined}
              className={`${base} ${brk ? 'bg-emerald-100 font-medium text-emerald-800' : 'text-maroon-900/70'} ${isToday ? 'font-semibold ring-2 ring-sky-300' : ''}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-maroon-900/60">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gradient-to-br from-marigold-400 to-brand-500" /> Fasting day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Break the fast
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-2 ring-sky-300" /> Today
        </span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------- Section --- */

const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

const EkadashiSection: React.FC = () => {
  const navigate = useNavigate();
  const cal = useEkadashiCalendar();
  const { location, rows, content, loading, todayKey, nextIndex } = cal;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  useEffect(() => setSelectedIdx(null), [location]);

  const idx = selectedIdx ?? nextIndex;
  const current = rows[idx];
  const names = (slug: string) => ekadashiName(slug, content);

  useEffect(() => {
    if (current) setMonth(current.fastDate.slice(0, 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key]);

  const upcoming = useMemo(() => rows.slice(Math.max(nextIndex, 0), nextIndex + 6), [rows, nextIndex]);
  const minMonth = rows[0]?.fastDate.slice(0, 7);
  const maxMonth = rows[rows.length - 1]?.fastDate.slice(0, 7);

  const select = (row: DisplayEkadashi) => {
    const i = rows.findIndex((r) => r.key === row.key);
    if (i >= 0) setSelectedIdx(i);
    document.getElementById('ekadashi-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openStory = (row: DisplayEkadashi) => navigate(`/ekadashi/${row.slug}?date=${row.fastDate}`);

  const locationButton = (
    <button onClick={() => setPickerOpen(true)} className="btn-secondary btn-sm" aria-label="Change city">
      <MapPin size={15} className="text-brand-500" />
      <span className="max-w-[160px] truncate">{location.name}</span>
      <ChevronDown size={14} className="text-stone-400" />
    </button>
  );

  if (loading && !current) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-56 w-full rounded-3xl" />
        <div className="skeleton h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <Moon size={36} className="text-stone-300" />
        <p className="text-sm text-stone-500">We could not find dates for this city. Please choose another city.</p>
        {locationButton}
        {pickerOpen && <LocationPicker current={location} onSelect={cal.setLocation} onClose={() => setPickerOpen(false)} />}
      </div>
    );
  }

  const days = dayDiff(todayKey, current.fastDate);
  const isFastToday = days === 0;
  const isBreakToday = todayKey === current.paranaDate;
  const isBrowsing = selectedIdx !== null && selectedIdx !== nextIndex;
  const c = content[current.slug];
  const monthFasts = rows.filter((r) => r.fastDate.startsWith(month));

  return (
    <div className="space-y-5">
      {/* ===================== Next fasting day ===================== */}
      <section id="ekadashi-hero" className="scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-card ring-1 ring-amber-200/70 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
            <Moon size={13} />
            {isFastToday ? 'Fasting today' : isBreakToday ? 'Break your fast today' : isBrowsing ? 'Ekadashi' : 'Next Ekadashi'}
          </span>
          {locationButton}
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold leading-tight text-maroon-900 sm:text-3xl">{names(current.slug)}</h2>
            <p className="mt-1 text-sm font-medium text-brand-600">{whenText(days)}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => setSelectedIdx(Math.max(0, idx - 1))} disabled={idx <= 0} className="icon-btn bg-white ring-1 ring-sandal-200 disabled:opacity-30" aria-label="Previous Ekadashi">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setSelectedIdx(Math.min(rows.length - 1, idx + 1))} disabled={idx >= rows.length - 1} className="icon-btn bg-white ring-1 ring-sandal-200 disabled:opacity-30" aria-label="Next Ekadashi">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Two simple facts */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-amber-200/70">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <Moon size={14} /> Fast on
            </p>
            <p className="mt-1 text-lg font-semibold text-maroon-900">{formatDateKey(current.fastDate, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-maroon-900/55">From sunrise</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <UtensilsCrossed size={14} /> Break the fast on
            </p>
            <p className="mt-1 text-lg font-semibold text-maroon-900">{formatDateKey(current.paranaDate, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs font-medium text-emerald-700">{breakFastText(current, location.tz)}</p>
          </div>
        </div>

        {c?.summary && <p className="mt-4 text-sm leading-relaxed text-maroon-900/70">{c.summary}</p>}

        {needsCheck(current) && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-maroon-900/55">
            <Info size={14} className="mt-0.5 shrink-0" /> This date is worked out by the app. Please also check with your local temple.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => openStory(current)} className="btn-primary btn-sm">
            <BookOpen size={15} /> Read the story
          </button>
          {isBrowsing && (
            <button onClick={() => setSelectedIdx(null)} className="btn-secondary btn-sm">
              Back to next
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ===================== Month ===================== */}
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 sm:p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} disabled={!!minMonth && month <= minMonth} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-maroon-900">{formatDateKey(`${month}-01`, { month: 'long', year: 'numeric' })}</p>
              {month !== todayKey.slice(0, 7) && (
                <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setMonth(todayKey.slice(0, 7))} style={{ minHeight: 0 }}>
                  This month
                </button>
              )}
            </div>
            <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!!maxMonth && month >= maxMonth} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <MonthCalendar month={month} rows={rows} todayKey={todayKey} selectedKey={current.key} onSelect={select} />
          {monthFasts.length === 0 && <p className="mt-4 text-sm text-maroon-900/50">No Ekadashi this month.</p>}
        </section>

        {/* ===================== Coming up ===================== */}
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 sm:p-6 lg:col-span-2">
          <h3 className="mb-3 text-[15px] font-semibold text-maroon-900">Coming up</h3>
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li key={r.key}>
                <button onClick={() => select(r)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-sandal-50">
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-100 text-brand-700">
                    <span className="text-[10px] font-semibold uppercase leading-none">{formatDateKey(r.fastDate, { month: 'short' })}</span>
                    <span className="text-base font-bold leading-tight">{Number(r.fastDate.slice(8))}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-maroon-900">{names(r.slug)}</span>
                    <span className="block truncate text-xs text-maroon-900/55">{whenText(dayDiff(todayKey, r.fastDate))}</span>
                  </span>
                  <ChevronRight size={15} className="text-maroon-900/30" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ===================== How to fast ===================== */}
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 sm:p-6">
        <h3 className="mb-1 text-[15px] font-semibold text-maroon-900">How to keep Ekadashi</h3>
        <p className="mb-4 text-sm text-maroon-900/55">Simple guidance. Follow what your teacher and temple advise.</p>
        <div className="divide-y divide-sandal-200 overflow-hidden rounded-2xl ring-1 ring-sandal-200">
          {FASTING_GUIDELINES.map((g, i) => (
            <div key={g.title}>
              <button
                onClick={() => setOpenGuide(openGuide === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-maroon-900 hover:bg-sandal-50"
                aria-expanded={openGuide === i}
              >
                {g.title}
                <ChevronDown size={16} className={`text-maroon-900/40 transition-transform ${openGuide === i ? 'rotate-180' : ''}`} />
              </button>
              {openGuide === i && (
                <ul className="animate-fadeIn space-y-2 bg-sandal-50/60 px-4 pb-4 pt-1 text-sm leading-relaxed text-maroon-900/75">
                  {g.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {pickerOpen && <LocationPicker current={location} onSelect={cal.setLocation} onClose={() => setPickerOpen(false)} />}
    </div>
  );
};

export default EkadashiSection;
