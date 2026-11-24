import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Send, Check, ChevronDown, Wand2, Smartphone } from 'lucide-react';
import MantraText from './MantraText';
import { LINE_CHOICES } from '../utils/mantraText';
import { transliterate } from '../utils/transliterate';
import { useKeyboardSafe } from './useKeyboardSafe';

export interface MantraFormValues {
  title: string;
  mantra: string;
  meaning: string;
  category: string;
  /** undefined = Auto, 0 = as typed, n = n lines (admins only) */
  lines?: number;
  hiMantra: string;
  hiMeaning: string;
  teMantra: string;
  teMeaning: string;
}

export const MANTRA_CATEGORIES = ['Mantra', 'Prayer', 'Kirtan', 'Bhagavad-gita', 'Srimad-Bhagavatam', 'Other'];

const EMPTY: MantraFormValues = { title: '', mantra: '', meaning: '', category: 'Mantra', lines: undefined, hiMantra: '', hiMeaning: '', teMantra: '', teMeaning: '' };

const field =
  'block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-2.5 text-[15px] text-maroon-900 placeholder:text-maroon-900/30 transition focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const Step: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({ n, title, hint, children }) => (
  <section className="flex gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-brand-700">{n}</span>
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-maroon-900">{title}</h4>
        {hint && <span className="text-xs text-maroon-900/45">{hint}</span>}
      </div>
      {children}
    </div>
  </section>
);

interface Props {
  /** suggest = devotee sends for review · admin = add now · edit = admin changes an existing one */
  mode: 'suggest' | 'admin' | 'edit';
  initial?: Partial<MantraFormValues>;
  onClose: () => void;
  onSubmit: (values: MantraFormValues) => Promise<void>;
}

const TEXT = {
  suggest: { title: 'Add a mantra', sub: 'The team checks it, then it is added for everyone.', button: 'Send for review', icon: Send },
  admin: { title: 'Add a mantra', sub: 'It shows in the library straight away.', button: 'Add mantra', icon: Check },
  edit: { title: 'Edit mantra', sub: 'Changes show for everyone straight away.', button: 'Save changes', icon: Check },
};

