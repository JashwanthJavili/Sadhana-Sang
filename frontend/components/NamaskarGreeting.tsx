import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';

interface NamaskarGreetingProps {
  open: boolean;
  name?: string;
  onClose: () => void;
}

/** Welcome card shown once, after a new devotee finishes the app guide.  */
const NamaskarGreeting: React.FC<NamaskarGreetingProps> = ({ open, name, onClose }) => {
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLeaving(false);
    const t = window.setTimeout(() => setShown(true), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => setShown(false), 650);
    window.setTimeout(onClose, 1100);
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className={`absolute inset-0 bg-maroon-900/40 backdrop-blur-sm transition-opacity duration-500 ${shown ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className={`relative w-full max-w-sm transition-all duration-700 ease-out ${
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
        }`}
      >
        <div className="overflow-hidden rounded-[32px] bg-white shadow-lift">
          <div className="relative overflow-hidden bg-gradient-to-br from-marigold-400 to-brand-500 px-6 pb-7 pt-8 text-center">
            <div className="halo-breathe pointer-events-none absolute left-1/2 top-0 -ml-24 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
            <h1 className="soft-reveal relative font-serif text-4xl font-bold text-white">नमस्कार</h1>
            <p className="soft-reveal relative mt-1 text-sm font-medium text-white/85" style={{ animationDelay: '0.3s' }}>
              Namaskar{name ? `, ${name}` : ''}
            </p>
          </div>

          <div className="space-y-4 px-6 pb-6 pt-5 text-center">
            <p className="soft-reveal text-[15px] leading-relaxed text-maroon-900/75" style={{ animationDelay: '0.5s' }}>
              You have seen your new home. Welcome to <span className="font-semibold text-brand-700">Sadhana Sang</span> — may every
              round bring you closer to Krishna.
            </p>
            <div className="soft-reveal rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70" style={{ animationDelay: '0.7s' }}>
              <p className="text-sm font-medium text-maroon-900/70">हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे</p>
              <p className="text-sm font-medium text-maroon-900/70">हरे राम हरे राम राम राम हरे हरे</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-marigold-400 to-brand-500 py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.99]"
            >
              Begin your journey <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NamaskarGreeting;
