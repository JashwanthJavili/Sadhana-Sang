import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ref, get, set, push, remove, update } from 'firebase/database';
import {
  BookHeart, Plus, Search, Heart, MessageCircle, Trash2, Copy, Check, ChevronDown, ChevronUp, Send, Languages,
  Pencil, X, Lightbulb, UserRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { isAdmin } from '../services/admin';
import SlokaRequestForm from '../components/SlokaRequestForm';
import MantraForm, { MantraFormValues } from '../components/MantraForm';
import MantraTranslateForm from '../components/MantraTranslateForm';
import MantraText from '../components/MantraText';
import { getUserSlokaRequests, SlokaRequest } from '../services/requests';
import { PageLoader } from '../components/LoadingScreen';
import i18n from '../i18n';
import { knownTranslation } from '../utils/mantraText';

type Lang = 'en' | 'hi' | 'te';

const LANG_OPTIONS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'English', name: 'English' },
  { code: 'hi', label: 'हिन्दी', name: 'Hindi' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu' },
];

interface Comment {
  id: string;
  text: string;
  userName: string;
  userId: string;
  timestamp: number;
}

interface Sloka {
  id: string;
  title: string;
  mantra: string;
  meaning?: string;
  category?: string;
  /** undefined = Auto, 0 = as typed, n = n lines. Set by an admin. */
  lines?: number;
  addedBy: string;
  addedByName: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
  comments?: Record<string, Comment>;
  order?: number;
  /** Saved Hindi / Telugu versions, written by devotees */
  translations?: Partial<Record<'hi' | 'te', { mantra?: string; meaning?: string; by?: string }>>;
}

const t = i18n.getFixedT('en'); // the page is in English; only the mantras change language

const fieldCls =
  'block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-2.5 text-sm text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const pill = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition';

/* ------------------------------------------------------------------ */
/* Language dropdown (one per mantra)                                  */
/* ------------------------------------------------------------------ */