/** One sheet for "Suggest a mantra" (devotees) and "Add / Edit a mantra" (admins). */
const MantraForm: React.FC<Props> = ({ mode, initial, onClose, onSubmit }) => {
  const admin = mode !== 'suggest';
  const copy = TEXT[mode];
  const [v, setV] = useState<MantraFormValues>({ ...EMPTY, ...initial });
  const [more, setMore] = useState(!!(initial?.hiMantra || initial?.teMantra));
  const [tab, setTab] = useState<'hi' | 'te'>('hi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const kb = useKeyboardSafe();

  const set = (patch: Partial<MantraFormValues>) => setV((x) => ({ ...x, ...patch }));
  const ready = v.title.trim() && v.mantra.trim();
  const words = v.mantra.trim().split(/\s+/).filter(Boolean).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return setError('Please add a name and the mantra.');
    setBusy(true);
    setError('');
    try {
      await onSubmit(v);
    } catch (err) {
      console.error(err);
      setError('Could not save. Please check your internet and try again.');
      setBusy(false);
    }
  };

  const autoFill = () => {
    try {
      const draft = transliterate(v.mantra, tab);
      set(tab === 'hi' ? { hiMantra: draft } : { teMantra: draft });
    } catch {
      /* ignore */
    }
  };

  const Icon = copy.icon;
  const transKey = tab === 'hi' ? 'hiMantra' : 'teMantra';
  const meanKey = tab === 'hi' ? 'hiMeaning' : 'teMeaning';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" style={kb} role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} />

      <form
        onSubmit={submit}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        className="relative flex max-h-[94%] w-full animate-rise-in flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift sm:max-w-xl sm:rounded-[28px]"
      >
        {/* Header */}
        <header className="border-b border-sandal-200/80 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-maroon-900">{copy.title}</h3>
              <p className="mt-0.5 text-sm text-maroon-900/55">{copy.sub}</p>
            </div>
            <button type="button" onClick={onClose} className="icon-btn -mr-1" aria-label="Close" disabled={busy}>
              <X size={19} />
            </button>
          </div>
        </header>

        {/* Fields */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain scroll-smooth px-5 py-5 sm:px-6">
          <Step n={1} title="Name and type">
            <input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Hare Krishna Maha-mantra" className={field} autoFocus={mode !== 'edit'} />
            <div className="scrollbar-none -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              {MANTRA_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set({ category: c })}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 transition ${v.category === c ? 'bg-amber-100 text-brand-700 ring-amber-300' : 'bg-white text-maroon-800/65 ring-sandal-200 hover:bg-sandal-50'}`}
                  style={{ minHeight: 0 }}
                >
                  {c}
                </button>
              ))}
            </div>
          </Step>

          <Step n={2} title="The mantra" hint="English letters are fine">
            <textarea
              rows={4}
              value={v.mantra}
              onChange={(e) => set({ mantra: e.target.value })}
              placeholder={'Hare Krishna Hare Krishna Krishna Krishna Hare Hare\nHare Rama Hare Rama Rama Rama Hare Hare'}
              className={`${field} resize-y leading-relaxed`}
            />
            <p className="mt-1.5 text-xs text-maroon-900/45">Press Enter to start a new line.</p>

            {admin && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold text-maroon-900/60">Show it in</p>
                <div className="grid grid-cols-6 gap-1 rounded-xl bg-sandal-100/80 p-1">
                  {LINE_CHOICES.map((c) => {
                    const on = v.lines === c.value;
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => set({ lines: c.value })}
                        className={`rounded-lg px-1 py-1.5 text-[12px] font-semibold transition ${on ? 'bg-white text-brand-700 shadow-sm ring-1 ring-amber-200' : 'text-maroon-800/60 hover:text-maroon-900'}`}
                        style={{ minHeight: 0 }}
                        aria-pressed={on}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-maroon-900/40">Numbers = lines. "As typed" keeps your own line breaks.</p>
              </div>
            )}

            {words >= 2 && (
              <div className="mt-3 rounded-2xl bg-sandal-50 p-3 ring-1 ring-sandal-200/80">
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-maroon-900/45">
                  <Smartphone size={12} /> On a phone
                </p>
                <div className="mx-auto max-w-[320px] rounded-xl bg-amber-50 px-3 py-3 text-center font-medium text-maroon-900 ring-1 ring-amber-200/70">
                  <MantraText text={v.mantra} lines={admin ? v.lines : 0} />
                </div>
              </div>
            )}
          </Step>

          <Step n={3} title="Meaning" hint="Optional">
            <textarea rows={3} value={v.meaning} onChange={(e) => set({ meaning: e.target.value })} placeholder="What does it mean, in simple words?" className={`${field} resize-y leading-relaxed`} />
          </Step>

          {admin && (
            <div className="rounded-2xl ring-1 ring-sandal-200">
              <button type="button" onClick={() => setMore(!more)} className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={more} style={{ minHeight: 0 }}>
                <span>
                  <span className="block text-sm font-semibold text-maroon-900">Hindi and Telugu</span>
                  <span className="block text-xs text-maroon-900/45">Optional. Devotees can also send these.</span>
                </span>
                <ChevronDown size={17} className={`text-maroon-900/40 transition-transform ${more ? 'rotate-180' : ''}`} />
              </button>
              {more && (
                <div className="animate-fadeIn space-y-3 border-t border-sandal-200 px-4 pb-4 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex rounded-xl bg-sandal-100/80 p-1">
                      {(['hi', 'te'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setTab(l)}
                          className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${tab === l ? 'bg-white text-brand-700 shadow-sm' : 'text-maroon-800/60'}`}
                          style={{ minHeight: 0 }}
                        >
                          {l === 'hi' ? 'हिन्दी Hindi' : 'తెలుగు Telugu'}
                        </button>
                      ))}
                    </div>
                    {v.mantra.trim() && (
                      <button type="button" onClick={autoFill} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline" style={{ minHeight: 0 }}>
                        <Wand2 size={14} /> Fill a draft
                      </button>
                    )}
                  </div>
                  <textarea rows={3} value={v[transKey]} onChange={(e) => set({ [transKey]: e.target.value } as Partial<MantraFormValues>)} placeholder={tab === 'hi' ? 'Mantra in Hindi' : 'Mantra in Telugu'} className={`${field} resize-y leading-relaxed`} />
                  <textarea rows={2} value={v[meanKey]} onChange={(e) => set({ [meanKey]: e.target.value } as Partial<MantraFormValues>)} placeholder={tab === 'hi' ? 'Meaning in Hindi (optional)' : 'Meaning in Telugu (optional)'} className={`${field} resize-y`} />
                  {v[transKey].trim().split(/\s+/).length >= 2 && (
                    <div className="mx-auto max-w-[320px] rounded-xl bg-amber-50 px-3 py-3 text-center font-medium text-maroon-900 ring-1 ring-amber-200/70">
                      <MantraText text={v[transKey]} lines={v.lines} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-sandal-200 bg-white px-5 pt-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={busy || !ready} className="btn-primary flex-[1.6] disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
            {busy ? 'Saving…' : copy.button}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default MantraForm;
