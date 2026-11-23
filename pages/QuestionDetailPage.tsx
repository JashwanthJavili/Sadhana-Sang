import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PageLoader } from '../components/LoadingScreen';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Question, Answer } from '../types/questions';
import {
  getQuestionById,
  getAnswersForQuestion,
  upvoteQuestion,
  upvoteAnswer,
  createAnswer,
  acceptAnswer,
  addReply,
  incrementViewCount,
} from '../services/questions';
import { ArrowLeft, ThumbsUp, MessageCircle, Eye, Send, CheckCircle2, Reply, Flag, X, Loader2, HelpCircle } from 'lucide-react';

const CATEGORY_LABELS: Record<Question['category'], string> = {
  spiritual: 'Spiritual guidance',
  sadhana: 'Daily practice',
  scripture: 'Scriptures',
  lifestyle: 'Devotional life',
  general: 'General',
};

const FLAG_REASONS = [
  'Spam or promotional content',
  'Offensive or inappropriate language',
  'Misinformation or incorrect facts',
  'Off-topic or not relevant',
  'Other',
];

const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) {
    const d = Math.floor(seconds / 86400);
    return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  }
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Avatar: React.FC<{ name: string; photo?: string; size?: 'xs' | 'sm' | 'md' }> = ({ name, photo, size = 'sm' }) => {
  const cls = size === 'md' ? 'h-10 w-10 text-sm' : size === 'xs' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (photo) return <img src={photo} alt="" className={`${cls} shrink-0 rounded-full object-cover ring-1 ring-sandal-200`} />;
  return (
    <span className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-brand-700`}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
};

const fieldCls =
  'block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-3 text-base text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20 sm:text-sm';

type FlagTarget = { contentType: 'question' | 'answer'; contentId: string; content: any };

const QuestionDetailPage: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flagTarget, setFlagTarget] = useState<FlagTarget | null>(null);
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    if (!questionId) return;

    const loadQuestion = async () => {
      const q = await getQuestionById(questionId);
      setQuestion(q);
      setLoading(false);

      if (q) {
        await incrementViewCount(questionId);
      }
    };

    const unsubscribe = getAnswersForQuestion(questionId, setAnswers);

    loadQuestion();

    return () => unsubscribe();
  }, [questionId]);

  const handleUpvoteQuestion = async () => {
    if (!user || !questionId) return;
    await upvoteQuestion(questionId, user.uid);
    const updated = await getQuestionById(questionId);
    setQuestion(updated);
  };

  const handleUpvoteAnswer = async (answerId: string) => {
    if (!user || !questionId) return;
    await upvoteAnswer(questionId, answerId, user.uid);
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !questionId || !newAnswer.trim()) return;

    setSubmitting(true);
    try {
      await createAnswer(questionId, user.uid, user.displayName || 'Anonymous', newAnswer.trim(), user.photoURL || undefined);
      setNewAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!user || !questionId || !question) return;
    try {
      await acceptAnswer(questionId, answerId, question.userId, user.uid);
    } catch (error: any) {
      alert(error.message || 'Failed to accept answer');
    }
  };

  const handleSubmitReply = async (answerId: string) => {
    if (!user || !questionId || !replyText.trim()) return;

    try {
      await addReply(questionId, answerId, user.uid, user.displayName || 'Anonymous', replyText.trim(), user.photoURL || undefined);
      setReplyText('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply. Please try again.');
    }
  };

  const handleFlagContent = (contentType: 'question' | 'answer', contentId: string, content: any) => {
    if (!user) {
      alert('Please sign in to flag content');
      return;
    }
    setFlagTarget({ contentType, contentId, content });
  };

  const submitFlag = async (reason: string) => {
    if (!user || !flagTarget) return;
    setFlagging(true);
    try {
      const { ref, push, set } = await import('firebase/database');
      const { db } = await import('../services/firebase');

      const flagRef = push(ref(db, 'flaggedContent'));
      await set(flagRef, {
        contentId: flagTarget.contentId,
        contentType: flagTarget.contentType,
        content: flagTarget.content,
        flaggedBy: user.uid,
        flaggedAt: Date.now(),
        reason,
        status: 'pending',
      });

      setFlagTarget(null);
      alert('Thank you for reporting. Our team will review this content shortly.');
    } catch (error) {
      console.error('Error flagging content:', error);
      alert('Failed to flag content. Please try again.');
    } finally {
      setFlagging(false);
    }
  };

  if (loading) return <PageLoader label="Loading question…" />;

  if (!question) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center ring-1 ring-sandal-200 animate-fadeIn">
        <HelpCircle size={36} className="mx-auto text-maroon-900/25" />
        <p className="mt-3 text-sm font-semibold text-maroon-900">This question could not be found</p>
        <p className="mt-1 text-sm text-maroon-900/55">It may have been removed.</p>
        <button onClick={() => navigate('/questions')} className="btn-primary mt-5">
          <ArrowLeft size={16} /> Back to questions
        </button>
      </div>
    );
  }

  const questionLiked = !!user && !!question.upvotes?.includes(user.uid);
  const isOwner = !!user && question.userId === user.uid;

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-fadeIn sm:space-y-5">
      <button
        onClick={() => navigate('/questions')}
        className="inline-flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-maroon-900/60 transition hover:bg-amber-50 hover:text-maroon-900"
      >
        <ArrowLeft size={17} /> All questions
      </button>

      {/* Question */}
      <article className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-sandal-200">
        <div className="bg-gradient-to-br from-amber-100 via-orange-50 to-white px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
          <span className="inline-block rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-amber-200/70">
            {CATEGORY_LABELS[question.category] ?? question.category}
          </span>
          <h1 className="mt-3 break-words text-xl font-semibold leading-snug text-maroon-900 sm:text-2xl">{question.title}</h1>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar name={question.userName} photo={question.userPhoto} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-maroon-900/85">{question.userName}</p>
              <p className="text-xs text-maroon-900/50">Asked {formatTimeAgo(question.timestamp)}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-maroon-900/80">{question.content}</p>

          {question.tags && question.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {question.tags.map((tag, idx) => (
                <span key={idx} className="rounded-full bg-sandal-100 px-2.5 py-1 text-xs font-medium text-maroon-900/65">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sandal-100 pt-4">
            <button
              onClick={handleUpvoteQuestion}
              aria-pressed={questionLiked}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
                questionLiked ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-maroon-900/65 ring-1 ring-sandal-200 hover:bg-amber-50'
              }`}
            >
              <ThumbsUp size={16} /> Helpful · {question.upvotes?.length || 0}
            </button>
            <span className="inline-flex items-center gap-1 px-2 text-xs text-maroon-900/50">
              <Eye size={14} /> {question.viewCount} views
            </span>
            {user && !isOwner && (
              <button
                onClick={() => handleFlagContent('question', question.id, question)}
                className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-maroon-900/45 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Flag size={14} /> Report
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Answers */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 px-1 text-base font-semibold text-maroon-900">
          <MessageCircle size={18} className="text-brand-500" />
          {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
        </h2>

        {answers.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-sandal-200">
            <MessageCircle size={32} className="mx-auto text-maroon-900/25" />
            <p className="mt-3 text-sm font-semibold text-maroon-900">No answers yet</p>
            <p className="mt-1 text-sm text-maroon-900/55">If you know something that may help, share it below.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {answers.map((answer) => {
              const liked = !!user && !!answer.upvotes?.includes(user.uid);
              return (
                <li
                  key={answer.id}
                  className={`rounded-2xl bg-white p-4 shadow-soft sm:p-5 ${answer.isAccepted ? 'ring-2 ring-emerald-300' : 'ring-1 ring-sandal-200'}`}
                >
                  {answer.isAccepted && (
                    <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={14} /> Chosen as best answer
                    </span>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Avatar name={answer.userName} photo={answer.userPhoto} />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-semibold text-maroon-900/85">{answer.userName}</p>
                      <p className="text-xs text-maroon-900/50">{formatTimeAgo(answer.timestamp)}</p>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-maroon-900/80">{answer.content}</p>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleUpvoteAnswer(answer.id)}
                      aria-pressed={liked}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                        liked ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-maroon-900/65 ring-1 ring-sandal-200 hover:bg-amber-50'
                      }`}
                    >
                      <ThumbsUp size={14} /> {answer.upvotes?.length || 0}
                    </button>
                    <button
                      onClick={() => setReplyTo(replyTo === answer.id ? null : answer.id)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                        replyTo === answer.id ? 'bg-amber-50 text-maroon-900' : 'text-maroon-900/65 hover:bg-amber-50'
                      }`}
                    >
                      <Reply size={14} /> Reply
                    </button>
                    {isOwner && !answer.isAccepted && (
                      <button
                        onClick={() => handleAcceptAnswer(answer.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                      >
                        <CheckCircle2 size={14} /> Mark as best
                      </button>
                    )}
                    {user && user.uid !== answer.userId && (
                      <button
                        onClick={() => handleFlagContent('answer', answer.id, { ...answer, questionId })}
                        className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-maroon-900/40 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Report this answer"
                        title="Report this answer"
                      >
                        <Flag size={14} />
                      </button>
                    )}
                  </div>

                  {/* Replies */}
                  {answer.replies && answer.replies.length > 0 && (
                    <ul className="mt-4 space-y-2 border-l-2 border-amber-200 pl-3 sm:pl-4">
                      {answer.replies.map((reply) => (
                        <li key={reply.id} className="rounded-xl bg-sandal-50 p-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={reply.userName} photo={reply.userPhoto} size="xs" />
                            <span className="min-w-0 truncate text-xs font-semibold text-maroon-900/80">{reply.userName}</span>
                            <span className="shrink-0 text-[11px] text-maroon-900/45">{formatTimeAgo(reply.timestamp)}</span>
                          </div>
                          <p className="mt-1.5 break-words text-sm leading-relaxed text-maroon-900/75">{reply.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Reply input */}
                  {replyTo === answer.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmitReply(answer.id);
                      }}
                      className="mt-3 flex gap-2"
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply"
                        autoFocus
                        className={`${fieldCls} min-w-0 flex-1 py-2.5`}
                      />
                      <button type="submit" disabled={!replyText.trim()} className="btn-primary shrink-0 px-3.5" aria-label="Send reply">
                        <Send size={16} />
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Composer */}
      <section className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-sandal-200 sm:p-6">
        <h3 className="text-base font-semibold text-maroon-900">Your answer</h3>
        <p className="mt-0.5 text-xs text-maroon-900/50">Share what you know, kindly and simply.</p>
        <form onSubmit={handleSubmitAnswer} className="mt-3">
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Write your answer here"
            rows={5}
            className={`${fieldCls} resize-none leading-relaxed`}
          />
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={submitting || !newAnswer.trim()} className="btn-primary w-full sm:w-auto">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Posting…' : 'Post answer'}
            </button>
          </div>
        </form>
      </section>

      {/* Report sheet */}
      {flagTarget &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Report">
            <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={flagging ? undefined : () => setFlagTarget(null)} />
            <div
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
              className="relative max-h-[90dvh] w-full animate-rise-in overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 sm:max-w-md sm:rounded-[28px] sm:px-6"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-maroon-900">Report this {flagTarget.contentType}</h3>
                  <p className="mt-0.5 text-sm text-maroon-900/55">What is wrong with it?</p>
                </div>
                <button onClick={() => setFlagTarget(null)} disabled={flagging} className="icon-btn -mr-2 shrink-0" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {FLAG_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => submitFlag(r)}
                    disabled={flagging}
                    className="flex w-full items-center rounded-2xl bg-white px-4 py-3.5 text-left text-sm font-medium text-maroon-900/80 ring-1 ring-sandal-200 transition hover:bg-amber-50 hover:ring-marigold-400/60 disabled:opacity-50"
                  >
                    {r}
                  </button>
                ))}
              </div>
              {flagging && (
                <p className="mt-3 flex items-center justify-center gap-2 text-sm text-maroon-900/55">
                  <Loader2 size={15} className="animate-spin" /> Sending…
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default QuestionDetailPage;
