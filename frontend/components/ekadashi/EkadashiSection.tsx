import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, ChevronDown, MapPin, Moon, Info } from 'lucide-react';
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

/* -------------------------------------------------------------- Section --- */

const EkadashiSection: React.FC = () => {
  const navigate = useNavigate();
  const cal = useEkadashiCalendar();
  const { location, rows, content, loading, todayKey, nextIndex } = cal;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  useEffect(() => setSelectedIdx(null), [location]);

  const idx = selectedIdx ?? nextIndex;
  const current = rows[idx];
  const names = (slug: string) => ekadashiName(slug, content);

  // the next Ekadashi is the big card above, so this lists the ones that follow it
  const upcoming = useMemo(() => rows.slice(Math.max(nextIndex, 0) + 1, Math.max(nextIndex, 0) + 7), [rows, nextIndex]);

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
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Fast on</p>
            <p className="mt-1 text-lg font-semibold text-maroon-900">{formatDateKey(current.fastDate, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-maroon-900/55">From sunrise</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Break the fast on</p>
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

      {/* ===================== Coming up ===================== */}
      {upcoming.length > 0 && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-sandal-200">
          <div className="px-5 pb-2 pt-5 sm:px-6">
            <h3 className="text-lg font-semibold text-maroon-900">Coming up</h3>
            <p className="text-sm text-maroon-900/55">Tap one to see its dates above.</p>
          </div>
          <ul className="divide-y divide-sandal-200/70 pb-1">
            {upcoming.map((r) => {
              const d = dayDiff(todayKey, r.fastDate);
              const active = r.key === current.key;
              return (
                <li key={r.key}>
                  <button
                    onClick={() => select(r)}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition sm:px-6 ${active ? 'bg-amber-50' : 'hover:bg-sandal-50'}`}
                    style={{ minHeight: 0 }}
                  >
                    <span className="w-11 shrink-0 text-center">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-600">{formatDateKey(r.fastDate, { month: 'short' })}</span>
                      <span className="block text-2xl font-bold leading-none text-maroon-900">{Number(r.fastDate.slice(8))}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[15px] font-semibold leading-snug text-maroon-900">{names(r.slug)}</span>
                      <span className="mt-0.5 block text-xs text-maroon-900/55">
                        {formatDateKey(r.fastDate, { weekday: 'long' })} · break the fast {breakFastText(r, location.tz)}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-sandal-100 px-3 py-1 text-xs font-semibold text-maroon-900/65">{whenText(d)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ===================== How to keep Ekadashi ===================== */}
      <section>
        <div className="mb-3 px-1">
          <h3 className="text-lg font-semibold text-maroon-900">How to keep Ekadashi</h3>
          <p className="text-sm text-maroon-900/55">Simple guidance. Follow what your teacher and temple advise.</p>
        </div>
        <div className="grid items-start gap-3 md:grid-cols-2">
          {FASTING_GUIDELINES.map((g, i) => {
            const open = openGuide === i;
            return (
              <div key={g.title} className={`overflow-hidden rounded-3xl bg-white shadow-soft ring-1 transition ${open ? 'ring-amber-300' : 'ring-sandal-200'}`}>
                <button onClick={() => setOpenGuide(open ? null : i)} className="flex w-full items-center gap-3 px-5 py-4 text-left" aria-expanded={open} style={{ minHeight: 0 }}>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold text-maroon-900">{g.title}</span>
                  <ChevronDown size={18} className={`shrink-0 text-maroon-900/35 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="min-h-0 overflow-hidden">
                    <ul className="space-y-2.5 border-t border-sandal-200/70 px-4 pb-4 pt-3.5">
                      {g.points.map((p) => (
                        <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-maroon-900/75">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {pickerOpen && <LocationPicker current={location} onSelect={cal.setLocation} onClose={() => setPickerOpen(false)} />}
    </div>
  );
};

export default EkadashiSection;
