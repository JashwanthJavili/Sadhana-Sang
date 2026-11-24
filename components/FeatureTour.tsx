import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import MalaIcon from './MalaIcon';
import { Heart, PenTool, BookHeart, CalendarDays, Users, MessageCircle } from 'lucide-react';

interface FeatureTourProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
}

const SLIDES = [
  {
    emoji: '🙏',
    title: 'Welcome to Sadhana Sang',
    text: 'A sacred space for your spiritual journey. Let us show you what awaits.',
    color: 'from-marigold-400 to-brand-500',
    bgAccent: 'bg-amber-50',
  },
  {
    Icon: MalaIcon,
    title: 'Japa counter',
    text: 'Count your rounds with a single tap. Each completed round saves automatically, and a gentle bell marks every milestone.',
    color: 'from-amber-400 to-orange-500',
    bgAccent: 'bg-amber-50',
  },
  {
    Icon: PenTool,
    title: 'Weekly planner',
    text: 'Plan your sadhana for each day of the week — wake-up time, study hours, chanting goals, and more.',
    color: 'from-sky-400 to-blue-500',
    bgAccent: 'bg-sky-50',
  },
  {
    Icon: Heart,
    title: 'Journal',
    text: 'A quiet space for your reflections. Write what went well, what held you back, and what you will improve.',
    color: 'from-rose-400 to-pink-500',
    bgAccent: 'bg-rose-50',
  },
  {
    Icon: BookHeart,
    title: 'Mantras & kirtans',
    text: 'Read mantras in English, Hindi, Telugu, and more. Request a new language and an admin will review it.',
    color: 'from-violet-400 to-purple-500',
    bgAccent: 'bg-violet-50',
  },
  {
    Icon: CalendarDays,
    title: 'Vaishnava calendar',
    text: 'Never miss a festival or Ekadashi. Stories, timings, and Prabhupada\'s teachings — all in one place.',
    color: 'from-emerald-400 to-teal-500',
    bgAccent: 'bg-emerald-50',
  },
  {
    Icon: Users,
    title: 'Sangha',
    text: 'Connect with devotees, chat privately with encrypted messages, and ask questions to the community.',
    color: 'from-orange-400 to-brand-500',
    bgAccent: 'bg-orange-50',
  },
];

const FeatureTour: React.FC<FeatureTourProps> = ({ isOpen, onComplete, userName }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const isFirst = step === 0;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Feature tour">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm animate-scale-in overflow-hidden rounded-[32px] bg-white shadow-lift">
        {/* Skip button */}
        {!isLast && (
          <button
            type="button"
            onClick={onComplete}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-maroon-900/50 backdrop-blur transition hover:bg-white hover:text-maroon-900"
            aria-label="Skip tour"
            style={{ minHeight: 0 }}
          >
            <X size={16} />
          </button>
        )}

        {/* Colored header area */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${slide.color} px-8 pb-10 pt-12`}>
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-white/10" />

          <div className="relative flex flex-col items-center text-center">
            {/* Icon or emoji */}
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
              {slide.emoji ? (
                <span className="text-4xl">{slide.emoji}</span>
              ) : slide.Icon ? (
                <slide.Icon size={36} className="text-white" />
              ) : null}
            </div>

            <h2 className="mt-5 text-2xl font-bold leading-tight text-white">
              {isFirst && userName ? `Hare Krishna, ${userName}!` : slide.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 pb-6 pt-6">
          <p key={step} className="animate-fadeIn text-center text-[15px] leading-relaxed text-maroon-900/70">
            {slide.text}
          </p>

          {/* Dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-brand-500' : 'w-2 bg-sandal-300'
                }`}
                aria-label={`Slide ${i + 1}`}
                style={{ minHeight: 0 }}
              />
            ))}
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => (isLast ? onComplete() : setStep(step + 1))}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${slide.color} py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(234,88,12,0.5)] transition active:scale-[0.99]`}
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
