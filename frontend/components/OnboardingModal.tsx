import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
// @ts-ignore
import maleAvatar from '../utils/Images/avatar-male.png';
// @ts-ignore
import femaleAvatar from '../utils/Images/avatar-female.png';

export interface OnboardingData {
  userName: string;
  gender: 'male' | 'female';
  guruName: string;
  iskconCenter: string;
  city?: string;
  practiceDuration?: string;
  dailyRoundsGoal?: number | null;
  initiationStatus?: string;
  referralSource?: string;
  referredBy?: string;
  seeking?: string[];
  sankalpa?: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData) => void;
  prefillName?: string;
}

const TOTAL = 8;

const DURATIONS = ['Just starting', 'Less than 1 year', '1–5 years', 'More than 5 years'];
const ROUNDS: { label: string; value: number | null }[] = [
  { label: '1', value: 1 },
  { label: '4', value: 4 },
  { label: '8', value: 8 },
  { label: '16', value: 16 },
  { label: 'Not yet', value: null },
];
const INITIATIONS = ['Not initiated', 'Aspiring', 'Harinama initiated', 'Brahmana initiated'];
export const REFERRAL_SOURCES = ['A devotee', 'My temple', 'A friend or family', 'Social media', 'Found it myself'];
export const SEEKING = [
  'Steady daily chanting',
  'More discipline in my day',
  'Peace of mind',
  'Good devotee association',
  'Deeper study of scripture',
  'Becoming a more responsible person',
  'Serving others with love',
  'Overcoming bad habits',
];

const input =
  'block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3.5 text-base text-maroon-900 placeholder:text-maroon-900/30 transition focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete, prefillName }) => {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState(prefillName || '');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [guruName, setGuruName] = useState('');
  const [iskconCenter, setIskconCenter] = useState('');
  const [city, setCity] = useState('');
  const [duration, setDuration] = useState<string | null>(null);
  const [roundsGoal, setRoundsGoal] = useState<number | null | undefined>(undefined);
  const [initiation, setInitiation] = useState<string | null>(null);

  // The name from sign-in can arrive after this component mounted — fill it in
  // as soon as it is known, unless the user has already typed something.
  const touchedName = React.useRef(false);
  useEffect(() => {
    if (prefillName && !touchedName.current) setUserName(prefillName);
  }, [prefillName, isOpen]);

  if (!isOpen) return null;

  const canProceed =
    step === 1 ? userName.trim().length > 0 : step === 2 ? gender !== null : step === 3 ? guruName.trim().length > 0 : step === 4 ? iskconCenter.trim().length > 0 : true;
  const optionalStep = step >= 5;

  const finish = () => {
    if (!gender) return;
    onComplete({
      userName: userName.trim(),
      gender,
      guruName: guruName.trim(),
      iskconCenter: iskconCenter.trim(),
      city: city.trim() || undefined,
      practiceDuration: duration || undefined,
      dailyRoundsGoal: roundsGoal,
      initiationStatus: initiation || undefined,
    });
  };

  const next = () => {
    if (!canProceed) return;
    if (step < TOTAL) setStep(step + 1);
    else finish();
  };

  // Skip: leave this step's answer empty and move on
  const skip = () => {
    if (step === 5) setCity('');
    if (step === 6) setDuration(null);
    if (step === 7) setRoundsGoal(undefined);
    if (step === 8) setInitiation(null);
    if (step < TOTAL) setStep(step + 1);
    else finish();
  };

  const titles = [
    'What should we call you?',
    'How may we address you?',
    'Who is your spiritual guide?',
    'Are you connected to a temple?',
    'Which city do you live in?',
    'How long have you been practising?',
    'Your daily chanting goal?',
    'Are you initiated?',
  ];
  const hints = [
    'Your name, as devotees will see it.',
    'So we can greet you as Prabhuji or Mataji.',
    'The person you learn from. Write N/A if none.',
    'Your temple, ashram or satsang group. Write N/A if none.',
    'Optional. Only you can see this.',
    'Optional. Krishna consciousness, in any form.',
    'Optional. Rounds of the maha-mantra per day.',
    'Optional. Wherever you are on the path is wonderful.',
  ];

  const COLOR = 'from-marigold-400 to-brand-500';

  const pill = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[48px] items-center justify-between rounded-2xl border-2 px-4 py-2.5 text-left text-[15px] font-semibold transition-all duration-200 active:scale-[0.99] ${
        selected ? 'border-marigold-400 bg-amber-50 text-maroon-900 shadow-card' : 'border-sandal-200 bg-white text-maroon-900/80 hover:border-marigold-300'
      }`}
    >
      {label}
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  );

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
        <div className={`relative overflow-hidden bg-gradient-to-br ${COLOR} px-6 pb-8 pt-7`}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative flex items-center justify-between text-xs font-semibold text-white/75">
            <span>Set up your profile</span>
            <span>
              {step} / {TOTAL}
            </span>
          </div>
          <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all duration-500 ease-out" style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>

          <h2 key={step} className="relative mt-5 animate-fadeIn text-2xl font-bold leading-tight text-white">
            {titles[step - 1]}
          </h2>
          <p className="relative mt-1 text-sm text-white/75">{hints[step - 1]}</p>
        </div>

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
              <input type="text" value={guruName} onChange={(e) => setGuruName(e.target.value)} placeholder="e.g. HG Pranavananda Das Prabhu" className={input} autoFocus onKeyDown={(e) => e.key === 'Enter' && next()} />
            )}
            {step === 4 && (
              <input type="text" value={iskconCenter} onChange={(e) => setIskconCenter(e.target.value)} placeholder="e.g. Sri Krishna Temple, Hyderabad" className={input} autoFocus onKeyDown={(e) => e.key === 'Enter' && next()} />
            )}
            {step === 5 && (
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" className={input} autoFocus autoComplete="address-level2" onKeyDown={(e) => e.key === 'Enter' && next()} />
            )}
            {step === 6 && <div className="grid gap-2.5">{DURATIONS.map((d) => pill(d, duration === d, () => setDuration(d)))}</div>}
            {step === 7 && (
              <div className="grid grid-cols-2 gap-2.5">
                {ROUNDS.map((o) => pill(o.value === null ? o.label : `${o.label} ${o.value === 1 ? 'round' : 'rounds'}`, roundsGoal === o.value, () => setRoundsGoal(o.value)))}
              </div>
            )}
            {step === 8 && <div className="grid gap-2.5">{INITIATIONS.map((d) => pill(d, initiation === d, () => setInitiation(d)))}</div>}
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
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${COLOR} py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50`}
            >
              {step === TOTAL ? 'Get started' : 'Continue'}
              {step < TOTAL && <ArrowRight size={18} />}
            </button>
          </div>
          {optionalStep && (
            <button type="button" onClick={skip} className="mt-3 w-full py-1.5 text-sm font-medium text-maroon-900/55 transition hover:text-maroon-900">
              Skip
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OnboardingModal;
