import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useKeyboardSafe } from './useKeyboardSafe';
// @ts-ignore
import maleAvatar from '../utils/Images/avatar-male.png';
// @ts-ignore
import femaleAvatar from '../utils/Images/avatar-female.png';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: { userName: string; gender: 'male' | 'female'; guruName: string; iskconCenter: string }) => void;
}

const TOTAL = 4;

const input =
  'block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3.5 text-base text-maroon-900 placeholder:text-maroon-900/30 transition focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const kb = useKeyboardSafe();
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [guruName, setGuruName] = useState('');
  const [iskconCenter, setIskconCenter] = useState('');

  if (!isOpen) return null;

  const canProceed =
    step === 1 ? userName.trim().length > 0 : step === 2 ? true : step === 3 ? guruName.trim().length > 0 : iskconCenter.trim().length > 0;

  const next = () => {
    if (!canProceed) return;
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" style={kb} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-maroon-900/40 backdrop-blur-sm" />
      <div
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="relative flex max-h-full w-full animate-rise-in flex-col overflow-hidden rounded-t-[32px] bg-sandal-50 shadow-lift sm:max-w-md sm:rounded-[32px]"
      >
        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-maroon-900/45">
            <span>Welcome to Sadhana Sang</span>
            <span>
              {step} / {TOTAL}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sandal-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-marigold-400 to-brand-600 transition-all duration-500 ease-out"
              style={{ width: `${(step / TOTAL) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-2 pt-7">
          <h2 key={step} className="animate-fadeIn font-elegant text-[26px] font-semibold leading-tight text-maroon-900">
            {titles[step - 1]}
          </h2>
          <p className="mt-1.5 text-sm text-maroon-900/55">{hints[step - 1]}</p>

          <div key={`f${step}`} className="mt-6 animate-fadeIn">
            {step === 1 && (
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
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
        </div>

        <div className="flex gap-2 px-6 pt-4">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary px-4" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <button type="button" onClick={next} disabled={!canProceed} className="btn-primary btn-lg flex-1 disabled:opacity-50">
            {step === TOTAL ? 'Get started' : 'Continue'}
            {step < TOTAL && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