const LangPicker: React.FC<{ value: Lang; onChange: (l: Lang) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const current = LANG_OPTIONS.find((l) => l.code === value)!;

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        className={`flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-2 text-[13px] font-semibold ring-1 transition ${open ? 'bg-amber-50 text-brand-700 ring-amber-300' : 'bg-white text-maroon-800 ring-sandal-200 hover:bg-sandal-50'}`}
        style={{ minHeight: 0 }}
      >
        <Languages size={14} className="text-brand-500" />
        {current.label}
        <ChevronDown size={14} className={`text-maroon-900/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Choose language" className="absolute right-0 top-full z-30 mt-1.5 w-48 animate-scale-in overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-sandal-200">
          {LANG_OPTIONS.map((l) => {
            const on = l.code === value;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${on ? 'bg-amber-50' : 'hover:bg-sandal-50'}`}
                  style={{ minHeight: 0 }}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${on ? 'text-brand-700' : 'text-maroon-900'}`}>
                      {l.label}
                    </span>
                    {l.code !== 'en' && <span className="block text-[11px] text-maroon-900/40">{l.name}</span>}
                  </span>
                  {on && <Check size={16} className="shrink-0 text-brand-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const SlokasLibrary: React.FC = () => {
  const { user } = useAuth();
  const signedIn = !!user && user.uid !== 'guest';
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [meaningOpen, setMeaningOpen] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [langs, setLangs] = useState<Record<string, Lang>>({}); // per mantra, English by default
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Sloka | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [translateFor, setTranslateFor] = useState<{ sloka: Sloka; lang: 'hi' | 'te' } | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [requests, setRequests] = useState<SlokaRequest[]>([]);

  const load = async () => {
    try {
      const snap = await get(ref(db, 'slokas'));
      const list: Sloka[] = [];
      if (snap.exists()) {
        snap.forEach((c) => {
          const v = c.val();
          // older records used different field names
          list.push({
            ...v,
            id: c.key!,
            title: v.title || '',
            mantra: v.mantra ?? v.sanskrit ?? '',
            meaning: v.meaning ?? v.translation ?? '',
            lines: typeof v.lines === 'number' ? v.lines : undefined,
            timestamp: v.timestamp ?? v.createdAt ?? 0,
            addedByName: v.addedByName ?? v.contributedBy ?? '',
            likes: v.likes || 0,
            likedBy: v.likedBy || [],
          });
        });
      }
      setSlokas(list.sort((a, b) => (a.order !== undefined && b.order !== undefined ? a.order - b.order : b.timestamp - a.timestamp)));
    } catch (e) {
      console.error('Error loading mantras:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    isAdmin().then(setUserIsAdmin);
  }, []);

  useEffect(() => {
    if (signedIn) return getUserSlokaRequests(user!.uid, setRequests);
  }, [user, signedIn]);

  const categories = useMemo(() => {
    const set_ = new Set(slokas.map((s) => s.category).filter(Boolean) as string[]);
    return set_.size > 1 ? ['All', ...set_] : [];
  }, [slokas]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return slokas.filter(
      (s) =>
        (category === 'All' || s.category === category) &&
        (!q || s.title.toLowerCase().includes(q) || s.mantra.toLowerCase().includes(q) || s.meaning?.toLowerCase().includes(q))
    );
  }, [slokas, search, category]);

  const textIn = (s: Sloka, lang: 'hi' | 'te') => s.translations?.[lang]?.mantra?.trim() || knownTranslation(s.mantra, lang) || '';

  /** What to show for a mantra in the language chosen for it */
  const view = (s: Sloka) => {
    const lang = langs[s.id] || 'en';
    if (lang === 'en') return { lang, mantra: s.mantra, meaning: s.meaning || '', missing: false, by: s.addedByName };
    const saved = s.translations?.[lang];
    const given = textIn(s, lang);
    return { lang, mantra: given, meaning: saved?.meaning?.trim() || s.meaning || '', missing: !given, by: saved?.by || '' };
  };

  /* ----------------------------- actions ----------------------------- */

  const like = async (s: Sloka) => {
    if (!signedIn) return alert(t('mantras.signInLike'));
    const liked = s.likedBy?.includes(user!.uid);
    const likedBy = liked ? s.likedBy.filter((id) => id !== user!.uid) : [...(s.likedBy || []), user!.uid];
    setSlokas((list) => list.map((x) => (x.id === s.id ? { ...x, likedBy, likes: likedBy.length } : x)));
    try {
      await update(ref(db), { [`slokas/${s.id}/likedBy`]: likedBy, [`slokas/${s.id}/likes`]: likedBy.length });
    } catch (e) {
      console.error(e);
      load();
    }
  };

  const addComment = async (id: string) => {
    if (!signedIn) return alert(t('mantras.signInComment'));
    const text = commentText[id]?.trim();
    if (!text) return;
    const r = push(ref(db, `slokas/${id}/comments`));
    const comment: Comment = { id: r.key!, text, userName: user!.displayName || 'Devotee', userId: user!.uid, timestamp: Date.now() };
    try {
      await set(r, comment);
      setCommentText((c) => ({ ...c, [id]: '' }));
      setSlokas((list) => list.map((x) => (x.id === id ? { ...x, comments: { ...(x.comments || {}), [comment.id]: comment } } : x)));
    } catch (e) {
      console.error(e);
    }
  };

  const copy = async (s: Sloka) => {
    const v = view(s);
    if (v.missing) return;
    const text = `${s.title}\n\n${v.mantra}${v.meaning ? `\n\n${v.meaning}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(s.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const removeSloka = async (s: Sloka) => {
    if (!confirm(t('mantras.deleteConfirm', { title: s.title }))) return;
    await remove(ref(db, `slokas/${s.id}`));
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const list = [...slokas];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setSlokas(list);
    const updates: Record<string, number> = {};
    list.forEach((s, i) => (updates[`slokas/${s.id}/order`] = i));
    await update(ref(db), updates).catch(() => load());
  };

  const translationsFrom = (v: MantraFormValues, old?: Sloka) => {
    const me = user!.displayName || 'Admin';
    const one = (lang: 'hi' | 'te', mantra: string, meaning: string) => {
      if (!mantra.trim()) return null;
      const prev = old?.translations?.[lang];
      const by = prev?.mantra?.trim() === mantra.trim() && prev?.by ? prev.by : me;
      return { mantra: mantra.trim(), meaning: meaning.trim(), by };
    };
    return { hi: one('hi', v.hiMantra, v.hiMeaning), te: one('te', v.teMantra, v.teMeaning) };
  };

  /** Admin: publish a mantra straight away */
  const addSloka = async (v: MantraFormValues) => {
    if (!signedIn) throw new Error('not signed in');
    const r = push(ref(db, 'slokas'));
    const tr = translationsFrom(v);
    const translations = Object.fromEntries(Object.entries(tr).filter(([, x]) => x));
    await set(r, {
      id: r.key,
      title: v.title.trim(),
      mantra: v.mantra.trim(),
      meaning: v.meaning.trim(),
      category: v.category,
      ...(v.lines !== undefined ? { lines: v.lines } : {}),
      ...(Object.keys(translations).length ? { translations } : {}),
      addedBy: user!.uid,
      addedByName: user!.displayName || 'Devotee',
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
    });
    setShowAdd(false);
    load();
  };

  /** Admin: save changes to an existing mantra */
  const saveEdit = async (v: MantraFormValues) => {
    if (!editing) return;
    const tr = translationsFrom(v, editing);
    await update(ref(db, `slokas/${editing.id}`), {
      title: v.title.trim(),
      mantra: v.mantra.trim(),
      meaning: v.meaning.trim(),
      category: v.category,
      lines: v.lines ?? null,
      'translations/hi': tr.hi,
      'translations/te': tr.te,
      // old field names, so the record has one source of truth
      sanskrit: null,
      translation: null,
    });
    setEditing(null);
    load();
  };

  if (loading) return <PageLoader label={t('mantras.loading')} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4">
      {/* Title + actions */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-maroon-900">Mantras</h1>
          <p className="mt-0.5 text-sm text-maroon-900/55">Read, recite and share prayers and kirtans.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {signedIn && (
            <button onClick={() => setShowRequest(true)} className="btn-secondary flex-1 sm:flex-none">
              <Lightbulb size={16} /> Suggest a mantra
            </button>
          )}
          {userIsAdmin && (
            <button onClick={() => setShowAdd(true)} className="btn-primary flex-1 sm:flex-none">
              <Plus size={16} /> Add mantra
            </button>
          )}
        </div>
      </header>

      {/* Search + type */}
      <div className="space-y-3">
        <label className="flex items-center gap-2.5 rounded-2xl bg-white px-4 shadow-soft ring-1 ring-sandal-200 focus-within:ring-2 focus-within:ring-marigold-400">
          <Search size={18} className="shrink-0 text-maroon-900/35" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or words" className="w-full bg-transparent py-3 text-[15px] text-maroon-900 outline-none placeholder:text-maroon-900/35" />
          {search && (
            <button onClick={() => setSearch('')} className="text-maroon-900/40 hover:text-maroon-900" aria-label="Clear search" style={{ minHeight: 0 }}>
              <X size={17} />
            </button>
          )}
        </label>
        {categories.length > 0 && (
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`${pill} shrink-0 ring-1 ${category === c ? 'bg-amber-100 text-brand-700 ring-amber-300' : 'bg-white text-maroon-800/65 ring-sandal-200 hover:bg-sandal-50'}`}
                style={{ minHeight: 0 }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-sandal-200">
          <BookHeart size={34} className="mx-auto text-amber-400" />
          <p className="mt-3 text-sm text-maroon-900/55">{search || category !== 'All' ? 'No mantra found.' : 'No mantras added yet.'}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {shown.map((s) => {
            const v = view(s);
            const liked = !!user && s.likedBy?.includes(user.uid);
            const comments = Object.values(s.comments || {}).sort((a, b) => a.timestamp - b.timestamp);
            const idx = slokas.findIndex((x) => x.id === s.id);
            const langName = LANG_OPTIONS.find((l) => l.code === v.lang)!.name;
            const showMeaning = !!meaningOpen[s.id];
            const isOpen = !!expanded[s.id];
            const toggle = () => setExpanded((x) => ({ ...x, [s.id]: !isOpen }));
            return (
              <li key={s.id} className={`rounded-3xl bg-white ring-1 transition-shadow duration-300 ${isOpen ? 'shadow-card ring-amber-200/80' : 'shadow-soft ring-sandal-200/90'}`}>
                {/* Header — tap to expand */}
                <div className="flex items-center gap-2 py-2 pl-2 pr-3 sm:pr-4">
                  <button
                    onClick={toggle}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-1.5 text-left"
                    style={{ minHeight: 0 }}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors ${isOpen ? 'bg-amber-100 text-brand-600 ring-amber-200' : 'bg-amber-50 text-brand-500 ring-amber-100'}`}>
                      <BookHeart size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      {s.category && <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-brand-600/80">{s.category}</span>}
                      <span className="block truncate text-[15px] font-semibold leading-snug text-maroon-900">{s.title}</span>
                      {!isOpen && <span className="block truncate text-xs text-maroon-900/45">{s.mantra.split('\n')[0]}</span>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="animate-fadeIn">
                      <LangPicker value={v.lang} onChange={(l) => setLangs((x) => ({ ...x, [s.id]: l }))} />
                    </div>
                  )}
                  <button onClick={toggle} className="icon-btn shrink-0" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                    <ChevronDown size={18} className={`text-maroon-900/45 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="min-h-0 overflow-hidden">
                {/* The mantra */}
                <div className="px-3 pt-1 sm:px-5">
                  {v.missing ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-sandal-50 px-4 py-3 ring-1 ring-sandal-200">
                      <p className="text-sm text-maroon-900/60">No {langName} version yet</p>
                      <button
                        onClick={() => (signedIn ? setTranslateFor({ sloka: s, lang: v.lang as 'hi' | 'te' }) : alert('Please sign in to add a version.'))}
                        className="btn-primary btn-sm shrink-0"
                      >
                        <Plus size={15} /> Add {langName}
                      </button>
                    </div>
                  ) : (
                    <div key={v.lang} className="animate-fadeIn rounded-2xl bg-gradient-to-b from-amber-50 to-orange-50/40 px-3 py-4 text-center font-medium text-maroon-900 ring-1 ring-amber-100 sm:px-6">
                      <MantraText text={v.mantra} lines={s.lines} />
                    </div>
                  )}
                </div>

                {/* Who added this version */}
                {!v.missing && v.by && (
                  <p className="flex items-center gap-1.5 px-4 pt-2.5 text-xs text-maroon-900/50 sm:px-5">
                    <UserRound size={13} className="text-brand-500/70" />
                    {v.lang === 'en' ? 'Added by' : `${langName} version by`}
                    <span className="font-semibold text-maroon-900/70">{v.by}</span>
                  </p>
                )}

                {/* Meaning */}
                {!v.missing && v.meaning && (
                  <div className="px-4 pt-3 sm:px-5">
                    <button
                      onClick={() => setMeaningOpen((m) => ({ ...m, [s.id]: !showMeaning }))}
                      className="flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
                      aria-expanded={showMeaning}
                      style={{ minHeight: 0 }}
                    >
                      {showMeaning ? 'Hide meaning' : 'Show meaning'}
                      <ChevronDown size={15} className={`transition-transform ${showMeaning ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${showMeaning ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <p className="min-h-0 overflow-hidden whitespace-pre-line text-sm leading-relaxed text-maroon-900/75">
                        <span className="block pt-2">{v.meaning}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-sandal-200/70 px-3 py-2.5 sm:px-4">
                  <button onClick={() => like(s)} className={`${pill} ${liked ? 'bg-rose-50 text-rose-600' : 'text-maroon-800/65 hover:bg-sandal-100'}`} aria-label={liked ? 'Unlike' : 'Like'} style={{ minHeight: 0 }}>
                    <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {s.likes || 0}
                  </button>
                  <button onClick={() => setCommentsOpen(commentsOpen === s.id ? null : s.id)} className={`${pill} ${commentsOpen === s.id ? 'bg-amber-50 text-brand-700' : 'text-maroon-800/65 hover:bg-sandal-100'}`} aria-label="Comments" style={{ minHeight: 0 }}>
                    <MessageCircle size={16} /> {comments.length}
                  </button>
                  {!v.missing && (
                    <button onClick={() => copy(s)} className={`${pill} text-maroon-800/65 hover:bg-sandal-100`} aria-label="Copy" style={{ minHeight: 0 }}>
                      {copied === s.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      <span className="hidden sm:inline">{copied === s.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                  {userIsAdmin && (
                    <span className="ml-auto flex items-center">
                      <button onClick={() => setEditing(s)} className="icon-btn" aria-label="Edit" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => move(idx, -1)} disabled={idx <= 0} className="icon-btn disabled:opacity-30" aria-label="Move up" title="Move up">
                        <ChevronUp size={17} />
                      </button>
                      <button onClick={() => move(idx, 1)} disabled={idx >= slokas.length - 1} className="icon-btn disabled:opacity-30" aria-label="Move down" title="Move down">
                        <ChevronDown size={17} />
                      </button>
                      <button onClick={() => removeSloka(s)} className="icon-btn text-rose-500" aria-label="Delete" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  )}
                </div>

                {/* Comments */}
                {commentsOpen === s.id && (
                  <div className="animate-fadeIn space-y-2.5 rounded-b-3xl border-t border-sandal-200/70 bg-sandal-50/60 px-4 py-3 sm:px-5">
                    {comments.length === 0 && <p className="py-1 text-center text-sm text-maroon-900/45">No comments yet.</p>}
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-sandal-200">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-maroon-900">{c.userName}</span>
                          <span className="text-[11px] text-maroon-900/40">{new Date(c.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-maroon-900/75">{c.text}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={commentText[s.id] || ''}
                        onChange={(e) => setCommentText((c) => ({ ...c, [s.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addComment(s.id)}
                        placeholder="Write a comment"
                        className={fieldCls}
                      />
                      <button onClick={() => addComment(s.id)} className="btn-primary px-3.5" aria-label="Post comment">
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
                </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* My suggestions */}
      {requests.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 sm:p-5">
          <h3 className="text-sm font-semibold text-maroon-900">Your suggestions</h3>
          <p className="mb-3 text-xs text-maroon-900/50">Mantras and versions you sent for review.</p>
          <ul className="divide-y divide-sandal-200/70">
            {requests.map((r) => (
              <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-sm font-medium text-maroon-900">{r.title}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                    {r.status === 'pending' ? 'Waiting' : r.status === 'approved' ? 'Added' : 'Not added'}
                  </span>
                </div>
                {r.adminComment && <p className="mt-1 text-xs text-maroon-900/65">Note: {r.adminComment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showAdd && <MantraForm mode="admin" onClose={() => setShowAdd(false)} onSubmit={addSloka} />}
      {editing && (
        <MantraForm
          mode="edit"
          initial={{
            title: editing.title,
            mantra: editing.mantra,
            meaning: editing.meaning || '',
            category: editing.category || 'Mantra',
            lines: editing.lines,
            hiMantra: editing.translations?.hi?.mantra || '',
            hiMeaning: editing.translations?.hi?.meaning || '',
            teMantra: editing.translations?.te?.mantra || '',
            teMeaning: editing.translations?.te?.meaning || '',
          }}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      )}
      {showRequest && <SlokaRequestForm onClose={() => setShowRequest(false)} />}
      {translateFor && <MantraTranslateForm sloka={translateFor.sloka} lang={translateFor.lang} onClose={() => setTranslateFor(null)} />}
    </div>
  );
};

export default SlokasLibrary;
