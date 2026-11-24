import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Languages, Loader2, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { submitSlokaRequest } from '../services/requests';
import MantraText from './MantraText';
import { useKeyboardSafe } from './useKeyboardSafe';

const SHORT = { hi: 'Hindi', te: 'Telugu' } as const;
const NATIVE = { hi: 'हिन्दी', te: 'తెలుగు' } as const;

interface Props {
  sloka: { id: string; title: string; mantra: string; meaning?: string };
  lang: 'hi' | 'te';
  onClose: () => void;
}

const field =
  'block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3 text-[15px] text-maroon-900 placeholder:text-maroon-900/30 transition focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

/**
 * Lets a devotee write the Hindi / Telugu version of a mantra.
 * It is sent to the team for review, then shown to everyone.
 */
const MantraTranslateForm: React.FC<Props> = ({ sloka, lang, onClose }) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const kb = useKeyboardSafe();
  const [mantra, setMantra] = useState('');
  const [meaning, setMeaning] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.uid === 'guest') return showError('Please sign in to add a version');
    if (!mantra.trim()) return showError('Please write the mantra');
    setBusy(true);
    try {
      await submitSlokaRequest({
        title: `${SHORT[lang]} version — ${sloka.title}`,
        sanskrit: mantra.trim(),
        transliteration: '',
        translation: meaning.trim(),
        category: `${SHORT[lang]} version`,
        purport: '',
        reference: `translation:${lang}:${sloka.id}`,
        requesterId: user.uid,
        requesterName: user.displayName || 'Devotee',
        requesterEmail: user.email || '',
      });
      showSuccess('Thank you', 'Your version will be shown after it is checked.');
      onClose();
    } catch (err) {
      console.error(err);
      showError('Could not send. Please try again.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" style={kb} role="dialog" aria-modal="true" aria-label={`Add the ${SHORT[lang]} version`}>
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} />
      <form
        onSubmit={submit}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        className="relative flex max-h-[94%] w-full animate-rise-in flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift sm:max-w-lg sm:rounded-[28px]"
      >
        {/* Header */}
        <header className="border-b border-sandal-200/80 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-brand-500 ring-1 ring-amber-200">
              <Languages size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-maroon-900">
                Add {SHORT[lang]} version <span className="font-normal text-maroon-900/45">· {NATIVE[lang]}</span>
              </h3>
              <p className="truncate text-sm text-maroon-900/55">{sloka.title}</p>
            </div>
            <button type="button" onClick={onClose} className="icon-btn -mr-1" aria-label="Close" disabled={busy}>
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Fields */}
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-maroon-900/45">English (for reference)</p>
            <div className="rounded-2xl bg-sandal-50 px-3 py-3 text-center text-sm font-medium text-maroon-900/75 ring-1 ring-sandal-200">
              <MantraText text={sloka.mantra} />
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-maroon-900">Mantra in {SHORT[lang]}</span>
            <textarea
              rows={4}
              value={mantra}
              onChange={(e) => setMantra(e.target.value)}
              className={`${field} resize-none leading-relaxed`}
              placeholder={`Type the mantra in ${SHORT[lang]} script`}
            />
          </label>

          {mantra.trim().split(/\s+/).length >= 2 && (
            <div className="animate-fadeIn rounded-2xl bg-amber-50/70 px-3 py-3 text-center font-medium text-maroon-900 ring-1 ring-amber-100">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600/70">Preview</p>
              <MantraText text={mantra} />
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-maroon-900">
              Meaning in {SHORT[lang]} <span className="font-normal text-maroon-900/40">(optional)</span>
            </span>
            <textarea rows={3} value={meaning} onChange={(e) => setMeaning(e.target.value)} className={`${field} resize-none leading-relaxed`} />
          </label>

          <p className="text-xs leading-relaxed text-maroon-900/45">Please check every letter carefully. It is shown to everyone after a quick review.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-sandal-200 bg-white px-5 pt-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={busy || !mantra.trim()} className="btn-primary flex-[1.4] disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {busy ? 'Sending…' : 'Send for review'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default MantraTranslateForm;
