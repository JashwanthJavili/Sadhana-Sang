import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Keeps bottom sheets above the on-screen keyboard.
 * Returns a style for the sheet's fixed overlay that matches the visible
 * viewport, and scrolls the focused field into view.
 */
export function useKeyboardSafe(): CSSProperties {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    const onResize = () => vv && setBox({ top: vv.offsetTop, height: vv.height });
    onResize();
    vv?.addEventListener('resize', onResize);
    vv?.addEventListener('scroll', onResize);

    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.matches?.('input, textarea, select')) {
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
      }
    };
    document.addEventListener('focusin', onFocus);

    return () => {
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
      document.removeEventListener('focusin', onFocus);
    };
  }, []);

  return box ? { top: box.top, height: box.height, bottom: 'auto', transition: 'height 200ms ease, top 200ms ease' } : {};
}
