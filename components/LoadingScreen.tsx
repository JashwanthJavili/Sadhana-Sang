import React, { useEffect, useState } from 'react';
// @ts-ignore
import heroImage from '../utils/Images/krishna-embrace.jpg';

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
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end overflow-hidden bg-maroon-900 px-6 pb-[14vh]" role="status" aria-live="polite">
      <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[50%_22%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-maroon-900/90 via-maroon-900/30 to-transparent" />

      <div className="relative flex flex-col items-center text-center">
        <p className="text-sm font-medium tracking-wide text-sandal-100/85">Hare Krishna</p>
        <h1 className="mt-2 font-elegant text-3xl font-semibold text-sandal-50 sm:text-4xl">Sadhana Sang</h1>

        {/* progress bar */}
        <div className="mt-7 h-1 w-48 overflow-hidden rounded-full bg-white/25">
          <div className="h-full w-1/3 animate-[loader_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-marigold-400 to-amber-200" />
        </div>

        <p key={index} className="mt-4 h-5 animate-fadeIn text-sm text-sandal-100/75">
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
