import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Database,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Flag,
  Check,
  Moon,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm, askText } from '../ConfirmDialog';
import { PRESET_LOCATIONS, findPreset, DEFAULT_LOCATION_ID } from '../../utils/ekadashi/locations';
import { calculateEkadashis, RULE_LABELS } from '../../utils/ekadashi/calendar';
import { mergeObservances } from '../../utils/ekadashi/merge';
import { formatTime, formatDateKey, dateKeyInTz, addDaysKey } from '../../utils/ekadashi/timezone';
import { EKADASHI_CONTENT } from '../../utils/ekadashi/content';
import { OFFICIAL_SEED } from '../../utils/ekadashi/officialSeed';
import type { DisplayEkadashi, EkadashiContent, ObservanceRecord, ObservanceStatus, PrabhupadaTeaching, SourceRef } from '../../utils/ekadashi/types';
import {
  deleteObservance,
  loadEkadashiContent,
  loadObservanceSources,
  saveEkadashiContent,
  saveObservance,
  seedEkadashiContent,
  seedOfficialObservances,
  bundledContent,
} from '../../services/ekadashi';
import { StatusBadge } from './shared';

const inputCls = 'block w-full h-11 rounded-xl border border-sandal-200 bg-white px-3 text-sm text-maroon-900 outline-none focus:ring-2 focus:ring-marigold-400/40';
const areaCls = 'block w-full rounded-xl border border-sandal-200 bg-white px-3 py-2 text-sm text-maroon-900 outline-none focus:ring-2 focus:ring-marigold-400/40';
const labelCls = 'mb-1 block text-xs text-maroon-900/50';
const btnBase = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-50';
const btnPrimary = `${btnBase} bg-brand-600 text-white`;
const btnSecondary = `${btnBase} border border-sandal-200 bg-white text-maroon-900/80`;
const btnGhost = `${btnBase} text-brand-700`;
const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sandal-200 bg-white text-maroon-900/60';
const card = 'rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft';
const actBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50';

const Fact: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="shrink-0 text-maroon-900/45">{k}</span>
    <span className="min-w-0 break-words text-right font-medium text-maroon-900">{v}</span>
  </div>
);

const SLUGS = EKADASHI_CONTENT.map((c) => ({ slug: c.slug, name: c.name }));
const nameOf = (slug: string) => SLUGS.find((s) => s.slug === slug)?.name || slug;

/* ================================================================ Dates === */

const emptyRecord = (locationId: string, slug = 'utpanna', fastDate = ''): ObservanceRecord => ({
  locationId,
  slug,
  fastDate,
  paranaDate: fastDate ? addDaysKey(fastDate, 1) : '',
  paranaStart: '',
  paranaEnd: '',
  paranaNote: '',
  sourceName: '',
  sourceUrl: '',
  status: 'source_imported',
});

