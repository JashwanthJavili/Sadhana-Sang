import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

interface FeedbackPromptProps {
  onClose: () => void;
}

/**
 * A small, non-blocking card that gently asks for a rating.
 * Picking a star opens the full feedback form; closing it simply goes away.
 * (How often it appears is decided in App.tsx — at most once a month.)
 */
const FeedbackPrompt: React.FC<FeedbackPromptProps> = ({ onClose }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(onClose, 250);
  };

  if (openForm) {
    return <FeedbackModal initialRating={rating} onClose={onClose} />;
  }

  return (
    <div
      role="dialog"
      aria-label="Rate Sadhana Sang"
      className={`fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-sm transition-all duration-300 ease-out sm:inset-x-auto sm:bottom-6 sm:left-auto sm:right-24 lg:bottom-8 ${
        leaving ? 'translate-y-4 opacity-0' : 'animate-rise-in'
      }`}
    >
      <div className="relative rounded-3xl bg-sandal-50/95 p-5 shadow-[0_20px_50px_-15px_rgba(67,27,17,0.4)] ring-1 ring-sandal-300/70 backdrop-blur">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl text-maroon-900/40 transition hover:bg-sandal-200/70 hover:text-maroon-800"
          aria-label="Close"
          style={{ minHeight: 0 }}
        >
          <X size={17} />
        </button>

        <p className="pr-8 font-elegant text-xl font-semibold leading-snug text-maroon-900">How is Sadhana Sang for you?</p>

        <div className="mt-3 flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => {
                setRating(s);
                setTimeout(() => setOpenForm(true), 160);
              }}
              onMouseEnter={() => setHovered(s)}
              className="rounded-lg p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95"
              aria-label={`${s} star${s > 1 ? 's' : ''}`}
              style={{ minHeight: 0 }}
            >
              <Star
                className={`h-7 w-7 transition-colors duration-150 ${
                  s <= (hovered || rating) ? 'fill-marigold-400 text-marigold-400' : 'text-sandal-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPrompt;
