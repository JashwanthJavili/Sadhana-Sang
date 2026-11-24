import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Fire this event (e.g. from Settings) to replay the guide. */
export const START_GUIDE_EVENT = 'ss:start-guide';
export const startGuide = () => window.dispatchEvent(new CustomEvent(START_GUIDE_EVENT));

interface Step {
  target: string; // matches data-tour="…" on a menu item
  title: string;
  text: string;
}

const STEPS: Step[] = [
  { target: '/chanting', title: 'Japa Counter', text: 'Tap to count each bead. Rounds save on their own.' },
  { target: '/planner', title: 'Weekly Planner', text: 'Plan your sadhana for each day of the week.' },
  { target: '/journal', title: 'Journal', text: 'A private place for your daily reflections.' },
  { target: '/slokas', title: 'Mantras & Kirtans', text: 'Read prayers and songs in many languages.' },
  { target: '/festivals', title: 'Vaishnava Calendar', text: 'Festivals and Ekadashis, with their stories.' },
  { target: '/chats', title: 'Messages', text: 'Private chats with devotees you are connected to.' },
  { target: '/community', title: 'Devotees', text: 'Find devotees and send connection requests.' },
  { target: '/questions', title: 'Forum', text: 'Ask questions and learn from the sangha.' },
  { target: '/settings', title: 'Settings', text: 'Your profile and preferences. You can replay this guide from here.' },
];

type Box = { top: number; left: number; width: number; height: number };

/** The visible element for a target — the menu exists twice (desktop sidebar + mobile drawer). */
const findTarget = (target: string): HTMLElement | null => {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) || null;
};

interface AppGuideProps {
  active: boolean;
  onClose: () => void;
}

const AppGuide: React.FC<AppGuideProps> = ({ active, onClose }) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  // When the guide opens, wait for the menu to slide in, then keep only steps that exist for this user
  useEffect(() => {
    if (!active) return;
    setI(0);
    setBox(null);
    const t = window.setTimeout(() => setSteps(STEPS.filter((s) => findTarget(s.target))), 380);
    return () => window.clearTimeout(t);
  }, [active]);

  const step = steps[i];

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 4;
    setBox({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, [step]);

  useLayoutEffect(() => {
    if (!active || !step) return;
    findTarget(step.target)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    measure();
    const t = window.setTimeout(measure, 320); // after the smooth scroll settles
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, step, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, steps.length, onClose]);

  if (!active || !step || !box) return null;

  const isLast = i === steps.length - 1;

  // Card placement: beside the item when there is room, otherwise below (or above) it
  const CARD_W = Math.min(300, vw - 32);
  const CARD_H = 150;
  let cardTop: number;
  let cardLeft: number;
  if (box.left + box.width + 16 + CARD_W <= vw - 16) {
    cardLeft = box.left + box.width + 16;
    cardTop = Math.min(Math.max(box.top + box.height / 2 - CARD_H / 2, 16), vh - CARD_H - 16);
  } else {
    cardLeft = Math.min(Math.max(box.left, 16), vw - CARD_W - 16);
    cardTop = box.top + box.height + 12 + CARD_H < vh - 16 ? box.top + box.height + 12 : box.top - CARD_H - 12;
  }

  const move = 'all 420ms cubic-bezier(.22,1,.36,1)';

  return createPortal(
    <div className="fixed inset-0 z-[160]" role="dialog" aria-modal="true" aria-label="App guide">
      <style>{`@keyframes guideIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }`}</style>

      {/* Click shield — the app underneath stays still during the guide */}
      <div className="absolute inset-0" />

      {/* Spotlight: everything outside the highlighted item is dimmed */}
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-white/90"
        style={{ ...box, transition: move, boxShadow: '0 0 0 9999px rgba(20,10,5,0.62)' }}
      />

      {/* Card */}
      <div
        className="absolute rounded-2xl bg-white p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)]"
        style={{ top: cardTop, left: cardLeft, width: CARD_W, transition: move }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-700/70">
            {i + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-maroon-900/40 transition hover:bg-sandal-100 hover:text-maroon-900"
            aria-label="Close guide"
            style={{ minHeight: 0 }}
          >
            <X size={15} />
          </button>
        </div>

        <div key={i} style={{ animation: 'guideIn 300ms ease-out both' }}>
          <p className="mt-1 text-[15px] font-semibold text-maroon-900">{step.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-maroon-900/65">{step.text}</p>
        </div>

        <div className="mt-3.5 flex items-center justify-end gap-2">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="h-9 rounded-full px-3.5 text-sm font-medium text-maroon-900/60 transition hover:bg-sandal-100"
              style={{ minHeight: 0 }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onClose() : setI(i + 1))}
            className="h-9 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
            style={{ minHeight: 0 }}
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AppGuide;
