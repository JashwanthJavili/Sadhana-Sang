import React, { forwardRef } from 'react';
import { DailyEntry, WeeklyCardNotes } from '../../types';
import { PRACTICES, WEEKDAYS, DAY_GOAL, cellText, filledCount, formatWeekRange, time12 } from './weekCard';
import { parseDateKey } from '../../utils/date';

interface Props {
  weekStart: string;
  days: string[];
  entries: Record<string, DailyEntry>;
  notes: WeeklyCardNotes;
  name: string;
  mentor: string;
  phone: string;
}

/**
 * A clean, fixed-width version of the weekly card that is turned into a PNG
 * for sharing with a mentor. Rendered off-screen.
 */
const WeekReport = forwardRef<HTMLDivElement, Props>(({ weekStart, days, entries, notes, name, mentor, phone }, ref) => {
  const done = days.filter((d) => entries[d] && filledCount(entries[d].metrics) >= DAY_GOAL).length;
  const rounds = days.map((d) => Number(entries[d]?.metrics.chantingRounds) || 0);
  const chantedDays = rounds.filter(Boolean).length;
  const avgRounds = chantedDays ? Math.round((rounds.reduce((a, b) => a + b, 0) / chantedDays) * 10) / 10 : 0;
  const reflections = [
    { q: 'Nice points I heard or read this week', a: notes.nicePoints },
    { q: 'My realisations', a: notes.realizations },
    { q: 'Concerns or questions', a: notes.concerns },
  ].filter((r) => r.a.trim());

  return (
    <div ref={ref} style={{ width: 1000, fontFamily: 'Poppins, system-ui, sans-serif' }} className="bg-[#FBF5EA] p-10 text-[#3b1a12]">
      {/* Header */}
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFE7B0] via-[#FFEBC9] to-[#FFF6E5] px-10 py-8 text-[#3b1a12]">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#b4501a]">Weekly</p>
            <h1 className="mt-1 text-[44px] font-semibold leading-none" style={{ color: "#3b1a12" }}>Sadhana Card</h1>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.2em] text-[#b4501a]">Week of</p>
            <p className="mt-1 text-2xl font-semibold">{formatWeekRange(weekStart)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-2 border-t border-[#3b1a12]/10 pt-5 text-[15px]">
          <span>
            <span className="text-[#b4501a]">Name </span>
            <b className="font-semibold">{name || '—'}</b>
          </span>
          {mentor && (
            <span>
              <span className="text-[#b4501a]">Mentor </span>
              <b className="font-semibold">{mentor}</b>
            </span>
          )}
          {phone && (
            <span>
              <span className="text-[#b4501a]">Phone </span>
              <b className="font-semibold">{phone}</b>
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { v: `${done}/7`, l: 'days complete' },
          { v: `${avgRounds || '—'}`, l: 'average rounds' },
          { v: `${chantedDays}/7`, l: 'days chanted' },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-white px-6 py-4 ring-1 ring-[#efe0c6]">
            <p className="text-3xl font-semibold text-[#7a2a17]">{s.v}</p>
            <p className="text-sm text-[#3b1a12]/60">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-[24px] bg-white ring-1 ring-[#efe0c6]">
        <div className="grid grid-cols-[170px_repeat(7,1fr)] bg-[#f6ead5] text-center text-sm font-semibold">
          <div className="px-4 py-3 text-left text-[#3b1a12]/60">Practice</div>
          {days.map((d, i) => (
            <div key={d} className="py-3">
              <div className="text-[#7a2a17]">{WEEKDAYS[i]}</div>
              <div className="text-xs font-medium text-[#3b1a12]/50">{parseDateKey(d).getDate()}</div>
            </div>
          ))}
        </div>
        {PRACTICES.map((row, ri) => (
          <div key={row.id} className={`grid grid-cols-[170px_repeat(7,1fr)] items-center text-center text-[14px] ${ri % 2 ? 'bg-[#fffcf7]' : 'bg-white'}`}>
            <div className="px-4 py-3 text-left font-semibold">{row.label}</div>
            {days.map((d) => {
              const m = entries[d]?.metrics;
              const text = m ? cellText(row, m) : '';
              const sub = row.kind === 'rounds' && m?.chantingTime ? time12(m.chantingTime) : '';
              return (
                <div key={d} className="px-1 py-3 leading-tight">
                  <span className={text ? 'font-medium' : 'text-[#3b1a12]/25'}>{text || '·'}</span>
                  {sub && <span className="block text-[11px] text-[#3b1a12]/50">{sub}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Reflections */}
      {reflections.length > 0 && (
        <div className="mt-6 space-y-3">
          {reflections.map((r) => (
            <div key={r.q} className="rounded-2xl bg-white px-6 py-4 ring-1 ring-[#efe0c6]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b4501a]">{r.q}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed">{r.a}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-[#3b1a12]/45">Made with Sadhana Sang · Hare Krishna</p>
    </div>
  );
});

WeekReport.displayName = 'WeekReport';
export default WeekReport;