const RecordEditor: React.FC<{
  initial: ObservanceRecord;
  originalKey?: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ initial, originalKey, onClose, onSaved }) => {
  const toast = useToast();
  const [r, setR] = useState<ObservanceRecord>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ObservanceRecord>(k: K, v: ObservanceRecord[K]) => setR((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!r.fastDate || !r.slug || !r.sourceName.trim()) {
      toast.showError('Ekadashi, fasting date and source name are required.');
      return;
    }
    if (r.status === 'verified' && !r.sourceUrl && !r.notes) {
      toast.showError('To verify, give a source URL or a note describing the printed calendar used.');
      return;
    }
    setSaving(true);
    try {
      const clean: ObservanceRecord = {
        ...r,
        paranaDate: r.paranaDate || addDaysKey(r.fastDate, 1),
        paranaStart: r.paranaStart || undefined,
        paranaEnd: r.paranaEnd || undefined,
        paranaNote: r.paranaNote || undefined,
        ekadashiStart: r.ekadashiStart || undefined,
        ekadashiEnd: r.ekadashiEnd || undefined,
        mahadvadashi: r.mahadvadashi || undefined,
        sourceUrl: r.sourceUrl || undefined,
        notes: r.notes || undefined,
      };
      await saveObservance(clean);
      if (originalKey && originalKey !== r.fastDate) await deleteObservance(r.locationId, originalKey);
      toast.showSuccess('Record saved');
      onSaved();
    } catch (e) {
      toast.showError(`Save failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  };

  const field = inputCls;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl animate-rise-in flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-3 border-b border-sandal-200 bg-gradient-to-br from-amber-50 to-white px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-marigold-400 to-brand-500 text-white">
              <Moon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-maroon-900">Official Ekadashi record</h3>
              <p className="text-xs text-maroon-900/55">
                {findPreset(r.locationId)?.name} · local times as printed in the source (24h)
              </p>
            </div>
          </div>
          <button className={iconBtn} style={{ minHeight: 0 }} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/70 sm:col-span-2">Observance</p>
          <label className="min-w-0 sm:col-span-2">
            <span className={labelCls}>Ekadashi</span>
            <select className={field} value={r.slug} onChange={(e) => set('slug', e.target.value)}>
              {SLUGS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className={labelCls}>Fasting date *</span>
            <input type="date" className={field} value={r.fastDate} onChange={(e) => setR((x) => ({ ...x, fastDate: e.target.value, paranaDate: !x.paranaDate || (x.fastDate && x.paranaDate === addDaysKey(x.fastDate, 1)) ? (e.target.value ? addDaysKey(e.target.value, 1) : '') : x.paranaDate }))} />
          </label>
          <label className="min-w-0">
            <span className={labelCls}>Parana date</span>
            <input type="date" className={field} value={r.paranaDate} onChange={(e) => set('paranaDate', e.target.value)} />
          </label>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700/70 sm:col-span-2">Parana (breaking the fast)</p>
          <label className="min-w-0">
            <span className={labelCls}>Parana start</span>
            <input type="time" className={field} value={r.paranaStart || ''} onChange={(e) => set('paranaStart', e.target.value)} />
          </label>
          <label className="min-w-0">
            <span className={labelCls}>Parana end (blank = open-ended)</span>
            <input type="time" className={field} value={r.paranaEnd || ''} onChange={(e) => set('paranaEnd', e.target.value)} />
          </label>
          <label className="min-w-0 sm:col-span-2">
            <span className={labelCls}>Parana note (as printed)</span>
            <input className={field} value={r.paranaNote || ''} placeholder="e.g. Sunrise – End of tithi" onChange={(e) => set('paranaNote', e.target.value)} />
          </label>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700/70 sm:col-span-2">Tithi</p>
          <label className="min-w-0">
            <span className={labelCls}>Ekadashi tithi begins</span>
            <input type="datetime-local" className={field} value={r.ekadashiStart || ''} onChange={(e) => set('ekadashiStart', e.target.value)} />
          </label>
          <label className="min-w-0">
            <span className={labelCls}>Ekadashi tithi ends</span>
            <input type="datetime-local" className={field} value={r.ekadashiEnd || ''} onChange={(e) => set('ekadashiEnd', e.target.value)} />
          </label>
          <label className="min-w-0 sm:col-span-2">
            <span className={labelCls}>Mahadvadashi label (if any)</span>
            <input className={field} value={r.mahadvadashi || ''} placeholder="e.g. Trisprsa Mahadvadasi" onChange={(e) => set('mahadvadashi', e.target.value)} />
          </label>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700/70 sm:col-span-2">Source and status</p>
          <label className="min-w-0">
            <span className={labelCls}>Source name *</span>
            <input className={field} value={r.sourceName} placeholder="e.g. ISKCON Mayapur GCal 2027" onChange={(e) => set('sourceName', e.target.value)} />
          </label>
          <label className="min-w-0">
            <span className={labelCls}>Source URL</span>
            <input className={field} value={r.sourceUrl || ''} placeholder="https://…" onChange={(e) => set('sourceUrl', e.target.value)} />
          </label>
          <label className="min-w-0 sm:col-span-2">
            <span className={labelCls}>Verification status</span>
            <select className={field} value={r.status} onChange={(e) => set('status', e.target.value as ObservanceStatus)}>
              <option value="source_imported">Official source — review pending</option>
              <option value="verified">Verified against official ISKCON calendar</option>
              <option value="disputed">Disputed — sources disagree</option>
            </select>
          </label>
          <label className="min-w-0 sm:col-span-2">
            <span className={labelCls}>Admin notes</span>
            <textarea className={areaCls} rows={2} value={r.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-sandal-200 bg-sandal-50/60 px-5 py-4">
          <button className={btnSecondary} style={{ minHeight: 0 }} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary} style={{ minHeight: 0 }} onClick={save} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save record'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CSV_HELP = 'slug,fastDate,paranaDate,paranaStart,paranaEnd,sourceName,sourceUrl';

const DatesAdmin: React.FC = () => {
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const confirmAsk = (text: string) => askText(ask, text);
  const [cityId, setCityId] = useState(DEFAULT_LOCATION_ID);
  const city = findPreset(cityId)!;
  const thisYear = Number(dateKeyInTz(Date.now(), city.tz).slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [dbRecords, setDbRecords] = useState<ObservanceRecord[]>([]);
  const [seedRecords, setSeedRecords] = useState<ObservanceRecord[]>([]);
  const [dbError, setDbError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ rec: ObservanceRecord; originalKey?: string } | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);

  const reqId = useRef(0);
  const reload = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await loadObservanceSources(cityId);
      if (id !== reqId.current) return;
      setDbRecords(res.db);
      setSeedRecords(res.seed);
      setDbError(res.dbError);
    } catch (e) {
      if (id === reqId.current) setDbError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const rows = useMemo<(DisplayEkadashi & { origin: 'database' | 'seed' | 'none' })[]>(() => {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const calc = calculateEkadashis(city, from, to);
    const combined = [
      ...dbRecords,
      ...seedRecords.filter((s) => !dbRecords.some((d) => d.slug === s.slug && Math.abs(Date.parse(d.fastDate) - Date.parse(s.fastDate)) <= 3 * 86_400_000)),
    ];
    return mergeObservances(calc, combined, city, from, to).map((r) => ({
      ...r,
      origin: !r.record ? 'none' : dbRecords.includes(r.record) ? 'database' : 'seed',
    }));
  }, [city, year, dbRecords, seedRecords]);

  const shown = onlyIssues ? rows.filter((r) => r.discrepancies.length || r.status === 'calculated' || r.status === 'disputed' || r.calc?.reviewFlags.length) : rows;
  const stats = {
    verified: rows.filter((r) => r.status === 'verified').length,
    imported: rows.filter((r) => r.status === 'source_imported').length,
    calculated: rows.filter((r) => r.status === 'calculated').length,
    issues: rows.filter((r) => r.discrepancies.length).length,
  };

  const setStatus = async (r: DisplayEkadashi, status: ObservanceStatus) => {
    if (!r.record) return;
    if (status === 'verified' && !await confirmAsk(`Mark ${nameOf(r.slug)} on ${r.fastDate} for ${city.name} as VERIFIED?\n\nOnly do this after checking the date and parana times against the official ISKCON calendar (${r.record.sourceName}).`)) return;
    setBusy(true);
    try {
      await saveObservance({ ...r.record, status });
      toast.showSuccess(status === 'verified' ? 'Marked verified' : 'Status updated');
      await reload();
    } catch (e) {
      toast.showError(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const removeRecord = async (r: DisplayEkadashi) => {
    if (!r.record) return;
    if (!await confirmAsk('Delete this database record?\nA bundled record for the same date, if any, will show again.')) return;
    setBusy(true);
    try {
      await deleteObservance(r.record.locationId, r.record.fastDate);
      toast.showSuccess('Record deleted');
      await reload();
    } catch (e) {
      toast.showError(`Delete failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const verifyAllMatching = async () => {
    const candidates = rows.filter((r) => r.record && r.status === 'source_imported' && r.discrepancies.length === 0 && r.record.sourceUrl);
    if (!candidates.length) return toast.showInfo('No unreviewed records that match the calculation exactly.');
    if (!await confirmAsk(`Mark ${candidates.length} official records for ${city.name} (${year}) as VERIFIED?\n\nThese come from a published GCal calendar and agree with the independent calculation (date, and parana within 5 minutes). Please spot-check the source before confirming.`)) return;
    setBusy(true);
    try {
      for (const r of candidates) await saveObservance({ ...r.record!, status: 'verified', notes: [r.record!.notes, 'Bulk-verified: official source agrees with independent calculation.'].filter(Boolean).join(' ') });
      toast.showSuccess(`${candidates.length} records verified`);
    } catch (e) {
      toast.showError(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      await reload();
      setBusy(false);
    }
  };

  const importSeed = async () => {
    if (!await confirmAsk(`Copy ${OFFICIAL_SEED.length} bundled official records into the database?\nExisting database records are not overwritten. Status stays "review pending".`)) return;
    setBusy(true);
    try {
      const n = await seedOfficialObservances();
      toast.showSuccess(n ? `${n} records written to the database` : 'All bundled records already exist in the database');
      await reload();
    } catch (e) {
      toast.showError(`Import failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async () => {
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('slug,'));
    const valid = new Set(SLUGS.map((s) => s.slug));
    const recs: ObservanceRecord[] = [];
    for (const [i, line] of lines.entries()) {
      const [slug, fastDate, paranaDate, paranaStart, paranaEnd, sourceName, sourceUrl] = line.split(',').map((x) => x?.trim());
      const okTime = (t?: string) => !t || /^\d{1,2}:\d{2}$/.test(t);
      if (!valid.has(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(fastDate || '') || (paranaDate && !/^\d{4}-\d{2}-\d{2}$/.test(paranaDate)) || !okTime(paranaStart) || !okTime(paranaEnd) || !sourceName) {
        toast.showError(`Line ${i + 1} is invalid: ${line}`);
        return;
      }
      recs.push({ locationId: cityId, slug, fastDate, paranaDate: paranaDate || addDaysKey(fastDate, 1), paranaStart: paranaStart || undefined, paranaEnd: paranaEnd || undefined, sourceName, sourceUrl: sourceUrl || undefined, status: 'source_imported' });
    }
    setBusy(true);
    try {
      for (const r of recs) await saveObservance(r);
      toast.showSuccess(`${recs.length} records imported for ${city.name}`);
      setCsv('');
      setCsvOpen(false);
    } catch (e) {
      toast.showError(`Import failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      await reload();
      setBusy(false);
    }
  };

  const hm = (ms: number | null) => (ms === null ? '—' : formatTime(ms, city.tz, false));

  return (
    <div className="space-y-4">
      {dialog}

      {/* Toolbar */}
      <div className={`${card} space-y-3.5`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
          <label className="col-span-2 min-w-0 sm:col-span-1">
            <span className={labelCls}>City</span>
            <select className={inputCls} value={cityId} onChange={(e) => setCityId(e.target.value)}>
              {PRESET_LOCATIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.country})
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className={labelCls}>Year</span>
            <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={onlyIssues}
            onClick={() => setOnlyIssues((v) => !v)}
            className={`flex h-11 items-center justify-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition ${
              onlyIssues ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-sandal-200 bg-white text-maroon-900/65'
            }`}
            style={{ minHeight: 0 }}
          >
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${onlyIssues ? 'bg-brand-600' : 'bg-sandal-300'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${onlyIssues ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            Needs attention
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-sandal-200/70 pt-3">
          <button className={btnPrimary} style={{ minHeight: 0 }} onClick={() => setEditing({ rec: emptyRecord(cityId) })}>
            <Plus size={15} /> Add record
          </button>
          <button className={btnSecondary} style={{ minHeight: 0 }} onClick={() => setCsvOpen((v) => !v)}>
            <Upload size={14} /> Bulk import
          </button>
          <button className={btnSecondary} style={{ minHeight: 0 }} onClick={importSeed} disabled={busy}>
            <Database size={14} /> Bundled data
          </button>
          <button className={`${iconBtn} ml-auto`} style={{ minHeight: 0 }} onClick={reload} disabled={loading} title="Refresh" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {dbError && (
        <p className="break-words rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          Database read failed ({dbError}). Make sure the <code>ekadashi</code> rules in database.rules.json are deployed.
        </p>
      )}

      {csvOpen && (
        <div className={`${card} space-y-2.5`}>
          <p className="break-words text-xs leading-relaxed text-maroon-900/55">
            Paste official data for <b className="text-maroon-900">{city.name}</b>, one Ekadashi per line:
            <code className="mt-1 block break-all rounded-lg bg-sandal-50 px-2.5 py-1.5 text-[11px] text-maroon-900/70">{CSV_HELP}</code>
            Times are 24h local. Records are saved as “review pending”.
          </p>
          <textarea className={`${areaCls} font-mono text-xs`} rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="utpanna,2027-11-24,2027-11-25,05:56,09:34,ISKCON Mayapur GCal 2027,https://…" />
          <button className={btnPrimary} style={{ minHeight: 0 }} onClick={importCsv} disabled={busy || !csv.trim()}>
            Import lines
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { n: stats.verified, label: 'Verified', bar: 'bg-emerald-500', num: 'text-emerald-700' },
          { n: stats.imported, label: 'Review pending', bar: 'bg-sky-500', num: 'text-sky-700' },
          { n: stats.calculated, label: 'Calculated only', bar: 'bg-amber-500', num: 'text-amber-700' },
          { n: stats.issues, label: 'Discrepancies', bar: 'bg-red-500', num: 'text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`${card} relative overflow-hidden py-3 pl-5 pr-3`}>
            <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
            <p className={`text-2xl font-bold leading-none ${s.num}`}>{s.n}</p>
            <p className="mt-1.5 text-xs font-medium text-maroon-900/55">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.imported > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-200">
              <ShieldCheck size={18} />
            </span>
            <p className="text-sm text-emerald-900">
              <b>{stats.imported} official records</b> are waiting for review. Those that agree with the calculation can be verified in one go.
            </p>
          </div>
          <button className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`} style={{ minHeight: 0 }} onClick={verifyAllMatching} disabled={busy}>
            Verify all matching…
          </button>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 w-full animate-pulse rounded-2xl bg-sandal-100" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className={`${card} flex flex-col items-center px-6 py-12 text-center`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-brand-600 ring-1 ring-amber-200">
            <Moon size={22} />
          </span>
          <p className="mt-3 font-semibold text-maroon-900">Nothing to show</p>
          <p className="mt-1 text-sm text-maroon-900/55">{onlyIssues ? 'Every Ekadashi this year looks fine.' : 'No Ekadashi found for this year.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {shown.map((r) => (
            <article key={r.key} className="overflow-hidden rounded-2xl border border-sandal-200 bg-white shadow-soft">
              <div className="flex items-start gap-3.5 p-4">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-gradient-to-b from-marigold-100 to-amber-50 py-2 ring-1 ring-amber-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">{formatDateKey(r.fastDate, { month: 'short' })}</span>
                  <span className="text-2xl font-bold leading-none text-maroon-900">{formatDateKey(r.fastDate, { day: 'numeric' })}</span>
                  <span className="mt-0.5 text-[10px] font-medium text-maroon-900/50">{formatDateKey(r.fastDate, { weekday: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[15px] font-semibold leading-snug text-maroon-900">{nameOf(r.slug)}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge status={r.status} />
                    {r.record?.verifiedBy && <span className="text-[11px] text-maroon-900/50">by {r.record.verifiedBy}</span>}
                  </div>
                </div>
                {r.record && (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${r.discrepancies.length ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'}`}
                    title={r.discrepancies.length ? 'Official record differs from the calculation' : 'Official record matches the calculation'}
                  >
                    {r.discrepancies.length ? <AlertTriangle size={15} /> : <Check size={16} />}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 px-4 pb-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5 rounded-xl bg-sandal-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon-900/40">Calculated</p>
                  {r.calc ? (
                    <>
                      <Fact k="Fast" v={r.calc.fastDate} />
                      <Fact k="Parana" v={`${hm(r.calc.paranaStart)} – ${hm(r.calc.paranaEnd)}`} />
                      {r.calc.rule !== 'shuddha' && <p className="text-xs font-medium text-brand-700">{RULE_LABELS[r.calc.rule].title}</p>}
                      {r.calc.reviewFlags.some((f) => f.startsWith('Borderline')) && (
                        <p className="flex items-center gap-1 text-xs font-medium text-amber-700">
                          <AlertTriangle size={12} className="shrink-0" /> Borderline
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-maroon-900/40">—</p>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5 rounded-xl bg-sandal-50 p-3">
                  <p className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-maroon-900/40">
                    <span>Official</span>
                    {r.record && (
                      <span className="flex items-center gap-1 font-medium normal-case tracking-normal">
                        {r.origin === 'seed' ? 'bundled' : 'database'}
                        {r.record.sourceUrl && (
                          <a href={r.record.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-600" title={r.record.sourceName} aria-label="Open source">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </span>
                    )}
                  </p>
                  {r.record ? (
                    <>
                      <Fact k="Fast" v={r.record.fastDate} />
                      <Fact k="Parana" v={`${r.record.paranaStart || '—'} – ${r.record.paranaEnd || 'open'}`} />
                      {r.record.mahadvadashi && <p className="break-words text-xs font-medium text-brand-700">{r.record.mahadvadashi}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-maroon-900/40">No official record</p>
                  )}
                </div>
              </div>

              {r.discrepancies.length > 0 && (
                <ul className="mx-4 mb-4 space-y-1 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700 ring-1 ring-red-200">
                  {r.discrepancies.map((d) => (
                    <li key={d} className="flex gap-1.5 break-words">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-1.5 border-t border-sandal-200/70 bg-sandal-50/50 px-3 py-2.5">
                {r.record && r.status !== 'verified' && (
                  <button className={`${actBtn} text-emerald-700 hover:bg-emerald-50`} style={{ minHeight: 0 }} disabled={busy} onClick={() => setStatus(r, 'verified')}>
                    <CheckCircle2 size={15} /> Verify
                  </button>
                )}
                {r.record && r.status !== 'disputed' && (
                  <button className={`${actBtn} text-red-600 hover:bg-red-50`} style={{ minHeight: 0 }} disabled={busy} onClick={() => setStatus(r, 'disputed')}>
                    <Flag size={14} /> Dispute
                  </button>
                )}
                <button
                  className={`${actBtn} text-maroon-900/70 hover:bg-white`}
                  style={{ minHeight: 0 }}
                  onClick={() =>
                    setEditing(
                      r.record
                        ? { rec: { ...r.record }, originalKey: r.origin === 'database' ? r.record.fastDate : undefined }
                        : { rec: emptyRecord(cityId, r.slug, r.fastDate) }
                    )
                  }
                >
                  {r.record ? <Edit3 size={14} /> : <Plus size={15} />} {r.record ? 'Edit' : 'Add official'}
                </button>
                {r.origin === 'database' && (
                  <button className={`${actBtn} ml-auto text-maroon-900/45 hover:bg-red-50 hover:text-red-600`} style={{ minHeight: 0 }} disabled={busy} onClick={() => removeRecord(r)} aria-label="Delete database record" title="Delete database record">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <RecordEditor
          initial={editing.rec}
          originalKey={editing.originalKey}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
};

/* ============================================================== Content === */

const refsToText = (refs: SourceRef[]) => refs.map((r) => [r.label, r.url || '', r.note || ''].join(' | ').replace(/( \| )+$/, '')).join('\n');
const textToRefs = (t: string): SourceRef[] =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, url, note] = l.split('|').map((x) => x.trim());
      return { label, url: url || undefined, note: note || undefined };
    })
    .filter((r) => r.label);

const ContentEditor: React.FC<{ initial: EkadashiContent; onSaved: () => void }> = ({ initial, onSaved }) => {
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const confirmAsk = (text: string) => askText(ask, text);
  const [c, setC] = useState<EkadashiContent>(initial);
  const [scriptureText, setScriptureText] = useState(refsToText(initial.scripture));
  const [sourcesText, setSourcesText] = useState(refsToText(initial.sources));
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setC(initial);
    setScriptureText(refsToText(initial.scripture));
    setSourcesText(refsToText(initial.sources));
    setChecked(false);
  }, [initial]);

  const set = <K extends keyof EkadashiContent>(k: K, v: EkadashiContent[K]) => setC((x) => ({ ...x, [k]: v }));
  const setTeaching = (i: number, patch: Partial<PrabhupadaTeaching>) =>
    setC((x) => ({ ...x, teachings: x.teachings.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));

  const save = async (status: EkadashiContent['status']) => {
    if (status === 'verified' && !checked) {
      toast.showError('Please confirm you have checked the content against the cited sources.');
      return;
    }
    const unverifiedQuote = c.teachings.find((t) => t.quote && !t.quoteVerified);
    if (status === 'verified' && unverifiedQuote) {
      toast.showError('A quotation is not marked as verified word-for-word. Verify or remove it first.');
      return;
    }
    setSaving(true);
    try {
      const by = 'admin';
      await saveEkadashiContent({
        ...c,
        teachings: c.teachings.filter((t) => t.summary.trim() || t.quote?.trim()),
        scripture: textToRefs(scriptureText),
        sources: textToRefs(sourcesText),
        status,
        verifiedBy: status === 'verified' ? c.verifiedBy || by : undefined,
        verifiedAt: status === 'verified' ? Date.now() : undefined,
      });
      toast.showSuccess(status === 'verified' ? 'Content verified and saved' : 'Saved (needs review)');
      onSaved();
    } catch (e) {
      toast.showError(`Save failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  };

  const revert = async () => {
    const b = bundledContent(c.slug);
    if (b && (await confirmAsk('Discard edits and load the bundled (researched) version into the editor?'))) {
      setC(b);
      setScriptureText(refsToText(b.scripture));
      setSourcesText(refsToText(b.sources));
    }
  };

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between gap-3 border-b border-sandal-200/70 pb-4">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold leading-tight text-maroon-900">{c.name}</h3>
          <p className="mt-0.5 text-xs text-maroon-900/50">
            {c.month} · {c.paksha === 'shukla' ? 'Shukla' : 'Krishna'} paksha
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
            c.status === 'verified' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
          }`}
        >
          {c.status === 'verified' ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
          {c.status === 'verified' ? 'Verified' : 'Needs review'}
        </span>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/70">Basics</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Name</span>
          <input className={inputCls} value={c.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          <span className={labelCls}>Other names (comma separated)</span>
          <input className={inputCls} value={c.altNames.join(', ')} onChange={(e) => set('altNames', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
        </label>
        <label>
          <span className={labelCls}>Month</span>
          <input className={inputCls} value={c.month} onChange={(e) => set('month', e.target.value)} />
        </label>
        <label>
          <span className={labelCls}>Paksha</span>
          <select className={inputCls} value={c.paksha} onChange={(e) => set('paksha', e.target.value as 'shukla' | 'krishna')}>
            <option value="shukla">Shukla</option>
            <option value="krishna">Krishna</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>One-line summary</span>
        <input className={inputCls} value={c.summary} onChange={(e) => set('summary', e.target.value)} />
      </label>
      <p className="border-t border-sandal-200/70 pt-4 text-[11px] font-semibold uppercase tracking-wide text-brand-700/70">Meaning</p>
      <label className="block">
        <span className={labelCls}>Significance</span>
        <textarea className={`${areaCls}`} rows={3} value={c.significance} onChange={(e) => set('significance', e.target.value)} />
      </label>
      <label className="block">
        <span className={labelCls}>Special observance</span>
        <textarea className={`${areaCls}`} rows={2} value={c.specialObservance || ''} onChange={(e) => set('specialObservance', e.target.value || undefined)} />
      </label>
      <p className="border-t border-sandal-200/70 pt-4 text-[11px] font-semibold uppercase tracking-wide text-brand-700/70">Katha</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Katha — scripture</span>
          <input className={inputCls} value={c.katha.scripture} onChange={(e) => set('katha', { ...c.katha, scripture: e.target.value })} />
        </label>
        <label>
          <span className={labelCls}>Katha — speakers</span>
          <input className={inputCls} value={c.katha.speakers} onChange={(e) => set('katha', { ...c.katha, speakers: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Story (blank line between paragraphs)</span>
        <textarea
          className={`${areaCls} font-serif`}
          rows={10}
          value={c.katha.paragraphs.join('\n\n')}
          onChange={(e) => set('katha', { ...c.katha, paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Spiritual lessons (one per line)</span>
        <textarea className={`${areaCls}`} rows={4} value={c.lessons.join('\n')} onChange={(e) => set('lessons', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} />
      </label>

      <div className="border-t border-sandal-200/70 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/70">Srila Prabhupada’s teachings</span>
          <button className={btnGhost} style={{ minHeight: 0 }} onClick={() => set('teachings', [...c.teachings, { summary: '', reference: '' }])}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="space-y-3">
          {c.teachings.map((t, i) => (
            <div key={i} className="space-y-2 rounded-2xl border border-sandal-200 bg-sandal-50 p-3">
              <textarea className={`${areaCls}`} rows={2} placeholder="Summary in your own words" value={t.summary} onChange={(e) => setTeaching(i, { summary: e.target.value })} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Reference, e.g. SB 9.4.29 purport" value={t.reference} onChange={(e) => setTeaching(i, { reference: e.target.value })} />
                <input className={inputCls} placeholder="https://vedabase.io/…" value={t.url || ''} onChange={(e) => setTeaching(i, { url: e.target.value || undefined })} />
              </div>
              <textarea
                className={areaCls}
                rows={2}
                placeholder="Optional verbatim quotation — paste exactly from Vedabase"
                value={t.quote || ''}
                onChange={(e) => setTeaching(i, { quote: e.target.value || undefined, quoteVerified: false })}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex min-w-0 items-start gap-2 text-xs text-maroon-900/65">
                  <input type="checkbox" checked={!!t.quoteVerified} disabled={!t.quote} onChange={(e) => setTeaching(i, { quoteVerified: e.target.checked })} />
                  Quotation checked word-for-word against the reference (only then is it displayed)
                </label>
                <button className="h-9 px-2 text-xs font-semibold text-red-500" style={{ minHeight: 0 }} onClick={() => set('teachings', c.teachings.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Scriptural references — one per line: label | url | note</span>
        <textarea className={`${areaCls} font-mono text-xs`} rows={4} value={scriptureText} onChange={(e) => setScriptureText(e.target.value)} />
      </label>
      <label className="block">
        <span className={labelCls}>Sources — one per line: label | url | note</span>
        <textarea className={`${areaCls} font-mono text-xs`} rows={3} value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} />
      </label>
      <label className="block">
        <span className={labelCls}>Review note (shown to readers)</span>
        <input className={inputCls} value={c.reviewNote || ''} onChange={(e) => set('reviewNote', e.target.value || undefined)} />
      </label>

      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <label className="flex items-start gap-2 text-sm text-emerald-900">
          <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I have checked this story, the references and Srila Prabhupada’s teachings against the cited sources, and nothing is fabricated.
        </label>
        <div className="flex flex-wrap gap-2">
          <button className={btnSecondary} style={{ minHeight: 0 }} onClick={() => save('needs_review')} disabled={saving}>
            <Save size={14} /> Save as needs review
          </button>
          <button className={btnPrimary} style={{ minHeight: 0 }} onClick={() => save('verified')} disabled={saving || !checked}>
            <ShieldCheck size={14} /> Save &amp; mark verified
          </button>
          <button className={btnGhost} style={{ minHeight: 0 }} onClick={revert}>
            Load bundled version
          </button>
        </div>
      </div>
    </div>
  );
};

const ContentAdmin: React.FC = () => {
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const confirmAsk = (text: string) => askText(ask, text);
  const [content, setContent] = useState<Record<string, EkadashiContent>>({});
  const [slug, setSlug] = useState(EKADASHI_CONTENT[0].slug);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => loadEkadashiContent(true).then(setContent), []);
  useEffect(() => {
    reload();
  }, [reload]);

  const list = EKADASHI_CONTENT.map((c) => content[c.slug] || c);
  const verified = list.filter((c) => c.status === 'verified').length;

  const seed = async () => {
    if (!await confirmAsk('Write the bundled researched content for all Ekadashis that are not yet in the database?')) return;
    setBusy(true);
    try {
      const n = await seedEkadashiContent(false);
      toast.showSuccess(n ? `${n} Ekadashi entries written to the database` : 'All entries already exist in the database');
      reload();
    } catch (e) {
      toast.showError(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {dialog}
      <aside className={`${card} min-w-0 space-y-3 self-start`}>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-maroon-900">Ekadashis</p>
            <p className="text-xs text-maroon-900/50">
              {verified} of {list.length} verified
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sandal-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${list.length ? (verified / list.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="max-h-60 space-y-0.5 overflow-y-auto pr-0.5 lg:max-h-[62vh]">
          {list.map((c, i) => (
            <button
              key={c.slug}
              onClick={() => setSlug(c.slug)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                slug === c.slug ? 'bg-amber-50 font-semibold text-maroon-900 ring-1 ring-amber-200' : 'text-maroon-900/70 hover:bg-sandal-50'
              }`}
              style={{ minHeight: 0 }}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${slug === c.slug ? 'bg-brand-600 text-white' : 'bg-sandal-100 text-maroon-900/50'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 break-words leading-tight">{c.name}</span>
              {c.status === 'verified' ? <ShieldCheck size={15} className="shrink-0 text-emerald-600" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="Not verified yet" />}
            </button>
          ))}
        </div>
        <button className={`${btnSecondary} w-full`} style={{ minHeight: 0 }} onClick={seed} disabled={busy}>
          <Database size={14} /> Sync bundled content
        </button>
      </aside>
      <div className={`${card} min-w-0`}>{content[slug] && <ContentEditor key={slug} initial={content[slug]} onSaved={reload} />}</div>
    </div>
  );
};

/* ================================================================= Root === */

const EkadashiAdmin: React.FC = () => {
  const [tab, setTab] = useState<'dates' | 'content'>('dates');
  return (
    <div className="min-w-0 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-sandal-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-soft sm:p-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-marigold-400 to-brand-500 text-white shadow-soft">
            <Moon size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-maroon-900">Ekadashi</h2>
            <p className="mt-0.5 text-sm text-maroon-900/55">Check dates and parana times against the official ISKCON calendars, and review the reading content.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/70 p-1 ring-1 ring-sandal-200 sm:inline-grid sm:grid-cols-[auto_auto]" role="tablist">
          {([
            ['dates', 'Dates', CalendarCheck],
            ['content', 'Content', BookOpen],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              style={{ minHeight: 0 }}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-5 text-sm font-semibold transition ${tab === id ? 'bg-brand-600 text-white shadow-soft' : 'text-maroon-900/60 hover:text-maroon-900'}`}
              onClick={() => setTab(id)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'dates' ? <DatesAdmin /> : <ContentAdmin />}
    </div>
  );
};

export default EkadashiAdmin;
