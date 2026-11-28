import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { submitLanguageRequest } from '../services/requests';
import { useKeyboardSafe } from './useKeyboardSafe';

/** Ask for a new Mantras language — an admin approves it before it appears. */
const LanguageRequestForm: React.FC<{ existing: string[]; onClose: () => void }> = ({ existing, onClose }) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const kb = useKeyboardSafe();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!user || user.uid === 'guest') return showError('Please sign in to request a language');
    if (!clean) return;
    if (existing.some((x) => x.toLowerCase() === clean.toLowerCase())) return showError('This language is already available');
    setBusy(true);
    try {
      await submitLanguageRequest(clean, { id: user.uid, name: user.displayName || 'Devotee', email: user.email || '' });
      showSuccess('Request sent', 'It will appear after an admin approves it.');
      onClose();
    } catch (err) {
      console.error(err);
      showError('Could not send. Please try again.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" style={kb} role="dialog" aria-modal="true" aria-label="Request a language">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={busy ? undefined : onClose} />
      <form
        onSubmit={submit}
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="relative w-full animate-rise-in rounded-t-[28px] bg-white px-5 pt-3 shadow-lift sm:max-w-sm sm:rounded-[28px] sm:px-6 sm:pt-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-maroon-900">Request a language</h3>
          <button type="button" onClick={onClose} className="icon-btn -mr-1" aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-maroon-900/55">Write its name, like Kannada or ಕನ್ನಡ.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          placeholder="Language name"
          className="mt-4 block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3 text-[15px] text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20"
        />
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary mt-4 w-full disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </div>,
    document.body
  );
};

export default LanguageRequestForm;
