import React, { useEffect, useState } from 'react';

/** Gentle status lines shown while the app starts, in words devotees relate to */
const MESSAGES = [
  'Preparing your sadhana space…',
  'Gathering your japa and daily progress…',
  'Bringing your sangha together…',
];

/** Full-screen loader used while the session is being restored. */
const LoadingScreen: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-sandal-100 px-6" role="status" aria-live="polite">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-marigold-400/20 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <p className="text-sm font-medium tracking-wide text-brand-700/80">Hare Krishna 🙏</p>
        <h1 className="mt-2 text-2xl font-semibold text-maroon-900 sm:text-3xl">Welcome to Sadhana Sang</h1>

        {/* progress bar */}
        <div className="mt-7 h-1 w-48 overflow-hidden rounded-full bg-sandal-300/60">
          <div className="h-full w-1/3 animate-[loader_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-marigold-400 to-brand-600" />
        </div>

        <p key={index} className="mt-4 h-5 animate-fadeIn text-sm text-maroon-900/55">
          {MESSAGES[index]}
        </p>
      </div>

      <style>{`@keyframes loader { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
};

/** In-page loader for lazy routes and data fetching — keeps the app shell visible. */
export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[calc(100dvh-14rem)] w-full animate-fadeIn flex-col items-center justify-center gap-4"
    style={{ animationDelay: '150ms' }}
  >
    <div className="relative h-11 w-11">
      <div className="absolute inset-0 rounded-full border-[3px] border-sandal-300/70" />
      <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-brand-600 [animation-duration:0.9s]" />
    </div>
    <p className="text-sm font-medium text-stone-500">{label}</p>
  </div>
);

export default LoadingScreen;
