import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Select gender">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm animate-scale-in overflow-hidden rounded-[32px] bg-white shadow-lift">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 px-6 pb-7 pt-7">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <h2 className="relative text-2xl font-bold leading-tight text-white">How may we address you?</h2>
          <p className="relative mt-1 text-sm text-white/70">So we can greet you as Prabhuji or Mataji.</p>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 pt-5">
          <div className="grid grid-cols-2 gap-3">
            {card('male', 'Male', 'Prabhuji', maleAvatar)}
            {card('female', 'Female', 'Mataji', femaleAvatar)}
          </div>
          <button
            type="button"
            onClick={() => onComplete(gender)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.99]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GenderSelectionModal;
