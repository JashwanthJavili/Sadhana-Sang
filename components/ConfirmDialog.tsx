import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldQuestion, AlertTriangle } from 'lucide-react';

export interface AskOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** red button for things that cannot be undone */
  danger?: boolean;
  /** the person must type this text before they can confirm (e.g. their email) */
  requireText?: string;
}

/**
 * A calm in-app replacement for confirm()/prompt().
 *   const { ask, dialog } = useConfirm();
 *   if (!(await ask({ title: 'Save changes?' }))) return;
 *   …render {dialog} once in the page
 */
export function useConfirm() {
  const [opts, setOpts] = useState<AskOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback(
    (o: AskOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setTyped('');
        setOpts(o);
      }),
    []
  );

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const canConfirm = !opts?.requireText || typed.trim().toLowerCase() === opts.requireText.trim().toLowerCase();

  const dialog = opts
    ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-label={opts.title}>
          <div className="absolute inset-0 animate-fadeIn bg-maroon-900/35 backdrop-blur-[2px]" onClick={() => finish(false)} />
          <div
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            className="relative w-full animate-rise-in rounded-t-[28px] bg-white px-6 pt-6 shadow-lift sm:max-w-sm sm:rounded-[28px]"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${opts.danger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-brand-600'}`}>
              {opts.danger ? <AlertTriangle size={22} /> : <ShieldQuestion size={22} />}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-maroon-900">{opts.title}</h3>
            {opts.message && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-maroon-900/65">{opts.message}</p>}
            {opts.requireText && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-medium text-maroon-900/55">Type {opts.requireText} to continue</span>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  className="block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3 text-[15px] text-maroon-900 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20"
                />
              </label>
            )}
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => finish(false)} className="btn-secondary flex-1">
                {opts.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                disabled={!canConfirm}
                className={`flex-1 disabled:opacity-40 ${opts.danger ? 'inline-flex h-11 items-center justify-center rounded-xl bg-rose-600 px-4 font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98]' : 'btn-primary'}`}
              >
                {opts.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return { ask, dialog };
}
