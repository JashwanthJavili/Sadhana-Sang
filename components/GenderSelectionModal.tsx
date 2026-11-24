import React, { useState } from 'react';
import { Check } from 'lucide-react';
// @ts-ignore
import maleAvatar from '../utils/Images/avatar-male.png';
// @ts-ignore
import femaleAvatar from '../utils/Images/avatar-female.png';

interface GenderSelectionModalProps {
  isOpen: boolean;
  onComplete: (gender: 'male' | 'female') => void;
}

const GenderSelectionModal: React.FC<GenderSelectionModalProps> = ({ isOpen, onComplete }) => {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  if (!isOpen) return null;

  const card = (g: 'male' | 'female', label: string, honorific: string, img: string) => (
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-maroon-900/40 backdrop-blur-sm" />
      <div
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="relative w-full animate-rise-in rounded-t-[32px] bg-sandal-50 px-6 pt-7 shadow-lift sm:max-w-md sm:rounded-[32px]"
      >
        <h2 className="font-elegant text-[26px] font-semibold leading-tight text-maroon-900">How may we address you?</h2>
        <p className="mt-1.5 text-sm text-maroon-900/55">So we can greet you as Prabhuji or Mataji.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {card('male', 'Male', 'Prabhuji', maleAvatar)}
          {card('female', 'Female', 'Mataji', femaleAvatar)}
        </div>
        <button type="button" onClick={() => onComplete(gender)} className="btn-primary btn-lg mt-6 w-full">
          Continue
        </button>
      </div>
    </div>
  );
};

export default GenderSelectionModal;
