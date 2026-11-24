import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

/** Set at build time (see vite.config.ts); 'dev' while developing */
const CURRENT_BUILD = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/**
 * Checks /version.json (written on every build) and, when a newer release is
 * live, shows a popup that reloads the app on the latest version.
 */
const VersionChecker: React.FC = () => {
  const [outdated, setOutdated] = useState(false);
  const [updating, setUpdating] = useState(false);

  const check = useCallback(async () => {
    if (CURRENT_BUILD === 'dev') return;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { buildId } = await res.json();
      if (buildId && String(buildId) !== CURRENT_BUILD) setOutdated(true);
    } catch {
      /* offline — try again later */
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [check]);

  const update = async () => {
    setUpdating(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch {
      /* reload anyway */
    }
    window.location.reload();
  };

  if (!outdated) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-5" role="alertdialog" aria-modal="true" aria-label="Update available">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-sm animate-rise-in rounded-[28px] bg-white p-6 text-center shadow-lift">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-brand-600 ring-1 ring-amber-200">
          <Sparkles size={24} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-maroon-900">A new version is ready</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-maroon-900/60">Please refresh to get the latest improvements.</p>
        <button onClick={update} disabled={updating} className="btn-primary mt-5 h-11 w-full disabled:opacity-60">
          <RefreshCw size={16} className={updating ? 'animate-spin' : ''} /> {updating ? 'Updating…' : 'Refresh now'}
        </button>
      </div>
    </div>
  );
};

export default VersionChecker;
