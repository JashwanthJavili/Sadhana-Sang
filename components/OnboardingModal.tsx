import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
// @ts-ignore
import maleAvatar from '../utils/Images/avatar-male.png';
// @ts-ignore
import femaleAvatar from '../utils/Images/avatar-female.png';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: { userName: string; gender: 'male' | 'female'; guruName: string; iskconCenter: string }) => void;
  prefillName?: string;
}

const TOTAL = 4;

const input =
  'block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3.5 text-base text-maroon-900 placeholder:text-maroon-900/30 transition focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete, prefillName }) => {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState(prefillName || '');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [guruName, setGuruName] = useState('');
  const [iskconCenter, setIskconCenter] = useState('');

  // The name from sign-in can arrive after this component mounted — fill it in
  // as soon as it is known, unless the user has already typed something.
  const touchedName = React.useRef(false);
  useEffect(() => {
    if (prefillName && !touchedName.current) setUserName(prefillName);
  }, [prefillName, isOpen]);

  if (!isOpen) return null;

  const canProceed =
    step === 1 ? userName.trim().length > 0 : step === 2 ? gender !== null : step === 3 ? guruName.trim().length > 0 : iskconCenter.trim().length > 0;

  const next = () => {
    if (!canProceed || !gender) return;
    if (step < TOTAL) setStep(step + 1);
    else onComplete({ userName: userName.trim(), gender, guruName: guruName.trim(), iskconCenter: iskconCenter.trim() });
  };

  const titles = [
    'What should we call you?',
    'How may we address you?',
    'Who is your spiritual guide?',
    'Which temple are you connected with?',
  ];
  const hints = [
    'Your name, as devotees will see it.',
    'So we can greet you as Prabhuji or Mataji.',
    'The person you learn from. Write N/A if none.',
    'Your local ISKCON center. Write N/A if none.',
  ];

  const COLOR = 'from-marigold-400 to-brand-500';
  const STEP_COLORS = [COLOR, COLOR, COLOR, COLOR];

  const genderCard = (g: 'male' | 'female', label: string, honorific: string, img: string) => (
    <button
      type="button"
      onClick={() => setGender(g)}
      aria-pressed={gender === g}
      className={`relative flex flex-col items-center rounded-3xl border-2 px-3 pb-4 pt-5 transition-all duration-200 ${
        gender === g ? 'border-marigold-400 bg-amber-50 shadow-card' : 'border-sandal-200 bg-white hover:border-marigold-300'
      }`}
    >
      <img src={img} alt="" className="h-24 w-24 rounded-full" draggable={false} />
      <span className="mt-3 text-[15px] font-semibold text-maroon-900">{label}</span>
      <span className="text-xs text-maroon-900/50">{honorific}</span>
      {gender === g && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto p-5 pt-[8dvh]" role="dialog" aria-modal="true" aria-label="Set up your profile">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm animate-scale-in overflow-hidden rounded-[32px] bg-white shadow-lift">
        {/* Colored header */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${STEP_COLORS[step - 1]} px-6 pb-8 pt-7`}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

          {/* Progress */}
          <div className="relative flex items-center justify-between text-xs font-semibold text-white/70">
            <span>Set up your profile</span>
            <span>
              {step} / {TOTAL}
            </span>
          </div>
          <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${(step / TOTAL) * 100}%` }}
            />
          </div>

          <h2 key={step} className="relative mt-5 animate-fadeIn text-2xl font-bold leading-tight text-white">
            {titles[step - 1]}
          </h2>
          <p className="relative mt-1 text-sm text-white/70">{hints[step - 1]}</p>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 pt-5">
          <div key={`f${step}`} className="animate-fadeIn">
            {step === 1 && (
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  touchedName.current = true;
                  setUserName(e.target.value);
                }}
                placeholder="Your name"
                className={input}
                autoFocus
                autoComplete="name"
                onKeyDown={(e) => e.key === 'Enter' && next()}
              />
            )}
            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {genderCard('male', 'Male', 'Prabhuji', maleAvatar)}
                {genderCard('female', 'Female', 'Mataji', femaleAvatar)}
              </div>
            )}
            {step === 3 && (
              <input
                type="text"
                value={guruName}
                onChange={(e) => setGuruName(e.target.value)}
                placeholder="e.g. HG Pranavananda Das Prabhu"
                className={input}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && next()}
              />
            )}
            {step === 4 && (
              <input
                type="text"
                value={iskconCenter}
                onChange={(e) => setIskconCenter(e.target.value)}
                placeholder="e.g. ISKCON Hyderabad"
                className={input}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && next()}
              />
            )}
          </div>

          <div className="mt-5 flex gap-2">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary px-4" aria-label="Back">
                <ArrowLeft size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${STEP_COLORS[step - 1]} py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50`}
            >
              {step === TOTAL ? 'Get started' : 'Continue'}
              {step < TOTAL && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OnboardingModal;
