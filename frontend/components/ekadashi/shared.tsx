import React from 'react';
import { ShieldCheck, Calculator, FileText, AlertTriangle, Sunrise, UtensilsCrossed, Moon, Info } from 'lucide-react';
import type { EkadashiLocation } from '../../utils/ekadashi/calendar';
import type { DisplayEkadashi, DisplayStatus, EkadashiContent } from '../../utils/ekadashi/types';
import { formatDateKey, formatTime, formatDateInTz, localMidnight, tzAbbrev } from '../../utils/ekadashi/timezone';
import { paranaLabel } from '../../utils/ekadashi/merge';

export const titleFromSlug = (slug: string) =>
  slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
    .replace('Putrada Pausha', 'Putrada');

export const ekadashiName = (slug: string, content: Record<string, EkadashiContent>) =>
  content[slug]?.name || `${titleFromSlug(slug)} Ekadashi`;

/** Epoch ms of an "HH:MM" wall-clock time on a civil date in the zone */
export const wallClockMs = (dateKey: string, hm: string, tz: string) => {
  const [h, m] = hm.split(':').map(Number);
  return localMidnight(dateKey, tz) + (h * 60 + m) * 60_000;
};

/** When the parana window closes (best available) */
export const paranaEndMs = (row: DisplayEkadashi, tz: string): number => {
  if (row.record?.paranaEnd) return wallClockMs(row.paranaDate, row.record.paranaEnd, tz);
  if (!row.record && row.calc?.paranaEnd) return row.calc.paranaEnd;
  if (row.record?.paranaStart) return wallClockMs(row.paranaDate, row.record.paranaStart, tz) + 2 * 3_600_000;
  return localMidnight(row.paranaDate, tz) + 12 * 3_600_000;
};

const STATUS_META: Record<DisplayStatus, { label: string; cls: string; icon: React.ReactNode; help: string }> = {
  verified: {
    label: 'Checked',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    icon: <ShieldCheck size={13} />,
    help: 'Checked against the temple calendar for this city.',
  },
  source_imported: {
    label: 'From temple calendar',
    cls: 'bg-sky-50 text-sky-700 ring-sky-200',
    icon: <FileText size={13} />,
    help: 'Taken from a published temple calendar.',
  },
  disputed: {
    label: 'Please ask your temple',
    cls: 'bg-red-50 text-red-700 ring-red-200',
    icon: <AlertTriangle size={13} />,
    help: 'Calendars show different dates. Please ask your local temple.',
  },
  calculated: {
    label: 'Worked out by the app',
    cls: 'bg-amber-50 text-amber-800 ring-amber-200',
    icon: <Calculator size={13} />,
    help: 'Worked out by the app for your city. Please also check with your local temple.',
  },
};

