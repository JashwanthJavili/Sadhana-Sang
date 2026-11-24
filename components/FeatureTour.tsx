import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import MalaIcon from './MalaIcon';
import { Heart, PenTool, BookHeart, CalendarDays, Users, Sparkles } from 'lucide-react';

interface FeatureTourProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
}

const SLIDES = [
  {
    Icon: Sparkles,
    title: 'Welcome to Sadhana Sang',
    text: 'A sacred space for your spiritual journey. Let us show you what awaits.',
    glow: '251,146,60',
  },
  {
    Icon: MalaIcon,
    title: 'Japa counter',
    text: 'Count your rounds with a single tap. Each completed round saves automatically, and a gentle bell marks every milestone.',
    glow: '251,191,36',
  },
  {
    Icon: PenTool,
    title: 'Weekly planner',
    text: 'Plan your sadhana for each day of the week: wake-up time, study hours, chanting goals, and more.',
    glow: '56,189,248',
  },
  {
    Icon: Heart,
    title: 'Journal',
    text: 'A quiet space for your reflections. Write what went well, what held you back, and what you will improve.',
    glow: '251,113,133',
  },
  {
    Icon: BookHeart,
    title: 'Mantras & kirtans',
    text: 'Read mantras in English, Hindi, Telugu, and more. Request a new language and an admin will review it.',
    glow: '167,139,250',
  },
  {
    Icon: CalendarDays,
    title: 'Vaishnava calendar',
    text: "Never miss a festival or Ekadashi. Stories, timings, and Prabhupada's teachings, all in one place.",
    glow: '52,211,153',
  },
  {
    Icon: Users,
    title: 'Sangha',
    text: 'Connect with devotees, chat privately with encrypted messages, and ask questions to the community.',
    glow: '251,146,60',
  },
];

const FeatureTour: React.FC<FeatureTourProps> = ({ isOpen, onComplete, userName }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const title = step === 0 && userName ? `Hare Krishna, ${userName}!` : slide.title;
  const words = slide.text.split(' ');

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden px-8 text-center" role="dialog" aria-modal="true" aria-label="Feature tour">
      <style>{`
        @keyframes tourWord { from { opacity: 0; transform: translateY(8px); filter: blur(4px) } to { opacity: 1; transform: none; filter: none } }
        @keyframes tourPulse { 0%,100% { transform: scale(1); opacity: .55 } 50% { transform: scale(1.18); opacity: .15 } }
        @keyframes tourIn { from { opacity: 0; transform: scale(.7) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      {/* Everything else goes black, with a soft spotlight on the feature */}
      <div
        className="absolute inset-0 bg-black transition-[background] duration-700"
        style={{ backgroundImage: `radial-gradient(circle at 50% 38%, rgba(${slide.glow},0.28) 0, rgba(${slide.glow},0.08) 160px, transparent 300px)` }}
      />

      {!isLast && (
        <button
          type="button"
          onClick={onComplete}
          className="absolute right-4 flex h-10 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-medium text-white/70 transition hover:bg-white/20 hover:text-white"
          style={{ top: 'max(1rem, env(safe-area-inset-top))', minHeight: 0 }}
        >
          Skip <X size={14} />
        </button>
      )}

      <div key={step} className="relative flex max-w-sm flex-col items-center">
        {/* Highlighted feature */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <span className="absolute inset-0 rounded-full" style={{ background: `rgba(${slide.glow},0.35)`, animation: 'tourPulse 2.4s ease-in-out infinite' }} />
          <span
            className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white text-brand-600"
            style={{ boxShadow: `0 0 60px 8px rgba(${slide.glow},0.55)`, animation: 'tourIn .5s cubic-bezier(.22,1,.36,1) both' }}
          >
            <slide.Icon size={44} />
          </span>
        </div>

        <h2 className="mt-8 text-2xl font-bold text-white" style={{ animation: 'tourWord .6s ease-out .15s both' }}>
          {title}
        </h2>

        {/* Text appears word by word */}
        <p className="mt-4 text-[16px] leading-relaxed text-white/80" aria-label={slide.text}>
          {words.map((w, i) => (
            <span key={i} className="inline-block" style={{ animation: `tourWord .45s ease-out ${0.45 + i * 0.07}s both`, marginRight: '0.3em' }} aria-hidden="true">
              {w}
            </span>
          ))}
        </p>
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 px-8 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-sm">
          <div className="mb-5 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-white' : 'w-2 bg-white/30'}`}
                aria-label={`Slide ${i + 1}`}
                style={{ minHeight: 0 }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (isLast ? onComplete() : setStep(step + 1))}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-marigold-400 to-brand-500 py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.99]"
          >
            {isLast ? 'Start your journey' : 'Continue'}
            {!isLast && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FeatureTour;
