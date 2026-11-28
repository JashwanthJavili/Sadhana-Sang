import React, { useEffect, useState } from 'react';
import { X, Star, Send, Heart, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ref, push, set } from 'firebase/database';
import { db } from '../services/firebase';

interface FeedbackModalProps {
  onClose: () => void;
  /** Pre-selected star rating (e.g. chosen in the feedback nudge) */
  initialRating?: number;
}

const CONTENT = {
  en: {
    title: 'Share your experience',
    subtitle: 'Your feedback helps us serve devotees better',
    ratingLabel: 'How would you rate Sadhana Sang?',
    categoryLabel: 'What is it about?',
    categories: {
      general: 'General',
      feature: 'Feature idea',
      bug: 'Report a bug',
      usability: 'Ease of use',
      spiritual: 'Spiritual journey',
      other: 'Other',
    },
    messagePlaceholder: 'Tell us more (optional)…',
    submit: 'Send feedback',
    cancel: 'Not now',
    thankYou: 'Thank you!',
    thankYouMessage: 'Your feedback helps us serve the devotee community better. Hare Krishna 🙏',
    ratings: ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'],
    needRating: 'Please choose a rating',
  },
  hi: {
    title: 'अपना अनुभव साझा करें',
    subtitle: 'आपकी प्रतिक्रिया हमें भक्तों की बेहतर सेवा करने में मदद करती है',
    ratingLabel: 'आप साधना संग को कैसे रेट करेंगे?',
    categoryLabel: 'यह किस बारे में है?',
    categories: {
      general: 'सामान्य',
      feature: 'फीचर सुझाव',
      bug: 'बग रिपोर्ट',
      usability: 'उपयोग में आसानी',
      spiritual: 'आध्यात्मिक यात्रा',
      other: 'अन्य',
    },
    messagePlaceholder: 'और बताएं (वैकल्पिक)…',
    submit: 'भेजें',
    cancel: 'अभी नहीं',
    thankYou: 'धन्यवाद!',
    thankYouMessage: 'आपकी प्रतिक्रिया हमें भक्त समुदाय की बेहतर सेवा करने में मदद करती है। हरे कृष्ण 🙏',
    ratings: ['खराब', 'ठीक', 'अच्छा', 'बहुत अच्छा', 'उत्कृष्ट'],
    needRating: 'कृपया रेटिंग चुनें',
  },
  te: {
    title: 'మీ అనుభవాన్ని పంచుకోండి',
    subtitle: 'మీ అభిప్రాయం భక్తులకు మెరుగైన సేవ చేయడంలో సహాయపడుతుంది',
    ratingLabel: 'సాధన సంగ్‌ను ఎలా రేట్ చేస్తారు?',
    categoryLabel: 'ఇది దేని గురించి?',
    categories: {
      general: 'సాధారణం',
      feature: 'ఫీచర్ సూచన',
      bug: 'బగ్ నివేదిక',
      usability: 'వినియోగ సౌలభ్యం',
      spiritual: 'ఆధ్యాత్మిక ప్రయాణం',
      other: 'ఇతర',
    },
    messagePlaceholder: 'మరింత చెప్పండి (ఐచ్ఛికం)…',
    submit: 'పంపండి',
    cancel: 'ఇప్పుడు కాదు',
    thankYou: 'ధన్యవాదాలు!',
    thankYouMessage: 'మీ అభిప్రాయం భక్త సమాజానికి మెరుగైన సేవ చేయడానికి సహాయపడుతుంది. హరే కృష్ణ 🙏',
    ratings: ['పేద', 'సరైన', 'మంచి', 'చాలా మంచి', 'అద్భుతం'],
    needRating: 'దయచేసి రేటింగ్ ఎంచుకోండి',
  },
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose, initialRating = 0 }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const t = CONTENT[(language as 'en' | 'hi' | 'te')] || CONTENT.en;

  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      showError(t.needRating);
      return;
    }
    setSubmitting(true);
    try {
      const newRef = push(ref(db, `users/${user.uid}/feedbacks`));
      await set(newRef, {
        userName: user.displayName || 'Anonymous',
        userEmail: user.email || '',
        rating,
        category,
        message: message.trim(),
        timestamp: Date.now(),
        status: 'new',
        language,
      });
      await set(ref(db, `users/${user.uid}/lastFeedback`), {
        timestamp: Date.now(),
        rating,
        feedbackId: newRef.key,
      });
      setSubmitted(true);
      showSuccess('Feedback sent', 'Thank you for helping us improve');
      setTimeout(close, 2200);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showError('Could not send feedback', 'Please try again later');
      setSubmitting(false);
    }
  };

  const shown = hovered || rating;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-maroon-900/30 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? 'opacity-0' : 'animate-fadeIn'}`}
        onClick={close}
      />

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-t-3xl bg-sandal-50 shadow-2xl ring-1 ring-sandal-300/60 transition-all duration-200 sm:rounded-3xl ${
          closing ? 'translate-y-4 opacity-0' : 'animate-scale-in'
        }`}
      >
        {/* grab handle on mobile */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />

        {submitted ? (
          <div className="px-6 pb-10 pt-8 text-center sm:pt-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-marigold-400 to-brand-600 shadow-glow">
              <Heart className="h-7 w-7 fill-white text-white" />
            </div>
            <h2 className="mt-5 font-elegant text-3xl font-semibold text-maroon-900">{t.thankYou}</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-maroon-900/60">{t.thankYouMessage}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-5 sm:pt-6">
              <div>
                <h2 className="font-elegant text-[1.75rem] font-semibold leading-tight text-maroon-900">{t.title}</h2>
                <p className="mt-1 text-sm text-maroon-900/55">{t.subtitle}</p>
              </div>
              <button
                onClick={close}
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-maroon-900/40 transition hover:bg-sandal-200/70 hover:text-maroon-800"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-6 pt-3">
              {/* Rating */}
              <div>
                <p className="mb-2 text-sm font-semibold text-maroon-800">{t.ratingLabel}</p>
                <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-sandal-300/60">
                  <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHovered(s)}
                        className="rounded-lg p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95"
                        aria-label={`${s} star${s > 1 ? 's' : ''}`}
                        style={{ minHeight: 0 }}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors duration-150 ${
                            s <= shown ? 'fill-marigold-400 text-marigold-400' : 'text-sandal-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-sm font-medium text-maroon-500">{shown ? t.ratings[shown - 1] : ''}</span>
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="mb-2 text-sm font-semibold text-maroon-800">{t.categoryLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(t.categories).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                        category === key
                          ? 'bg-maroon-800 text-sandal-50 shadow-sm'
                          : 'bg-white/80 text-maroon-800/70 ring-1 ring-sandal-300/80 hover:bg-white hover:text-maroon-800'
                      }`}
                      style={{ minHeight: 0 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={3}
                  maxLength={1000}
                  className="block w-full resize-none rounded-2xl border border-sandal-300/80 bg-white/80 px-4 py-3 text-sm text-maroon-900 placeholder:text-maroon-900/35 transition focus:border-marigold-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-marigold-400/20"
                />
                {message.length > 0 && (
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-maroon-900/35">{message.length}/1000</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={close}
                  className="flex-1 rounded-2xl py-3 text-sm font-semibold text-maroon-800/70 transition hover:bg-sandal-200/60 hover:text-maroon-800"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-marigold-500 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(234,88,12,0.7)] transition hover:shadow-[0_14px_28px_-10px_rgba(234,88,12,0.8)] active:scale-[0.99] disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
                  {t.submit}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