export const StatusBadge: React.FC<{ status: DisplayStatus; className?: string }> = ({ status, className = '' }) => {
  const m = STATUS_META[status];
  return (
    <span title={m.help} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${m.cls} ${className}`}>
      {m.icon}
      {m.label}
    </span>
  );
};

export const statusHelp = (s: DisplayStatus) => STATUS_META[s].help;

/** Fasting, tithi and parana details for one observance */
export const ObservanceTimings: React.FC<{ row: DisplayEkadashi; location: EkadashiLocation; compact?: boolean }> = ({ row, location, compact }) => {
  const tz = location.tz;
  const p = paranaLabel(row, tz);
  const rec = row.record;
  const calc = row.calc;
  const showCalcTithi = !rec?.ekadashiStart && calc;
  const fmtLocalIso = (iso: string) => {
    const [d, t] = iso.split('T');
    return `${formatDateKey(d, { weekday: 'short', day: 'numeric', month: 'short' })}, ${t}`;
  };
  const abbrev = tzAbbrev(localMidnight(row.fastDate, tz), tz);

  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-sandal-200">
        <p className="eyebrow mb-1.5 flex items-center gap-1.5 text-maroon-900/50">
          <Moon size={13} /> Fasting day
        </p>
        <p className="font-semibold text-maroon-900">{formatDateKey(row.fastDate)}</p>
        {calc?.sunriseOnFast && calc.fastDate === row.fastDate && (
          <p className="mt-1 flex items-center gap-1 text-xs text-maroon-900/60">
            <Sunrise size={12} /> Sunrise {formatTime(calc.sunriseOnFast, tz)}
          </p>
        )}
        {(rec?.mahadvadashi || (calc && calc.rule !== 'shuddha' && calc.fastDate === row.fastDate)) && (
          <p className="mt-2 text-xs font-medium text-brand-700">The fast moves to this day this time</p>
        )}
      </div>

      {!compact && (
        <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-sandal-200">
          <p className="eyebrow mb-1.5 text-maroon-900/50">Ekadashi time</p>
          {rec?.ekadashiStart ? (
            <>
              <p className="text-sm text-maroon-900">
                <span className="text-maroon-900/50">Begins</span> {fmtLocalIso(rec.ekadashiStart)}
              </p>
              {rec.ekadashiEnd && (
                <p className="text-sm text-maroon-900">
                  <span className="text-maroon-900/50">Ends</span> {fmtLocalIso(rec.ekadashiEnd)}
                </p>
              )}
            </>
          ) : showCalcTithi ? (
            <>
              <p className="text-sm text-maroon-900">
                <span className="text-maroon-900/50">Begins</span> {formatDateInTz(calc!.ekadashiStart, tz)}, {formatTime(calc!.ekadashiStart, tz)}
              </p>
              <p className="text-sm text-maroon-900">
                <span className="text-maroon-900/50">Ends</span> {formatDateInTz(calc!.ekadashiEnd, tz)}, {formatTime(calc!.ekadashiEnd, tz)}
              </p>
              <p className="mt-1 text-[11px] text-amber-700">Calculated</p>
            </>
          ) : (
            <p className="text-sm text-maroon-900/50">Not available</p>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-sandal-200">
        <p className="eyebrow mb-1.5 flex items-center gap-1.5 text-maroon-900/50">
          <UtensilsCrossed size={13} /> Break the fast
        </p>
        <p className="font-semibold text-maroon-900">{formatDateKey(row.paranaDate, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {p ? (
          <>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {p.end ? `${p.start} – ${p.end}` : `Any time after ${p.start}`} <span className="font-normal text-maroon-900/45">{abbrev}</span>
            </p>
            
            {row.status === 'calculated' && <p className="mt-1 text-[11px] text-amber-700">Calculated</p>}
          </>
        ) : (
          <p className="mt-1 text-xs text-maroon-900/55">Time not available — please ask your local temple.</p>
        )}
      </div>
    </div>
  );
};

/** Explains where the data came from and anything to double-check */
export const VerificationNote: React.FC<{ row: DisplayEkadashi; location: EkadashiLocation; showAdminDetail?: boolean }> = ({ row, location, showAdminDetail }) => {
  // technical review notes are for admins only
  const flags = showAdminDetail && row.status === 'calculated' ? row.calc?.reviewFlags || [] : [];
  return (
    <div className="space-y-2 text-xs leading-relaxed text-maroon-900/65">
      <p className="flex items-start gap-1.5">
        <Info size={14} className="mt-0.5 shrink-0 text-maroon-900/40" />
        <span>
          {statusHelp(row.status)}
          {row.record?.sourceName && (
            <>
              {' '}
              Source:{' '}
              {row.record.sourceUrl ? (
                <a href={row.record.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                  {row.record.sourceName}
                </a>
              ) : (
                <span className="font-medium">{row.record.sourceName}</span>
              )}
              .
            </>
          )}
          {location.custom && ' For temple-checked dates, choose the nearest city from the list.'}
        </span>
      </p>
      {flags.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
          {flags.map((f) => (
            <li key={f} className="flex gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      )}
      {showAdminDetail && row.discrepancies.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-red-50 px-3 py-2 text-red-800 ring-1 ring-red-200">
          {row.discrepancies.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
