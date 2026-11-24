import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus } from 'lucide-react';

export interface LangOption {
  code: string;
  /** the language written in its own script */
  label: string;
}

interface Props {
  value: string;
  options: LangOption[];
  onChange: (code: string) => void;
  onRequest: () => void;
}

/**
 * Compact language dropdown. The list is drawn in a portal so it is never
 * clipped by (or drawn behind) the mantra card it belongs to.
 */
const LangPicker: React.FC<Props> = ({ value, options, onChange, onRequest }) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const close = () => setPos(null);
  const toggle = () => {
    if (pos) return close();
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(window.innerWidth - r.right, 8) });
  };

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as HTMLElement;
      if (!btn.current?.contains(t) && !t.closest?.('[data-lang-menu]')) close();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const current = options.find((l) => l.code === value) || options[0];

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={!!pos}
        aria-label={`Language: ${current.label}`}
        className={`flex items-center gap-1 whitespace-nowrap rounded-full py-1 pl-3 pr-2 text-xs font-semibold ring-1 transition ${
          pos ? 'bg-amber-50 text-brand-700 ring-amber-300' : 'bg-white text-maroon-800 ring-sandal-200 hover:bg-sandal-50'
        }`}
        style={{ minHeight: 0 }}
      >
        {current.label}
        <ChevronDown size={13} className={`text-maroon-900/40 transition-transform ${pos ? 'rotate-180' : ''}`} />
      </button>
      {pos &&
        createPortal(
          <ul
            data-lang-menu
            role="listbox"
            aria-label="Choose language"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[110] max-h-[60vh] min-w-[10rem] animate-scale-in overflow-y-auto rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-sandal-200"
          >
            {options.map((l) => {
              const on = l.code === value;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      onChange(l.code);
                      close();
                    }}
                    className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      on ? 'bg-amber-50 text-brand-700' : 'text-maroon-900 hover:bg-sandal-50'
                    }`}
                    style={{ minHeight: 0 }}
                  >
                    <span className="flex-1">{l.label}</span>
                    {on && <Check size={15} className="shrink-0 text-brand-600" />}
                  </button>
                </li>
              );
            })}
            <li className="mt-1 border-t border-sandal-200 pt-1">
              <button
                type="button"
                onClick={() => {
                  close();
                  onRequest();
                }}
                className="flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium text-brand-700 transition hover:bg-amber-50"
                style={{ minHeight: 0 }}
              >
                <Plus size={15} /> Request a language
              </button>
            </li>
          </ul>,
          document.body
        )}
    </>
  );
};

export default LangPicker;
