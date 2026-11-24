import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';

interface NamaskarGreetingProps {
  open: boolean;
  name?: string;
  onClose: () => void;
}

/** Welcome card shown once, right after a new devotee finishes the setup questions. */
const NamaskarGreeting: React.FC<NamaskarGreetingProps> = ({ open, name, onClose }) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setShown(true), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const close = () => {
    setShown(false);
    window.setTimeout(onClose, 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className={`absolute inset-0 bg-maroon-900/50 backdrop-blur-sm transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-lift transition-all duration-500 ease-out ${
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
        }`}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-marigold-400 to-brand-500 px-6 pb-7 pt-8 text-center">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-white/10" />
          <h1 className="relative font-serif text-4xl font-bold text-white">नमस्कार</h1>
          <p className="relative mt-1 text-sm font-medium text-white/80">Namaskar{name ? `, ${name}` : ''}</p>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5 text-center">
          <p className="text-[15px] leading-relaxed text-maroon-900/75">
            Welcome to <span className="font-semibold text-brand-700">Sadhana Sang</span>. We are honored by your presence. Let's grow in devotion together.
          </p>
          <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
            <p className="text-sm font-medium text-maroon-900/70">हरे कृष्ण हरे कृष्ण</p>
            <p className="text-xs text-maroon-900/50">Hare Krishna, Hare Krishna</p>
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
    </div>,
    document.body
  );
};

export default NamaskarGreeting;
