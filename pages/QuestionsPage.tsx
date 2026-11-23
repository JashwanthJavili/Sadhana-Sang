import React, { useEffect, useState } from 'react';
import { PageLoader } from '../components/LoadingScreen';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Question } from '../types/questions';
import { getAllQuestions, upvoteQuestion } from '../services/questions';
import { Search, Plus, ThumbsUp, MessageCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

const QUESTION_CATEGORIES: Array<{ value: Question['category']; label: string }> = [
  { value: 'spiritual', label: 'Spiritual guidance' },
  { value: 'sadhana', label: 'Daily practice' },
  { value: 'scripture', label: 'Scriptures' },
  { value: 'lifestyle', label: 'Devotional life' },
  { value: 'general', label: 'General' },
];

const categoryLabel = (c: Question['category']) => QUESTION_CATEGORIES.find((x) => x.value === c)?.label ?? c;

const timeAgo = (timestamp: number) => {
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

const Avatar: React.FC<{ name: string; photo?: string; size?: 'sm' | 'md' }> = ({ name, photo, size = 'sm' }) => {
  const cls = size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs';
  if (photo) return <img src={photo} alt="" className={`${cls} shrink-0 rounded-full object-cover ring-1 ring-sandal-200`} />;
  return (
    <span className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-brand-700`}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
};

type SortKey = 'recent' | 'popular' | 'unanswered';

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'unanswered', label: 'Not answered' },
];

const QuestionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Question['category'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getAllQuestions((fetchedQuestions) => {
      setQuestions(fetchedQuestions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = [...questions];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((q) => q.category === selectedCategory);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(s) ||
          q.content.toLowerCase().includes(s) ||
          q.userName.toLowerCase().includes(s) ||
          q.tags.some((tag) => tag.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'recent') {
        return b.timestamp - a.timestamp;
      } else if (sortBy === 'popular') {
        return b.upvotes.length + b.viewCount - (a.upvotes.length + a.viewCount);
      } else {
        if (a.answerCount === 0 && b.answerCount > 0) return -1;
        if (a.answerCount > 0 && b.answerCount === 0) return 1;
        return b.timestamp - a.timestamp;
      }
    });

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, selectedCategory, sortBy]);

  const handleUpvote = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await upvoteQuestion(questionId, user.uid);
  };

  if (loading) return <PageLoader label="Loading questions…" />;

  const filtering = !!searchTerm || selectedCategory !== 'all';
  const chips: Array<{ value: Question['category'] | 'all'; label: string }> = [{ value: 'all', label: 'All' }, ...QUESTION_CATEGORIES];

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-fadeIn sm:space-y-5">
      {/* Intro */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-white p-5 ring-1 ring-amber-200/70 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-maroon-900 sm:text-2xl">Questions and answers</h1>
            <p className="mt-1 text-sm leading-relaxed text-maroon-900/65">
              Ask what is on your mind. Fellow devotees will share what they have learned.
            </p>
          </div>
          <button onClick={() => navigate('/questions/ask')} className="btn-primary w-full shrink-0 sm:w-auto">
            <Plus size={16} /> Ask a question
          </button>
        </div>
      </section>

      {/* Search */}
      <label className="flex items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-sandal-200 focus-within:ring-marigold-400">
        <Search size={17} className="shrink-0 text-maroon-900/35" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search questions"
          className="w-full min-w-0 bg-transparent py-3 text-sm text-maroon-900 outline-none placeholder:text-maroon-900/35"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="icon-btn -mr-2 shrink-0" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </label>

      {/* Category chips */}
      <div className="overflow-x-auto py-1 scrollbar-none">
        <div className="flex w-max gap-2">
          {chips.map((c) => {
            const active = selectedCategory === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setSelectedCategory(c.value)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-maroon-900/70 ring-1 ring-sandal-200 hover:ring-marigold-400/60'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-maroon-900/55">
          {filteredQuestions.length} {filteredQuestions.length === 1 ? 'question' : 'questions'}
        </p>
        <div className="inline-flex rounded-xl bg-sandal-200/60 p-1 ring-1 ring-sandal-300/50" role="tablist" aria-label="Sort questions">
          {SORTS.map((s) => (
            <button
              key={s.value}
              role="tab"
              aria-selected={sortBy === s.value}
              onClick={() => setSortBy(s.value)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                sortBy === s.value ? 'bg-white text-maroon-900 shadow-sm' : 'text-maroon-900/50 hover:text-maroon-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-sandal-200 sm:p-10">
          <HelpCircle size={36} className="mx-auto text-maroon-900/25" />
          <p className="mt-3 text-sm font-semibold text-maroon-900">{filtering ? 'No questions found' : 'No questions yet'}</p>
          <p className="mt-1 text-sm text-maroon-900/55">
            {filtering ? 'Try a different word or topic.' : 'Be the first to ask something.'}
          </p>
          <button onClick={() => navigate('/questions/ask')} className="btn-primary mt-5">
            <Plus size={16} /> Ask a question
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredQuestions.map((q, i) => {
            const liked = !!user && !!q.upvotes?.includes(user.uid);
            const answered = q.answerCount > 0;
            return (
              <li key={q.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <div
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/questions/${q.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/questions/${q.id}`);
                  }}
                  className="cursor-pointer rounded-2xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 transition hover:-translate-y-px hover:shadow-card hover:ring-marigold-400/60 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-amber-200/70">
                      {categoryLabel(q.category)}
                    </span>
                    {answered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 size={12} /> Answered
                      </span>
                    ) : (
                      <span className="rounded-full bg-sandal-100 px-2.5 py-0.5 text-[11px] font-semibold text-maroon-900/55">Waiting for answers</span>
                    )}
                  </div>

                  <h2 className="mt-2.5 break-words text-base font-semibold leading-snug text-maroon-900 sm:text-lg">{q.title}</h2>
                  <p className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-maroon-900/60">{q.content}</p>

                  <div className="mt-4 flex items-center gap-3 border-t border-sandal-100 pt-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar name={q.userName} photo={q.userPhoto} />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-xs font-semibold text-maroon-900/80">{q.userName}</p>
                        <p className="text-[11px] text-maroon-900/45">{timeAgo(q.timestamp)}</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-maroon-900/60">
                      <MessageCircle size={15} /> {q.answerCount}
                    </span>
                    <button
                      onClick={(e) => handleUpvote(q.id, e)}
                      aria-pressed={liked}
                      aria-label="Helpful"
                      className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition ${
                        liked ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-maroon-900/60 ring-1 ring-sandal-200 hover:bg-amber-50'
                      }`}
                    >
                      <ThumbsUp size={14} /> {q.upvotes?.length || 0}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default QuestionsPage;
