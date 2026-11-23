import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Languages, Loader2, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { submitSlokaRequest } from '../services/requests';
import { transliterate } from '../utils/transliterate';
import MantraText from './MantraText';

const NAMES = { hi: 'Hindi (हिन्दी)', te: 'Telugu (తెలుగు)' } as const;
const SHORT = { hi: 'Hindi', te: 'Telugu' } as const;

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
  // a first draft written by the app — the devotee checks every letter
  const [draft] = useState(() => {
    try {
      return transliterate(sloka.mantra, lang);
    } catch {
      return '';
    }
  });
  const [mantra, setMantra] = useState(draft);
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
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Add the ${SHORT[lang]} version`}>
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} />
      <form onSubmit={submit} style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }} className="relative flex max-h-[92dvh] w-full animate-rise-in flex-col overflow-hidden rounded-t-[28px] bg-white sm:max-w-lg sm:rounded-[28px]">
        <div className="bg-gradient-to-br from-amber-100 via-orange-50 to-white px-5 pb-4 pt-5 sm:px-6">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-sm ring-1 ring-amber-200">
              <Languages size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-maroon-900">Add the {SHORT[lang]} version</h3>
              <p className="truncate text-sm text-maroon-900/55">{sloka.title}</p>
            </div>
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Close" disabled={busy}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="rounded-2xl bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-maroon-900/75">
            Please take a little time to write this mantra <b>correctly</b> in {NAMES[lang]}. It will help every devotee who wants to recite it.
          </p>

          <div>
            <p className="mb-1 text-xs font-semibold text-maroon-900/50">English</p>
            <p className="rounded-xl bg-sandal-50 px-3.5 py-2.5 text-sm text-maroon-900/70">{sloka.mantra}</p>
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-maroon-900">The mantra in {SHORT[lang]}</span>
              {draft && <span className="text-xs text-maroon-900/40">First draft added — please check every letter</span>}
            </span>
            <textarea rows={3} value={mantra} onChange={(e) => setMantra(e.target.value)} className={`${field} resize-none leading-relaxed`} placeholder={lang === 'hi' ? 'हरे कृष्ण हरे कृष्ण…' : 'హరే కృష్ణ హరే కృష్ణ…'} autoFocus />
          </label>

          {mantra.trim().split(/\s+/).length >= 2 && (
            <div className="rounded-2xl bg-amber-50/70 px-3 py-3 text-center font-medium text-maroon-900">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600/70">How it will look</p>
              <MantraText text={mantra} />
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-maroon-900">
              Meaning in {SHORT[lang]} <span className="font-normal text-maroon-900/40">(optional)</span>
            </span>
            <textarea rows={3} value={meaning} onChange={(e) => setMeaning(e.target.value)} className={`${field} resize-none leading-relaxed`} />
          </label>
        </div>

        <div className="flex gap-2 border-t border-sandal-200 px-5 pt-4 sm:px-6">
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
