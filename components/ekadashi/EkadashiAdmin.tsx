import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
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

  const field = 'field';
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-stone-900">Official Ekadashi record</h3>
            <p className="text-xs text-stone-500">
              {findPreset(r.locationId)?.name} · times are local wall-clock as printed in the source (24h)
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="field-label">Ekadashi</span>
            <select className={field} value={r.slug} onChange={(e) => set('slug', e.target.value)}>
              {SLUGS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Fasting date *</span>
            <input type="date" className={field} value={r.fastDate} onChange={(e) => setR((x) => ({ ...x, fastDate: e.target.value, paranaDate: x.paranaDate || (e.target.value ? addDaysKey(e.target.value, 1) : '') }))} />
          </label>
          <label>
            <span className="field-label">Parana date</span>
            <input type="date" className={field} value={r.paranaDate} onChange={(e) => set('paranaDate', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Parana start</span>
            <input type="time" className={field} value={r.paranaStart || ''} onChange={(e) => set('paranaStart', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Parana end (blank = “after start”)</span>
            <input type="time" className={field} value={r.paranaEnd || ''} onChange={(e) => set('paranaEnd', e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Parana note (as printed)</span>
            <input className={field} value={r.paranaNote || ''} placeholder="e.g. Sunrise – End of tithi" onChange={(e) => set('paranaNote', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Ekadashi tithi begins</span>
            <input type="datetime-local" className={field} value={r.ekadashiStart || ''} onChange={(e) => set('ekadashiStart', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Ekadashi tithi ends</span>
            <input type="datetime-local" className={field} value={r.ekadashiEnd || ''} onChange={(e) => set('ekadashiEnd', e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Mahadvadashi label (if any)</span>
            <input className={field} value={r.mahadvadashi || ''} placeholder="e.g. Trisprsa Mahadvadasi" onChange={(e) => set('mahadvadashi', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Source name *</span>
            <input className={field} value={r.sourceName} placeholder="e.g. ISKCON Mayapur GCal 2027" onChange={(e) => set('sourceName', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Source URL</span>
            <input className={field} value={r.sourceUrl || ''} placeholder="https://…" onChange={(e) => set('sourceUrl', e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Verification status</span>
            <select className={field} value={r.status} onChange={(e) => set('status', e.target.value as ObservanceStatus)}>
              <option value="source_imported">Official source — review pending</option>
              <option value="verified">Verified against official ISKCON calendar</option>
              <option value="disputed">Disputed — sources disagree</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Admin notes</span>
            <textarea className={field} rows={2} value={r.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-4">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
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

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await loadObservanceSources(cityId);
    setDbRecords(res.db);
    setSeedRecords(res.seed);
    setDbError(res.dbError);
    setLoading(false);
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
    if (status === 'verified' && !confirm(`Mark ${nameOf(r.slug)} on ${r.fastDate} for ${city.name} as VERIFIED?\n\nOnly do this after checking the date and parana times against the official ISKCON calendar (${r.record.sourceName}).`)) return;
    try {
      await saveObservance({ ...r.record, status });
      toast.showSuccess(status === 'verified' ? 'Marked verified' : 'Status updated');
      reload();
    } catch (e) {
      toast.showError(`Failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  const verifyAllMatching = async () => {
    const candidates = rows.filter((r) => r.record && r.status === 'source_imported' && r.discrepancies.length === 0 && r.record.sourceUrl);
    if (!candidates.length) return toast.showInfo('No unreviewed records that match the calculation exactly.');
    if (!confirm(`Mark ${candidates.length} official records for ${city.name} (${year}) as VERIFIED?\n\nThese come from a published GCal calendar and agree with the independent calculation (date, and parana within 5 minutes). Please spot-check the source before confirming.`)) return;
    setBusy(true);
    try {
      for (const r of candidates) await saveObservance({ ...r.record!, status: 'verified', notes: [r.record!.notes, 'Bulk-verified: official source agrees with independent calculation.'].filter(Boolean).join(' ') });
      toast.showSuccess(`${candidates.length} records verified`);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const importSeed = async () => {
    if (!confirm(`Copy ${OFFICIAL_SEED.length} bundled official GCal records (6 cities, 2026–2027) into the database?\nExisting database records are not overwritten. Status stays "review pending".`)) return;
    setBusy(true);
    try {
      const n = await seedOfficialObservances();
      toast.showSuccess(`${n} records written to the database`);
      reload();
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
      if (!valid.has(slug) || !/^\d{4}-\d{2}-\d{2}$/.test(fastDate || '') || !sourceName) {
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
      reload();
    } finally {
      setBusy(false);
    }
  };

  const hm = (ms: number | null) => (ms === null ? '—' : formatTime(ms, city.tz, false));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="field-label">City</span>
          <select className="field" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {PRESET_LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.country})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Year</span>
          <select className="field" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-stone-600">
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Only items needing attention
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn-secondary btn-sm" onClick={() => setCsvOpen((v) => !v)}>
            <Upload size={14} /> Bulk import
          </button>
          <button className="btn-secondary btn-sm" onClick={importSeed} disabled={busy}>
            <Database size={14} /> Import bundled GCal data
          </button>
          <button className="btn-primary btn-sm" onClick={() => setEditing({ rec: emptyRecord(cityId) })}>
            <Plus size={14} /> Add record
          </button>
        </div>
      </div>

      {dbError && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          Database read failed ({dbError}). Make sure the <code>ekadashi</code> rules in database.rules.json are deployed.
        </p>
      )}

      {csvOpen && (
        <div className="space-y-2 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <p className="text-xs text-stone-600">
            Paste official data for <b>{city.name}</b>, one Ekadashi per line: <code>{CSV_HELP}</code>. Times are 24h local. Records are saved as “review pending”.
          </p>
          <textarea className="field font-mono text-xs" rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={`utpanna,2027-11-24,2027-11-25,05:56,09:34,ISKCON Mayapur GCal 2027,https://…`} />
          <button className="btn-primary btn-sm" onClick={importCsv} disabled={busy || !csv.trim()}>
            Import lines
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="badge-green">{stats.verified} verified</span>
        <span className="badge-blue">{stats.imported} official · review pending</span>
        <span className="badge bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">{stats.calculated} calculated only</span>
        <span className="badge-red">{stats.issues} with discrepancies</span>
        {stats.imported > 0 && (
          <button className="badge-green cursor-pointer hover:bg-emerald-100" onClick={verifyAllMatching} disabled={busy}>
            <ShieldCheck size={12} /> Verify all that match calculation…
          </button>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Ekadashi</th>
                <th className="px-3 py-2">Calculated</th>
                <th className="px-3 py-2">Official record</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {shown.map((r) => (
                <tr key={r.key} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-stone-900">{nameOf(r.slug)}</p>
                    <p className="text-xs text-stone-500">{formatDateKey(r.fastDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-stone-600">
                    {r.calc ? (
                      <>
                        <p>Fast {r.calc.fastDate}</p>
                        <p>
                          Parana {hm(r.calc.paranaStart)}–{hm(r.calc.paranaEnd)}
                        </p>
                        {r.calc.rule !== 'shuddha' && <p className="text-brand-700">{RULE_LABELS[r.calc.rule].title}</p>}
                        {r.calc.reviewFlags
                          .filter((f) => f.startsWith('Borderline'))
                          .map((f) => (
                            <p key={f} className="mt-1 flex gap-1 text-amber-700">
                              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> borderline
                            </p>
                          ))}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-stone-600">
                    {r.record ? (
                      <>
                        <p>Fast {r.record.fastDate}</p>
                        <p>
                          Parana {r.record.paranaStart || '—'}–{r.record.paranaEnd || '…'}
                        </p>
                        {r.record.mahadvadashi && <p className="text-brand-700">{r.record.mahadvadashi}</p>}
                        <p className="mt-1 flex items-center gap-1 text-stone-400">
                          {r.origin === 'seed' ? 'bundled seed' : 'database'}
                          {r.record.sourceUrl && (
                            <a href={r.record.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-600" title={r.record.sourceName}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </p>
                        {r.discrepancies.map((d) => (
                          <p key={d} className="mt-1 text-red-600">
                            {d}
                          </p>
                        ))}
                      </>
                    ) : (
                      <span className="text-stone-400">No official record</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={r.status} />
                    {r.record?.verifiedBy && <p className="mt-1 text-[11px] text-stone-400">by {r.record.verifiedBy}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      {r.record && r.status !== 'verified' && (
                        <button className="icon-btn h-8 w-8 text-emerald-600" title="Mark verified" onClick={() => setStatus(r, 'verified')}>
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      {r.record && r.status !== 'disputed' && (
                        <button className="icon-btn h-8 w-8 text-red-500" title="Mark disputed" onClick={() => setStatus(r, 'disputed')}>
                          <Flag size={15} />
                        </button>
                      )}
                      <button
                        className="icon-btn h-8 w-8"
                        title={r.record ? 'Edit record' : 'Add official record'}
                        onClick={() =>
                          setEditing(
                            r.record
                              ? { rec: { ...r.record }, originalKey: r.origin === 'database' ? r.record.fastDate : undefined }
                              : { rec: emptyRecord(cityId, r.slug, r.fastDate) }
                          )
                        }
                      >
                        {r.record ? <Edit3 size={15} /> : <Plus size={15} />}
                      </button>
                      {r.origin === 'database' && (
                        <button
                          className="icon-btn h-8 w-8 text-stone-400 hover:text-red-600"
                          title="Delete database record"
                          onClick={async () => {
                            if (!confirm('Delete this database record? (A bundled seed record for the same date, if any, will show again.)')) return;
                            await deleteObservance(cityId, r.record!.fastDate);
                            reload();
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nothing to show.</p>}
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
    });

const ContentEditor: React.FC<{ initial: EkadashiContent; onSaved: () => void }> = ({ initial, onSaved }) => {
  const toast = useToast();
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

  const revert = () => {
    const b = bundledContent(c.slug);
    if (b && confirm('Discard edits and load the bundled (researched) version into the editor?')) {
      setC(b);
      setScriptureText(refsToText(b.scripture));
      setSourcesText(refsToText(b.sources));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Name</span>
          <input className="field" value={c.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          <span className="field-label">Other names (comma separated)</span>
          <input className="field" value={c.altNames.join(', ')} onChange={(e) => set('altNames', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
        </label>
        <label>
          <span className="field-label">Month</span>
          <input className="field" value={c.month} onChange={(e) => set('month', e.target.value)} />
        </label>
        <label>
          <span className="field-label">Paksha</span>
          <select className="field" value={c.paksha} onChange={(e) => set('paksha', e.target.value as 'shukla' | 'krishna')}>
            <option value="shukla">Shukla</option>
            <option value="krishna">Krishna</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="field-label">One-line summary</span>
        <input className="field" value={c.summary} onChange={(e) => set('summary', e.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">Significance</span>
        <textarea className="field" rows={3} value={c.significance} onChange={(e) => set('significance', e.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">Special observance</span>
        <textarea className="field" rows={2} value={c.specialObservance || ''} onChange={(e) => set('specialObservance', e.target.value || undefined)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Katha — scripture</span>
          <input className="field" value={c.katha.scripture} onChange={(e) => set('katha', { ...c.katha, scripture: e.target.value })} />
        </label>
        <label>
          <span className="field-label">Katha — speakers</span>
          <input className="field" value={c.katha.speakers} onChange={(e) => set('katha', { ...c.katha, speakers: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Story (blank line between paragraphs)</span>
        <textarea
          className="field font-serif"
          rows={10}
          value={c.katha.paragraphs.join('\n\n')}
          onChange={(e) => set('katha', { ...c.katha, paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })}
        />
      </label>
      <label className="block">
        <span className="field-label">Spiritual lessons (one per line)</span>
        <textarea className="field" rows={4} value={c.lessons.join('\n')} onChange={(e) => set('lessons', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="field-label mb-0">Srila Prabhupada’s teachings</span>
          <button className="btn-ghost btn-sm" onClick={() => set('teachings', [...c.teachings, { summary: '', reference: '' }])}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="space-y-3">
          {c.teachings.map((t, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
              <textarea className="field" rows={2} placeholder="Summary in your own words" value={t.summary} onChange={(e) => setTeaching(i, { summary: e.target.value })} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="field" placeholder="Reference, e.g. SB 9.4.29 purport" value={t.reference} onChange={(e) => setTeaching(i, { reference: e.target.value })} />
                <input className="field" placeholder="https://vedabase.io/…" value={t.url || ''} onChange={(e) => setTeaching(i, { url: e.target.value || undefined })} />
              </div>
              <textarea
                className="field"
                rows={2}
                placeholder="Optional verbatim quotation — paste exactly from Vedabase"
                value={t.quote || ''}
                onChange={(e) => setTeaching(i, { quote: e.target.value || undefined, quoteVerified: false })}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-stone-600">
                  <input type="checkbox" checked={!!t.quoteVerified} disabled={!t.quote} onChange={(e) => setTeaching(i, { quoteVerified: e.target.checked })} />
                  Quotation checked word-for-word against the reference (only then is it displayed)
                </label>
                <button className="text-xs text-red-500 hover:underline" onClick={() => set('teachings', c.teachings.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="field-label">Scriptural references — one per line: label | url | note</span>
        <textarea className="field font-mono text-xs" rows={4} value={scriptureText} onChange={(e) => setScriptureText(e.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">Sources — one per line: label | url | note</span>
        <textarea className="field font-mono text-xs" rows={3} value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">Review note (shown to readers)</span>
        <input className="field" value={c.reviewNote || ''} onChange={(e) => set('reviewNote', e.target.value || undefined)} />
      </label>

      <div className="space-y-3 rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-200">
        <label className="flex items-start gap-2 text-sm text-emerald-900">
          <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I have checked this story, the references and Srila Prabhupada’s teachings against the cited sources, and nothing is fabricated.
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => save('needs_review')} disabled={saving}>
            <Save size={14} /> Save as needs review
          </button>
          <button className="btn-primary btn-sm" onClick={() => save('verified')} disabled={saving || !checked}>
            <ShieldCheck size={14} /> Save &amp; mark verified
          </button>
          <button className="btn-ghost btn-sm" onClick={revert}>
            Load bundled version
          </button>
        </div>
      </div>
    </div>
  );
};

const ContentAdmin: React.FC = () => {
  const toast = useToast();
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
    if (!confirm('Write the bundled researched content for all Ekadashis that are not yet in the database?')) return;
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
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            {verified}/{list.length} verified
          </p>
          <button className="btn-secondary btn-sm" onClick={seed} disabled={busy}>
            <Database size={13} /> Sync to DB
          </button>
        </div>
        <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl bg-stone-50 p-1.5 ring-1 ring-stone-200">
          {list.map((c) => (
            <button
              key={c.slug}
              onClick={() => setSlug(c.slug)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${slug === c.slug ? 'bg-white shadow-soft ring-1 ring-stone-200' : 'hover:bg-white/70'}`}
            >
              <span className="truncate">{c.name}</span>
              {c.status === 'verified' ? <ShieldCheck size={14} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={14} className="shrink-0 text-amber-500" />}
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0">
        {content[slug] && <ContentEditor key={slug} initial={content[slug]} onSaved={reload} />}
      </div>
    </div>
  );
};

/* ================================================================= Root === */

const EkadashiAdmin: React.FC = () => {
  const [tab, setTab] = useState<'dates' | 'content'>('dates');
  return (
    <div className="space-y-5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-200 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">Ekadashi management</h2>
          <p className="text-sm text-stone-500">Verify dates and timings against official ISKCON calendars, and review the reading content.</p>
        </div>
        <div className="tabs">
          <button className={`tab flex items-center gap-1.5 ${tab === 'dates' ? 'tab-active' : ''}`} onClick={() => setTab('dates')}>
            <CalendarCheck size={14} /> Verified dates
          </button>
          <button className={`tab flex items-center gap-1.5 ${tab === 'content' ? 'tab-active' : ''}`} onClick={() => setTab('content')}>
            <BookOpen size={14} /> Content
          </button>
        </div>
      </div>
      {tab === 'dates' ? <DatesAdmin /> : <ContentAdmin />}
    </div>
  );
};

export default EkadashiAdmin;
