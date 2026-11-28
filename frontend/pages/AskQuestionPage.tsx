import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createQuestion } from '../services/questions';
import { useToast } from '../contexts/ToastContext';
import { Question } from '../types/questions';
import { ArrowLeft, Send, Check, Loader2 } from 'lucide-react';

const fieldCls =
  'block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-2.5 text-base text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20 sm:text-sm';

const AskQuestionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showWarning } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Question['category']>('general');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories: Array<{ value: Question['category']; label: string; description: string }> = [
    { value: 'spiritual', label: 'Spiritual guidance', description: 'Prayer, faith and inner life' },
    { value: 'sadhana', label: 'Daily practice', description: 'Chanting, reading and daily routine' },
    { value: 'scripture', label: 'Scriptures', description: 'Bhagavad Gita, Srimad Bhagavatam and more' },
    { value: 'lifestyle', label: 'Devotional life', description: 'Home, food, work and family' },
    { value: 'general', label: 'General', description: 'Anything else you want to ask' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !title.trim() || !content.trim()) {
      showWarning('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 5);

      const questionId = await createQuestion(
        user.uid,
        user.displayName || 'Anonymous',
        title.trim(),
        content.trim(),
        category,
        tags,
        user.photoURL || undefined
      );

      navigate(`/questions/${questionId}`);
    } catch (error) {
      console.error('Error creating question:', error);
      showError('Could not post your question', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tagPreview = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
  const canPost = !submitting && !!title.trim() && !!content.trim();

  return (
    <div className="mx-auto max-w-2xl animate-rise-in">
      <button
        onClick={() => navigate('/questions')}
        className="mb-3 inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-maroon-900/60 transition hover:bg-amber-50 hover:text-maroon-900"
      >
        <ArrowLeft size={17} /> All questions
      </button>

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-sandal-200">
        {/* Header */}
        <div className="border-b border-sandal-100 px-5 pb-4 pt-5 sm:px-7">
          <h1 className="text-xl font-semibold text-maroon-900 sm:text-2xl">Ask a question</h1>
          <p className="mt-1 text-sm leading-relaxed text-maroon-900/65">
            Write your question simply and clearly. Devotees in the community will reply.
          </p>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          {/* Title */}
          <div>
            <label htmlFor="q-title" className="mb-1.5 block text-sm font-semibold text-maroon-900">
              Your question <span className="text-brand-600">*</span>
            </label>
            <input
              id="q-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How can I stay focused while chanting?"
              maxLength={200}
              className={fieldCls}
              required
            />
            <div className="mt-1.5 flex justify-between gap-2 text-xs text-maroon-900/50">
              <span>Keep it short, in one line.</span>
              <span className="shrink-0">{title.length}/200</span>
            </div>
          </div>

          {/* Category */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-maroon-900">
              Topic <span className="text-brand-600">*</span>
            </legend>
            <p className="mb-3 text-xs text-maroon-900/50">Pick the one that fits best.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categories.map((cat) => {
                const active = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    aria-pressed={active}
                    className={`flex items-start gap-3 rounded-xl p-3 text-left transition ${
                      active ? 'bg-amber-50 ring-2 ring-marigold-400' : 'bg-white ring-1 ring-sandal-200 hover:ring-marigold-400/60'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        active ? 'bg-brand-600 text-white' : 'ring-1 ring-sandal-300'
                      }`}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-maroon-900">{cat.label}</span>
                      <span className="block text-xs text-maroon-900/55">{cat.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Details */}
          <div>
            <label htmlFor="q-details" className="mb-1.5 block text-sm font-semibold text-maroon-900">
              More details <span className="text-brand-600">*</span>
            </label>
            <textarea
              id="q-details"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell a little more. What have you tried? Where are you stuck?"
              rows={7}
              className={`${fieldCls} resize-none leading-relaxed`}
              required
            />
            <p className="mt-1.5 text-xs text-maroon-900/50">A little background helps others give a good answer.</p>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="q-tags" className="mb-1.5 block text-sm font-semibold text-maroon-900">
              Keywords <span className="font-normal text-maroon-900/45">(optional)</span>
            </label>
            <input
              id="q-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. japa, focus, morning"
              className={fieldCls}
            />
            <p className="mt-1.5 text-xs text-maroon-900/50">Up to 5 words, separated by commas. They help others find your question.</p>
            {tagPreview.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tagPreview.map((tag, idx) => (
                  <span key={idx} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-amber-200/70">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-sandal-50 p-4 ring-1 ring-sandal-200">
            <p className="text-sm font-semibold text-maroon-900">A few simple tips</p>
            <ul className="mt-2 space-y-1.5 text-sm text-maroon-900/65">
              {[
                'Ask one thing at a time.',
                'Share some background about your situation.',
                'Be kind and open to different views.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-sandal-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={() => navigate('/questions')} className="btn-secondary h-11 w-full sm:w-auto">
            Cancel
          </button>
          <button type="submit" disabled={!canPost} className="btn-primary h-11 w-full sm:w-auto">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Posting…' : 'Post question'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AskQuestionPage;
