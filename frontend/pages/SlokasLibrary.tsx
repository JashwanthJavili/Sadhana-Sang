import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ref, get, set, push, remove, update } from 'firebase/database';
import {
  BookHeart, Plus, Heart, MessageCircle, Trash2, Copy, Check, ChevronDown, ChevronUp, Send, Pencil, Lightbulb, UserRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { isAdmin } from '../services/admin';
import SlokaRequestForm from '../components/SlokaRequestForm';
import MantraForm, { MantraFormValues } from '../components/MantraForm';
import MantraTranslateForm from '../components/MantraTranslateForm';
import LangPicker, { LangOption } from '../components/LangPicker';
import LanguageRequestForm from '../components/LanguageRequestForm';
import CollapsibleSearch from '../components/CollapsibleSearch';
import MantraText from '../components/MantraText';
import { getUserSlokaRequests, SlokaRequest } from '../services/requests';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { PageLoader } from '../components/LoadingScreen';
import i18n from '../i18n';
import { knownTranslation } from '../utils/mantraText';

type Lang = string;

/** Each language is written in its own script */
const BUILTIN_LANGS: LangOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
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
  translations?: Record<string, { mantra?: string; meaning?: string; by?: string }>;
}

const t = i18n.getFixedT('en'); // the page is in English; only the mantras change language

const fieldCls =
  'block h-11 w-full rounded-xl border border-sandal-300 bg-white px-3.5 text-sm text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const act = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold ring-1 transition';
const pill = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition';

/* ------------------------------------------------------------------ */

const SlokasLibrary: React.FC = () => {
  const { user } = useAuth();
  const { ask, dialog } = useConfirm();
  const { showInfo } = useToast();
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
  const [translateFor, setTranslateFor] = useState<{ sloka: Sloka; lang: string; langName: string } | null>(null);
  const [customLangs, setCustomLangs] = useState<LangOption[]>([]);
  const [requestLang, setRequestLang] = useState(false);
  const langOptions = useMemo(() => [...BUILTIN_LANGS, ...customLangs], [customLangs]);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [requests, setRequests] = useState<SlokaRequest[]>([]);

  // Languages an admin has approved
  useEffect(() => {
    get(ref(db, 'slokaLanguages'))
      .then((snap) => {
        const out: LangOption[] = [];
        snap.forEach((c) => {
          const name = c.val()?.name;
          if (name && !BUILTIN_LANGS.some((b) => b.code === c.key)) out.push({ code: c.key!, label: String(name) });
        });
        setCustomLangs(out);
      })
      .catch(() => undefined);
  }, []);

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

  const textIn = (s: Sloka, lang: Lang) =>
    s.translations?.[lang]?.mantra?.trim() || (lang === 'hi' || lang === 'te' ? knownTranslation(s.mantra, lang) : null) || '';

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
    if (!signedIn) return showInfo(t('mantras.signInLike'));
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
    if (!signedIn) return showInfo(t('mantras.signInComment'));
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
    if (!(await ask({ title: t('mantras.deleteConfirm', { title: s.title }), confirmLabel: 'Delete', danger: true }))) return;
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

  const filtering = !!search || category !== 'All';

  return (
    <div className="mx-auto max-w-3xl animate-rise-in space-y-4 pb-4">
      {/* Actions — the page title is already in the top bar */}
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm text-maroon-900/55">
          {slokas.length} {slokas.length === 1 ? 'mantra' : 'mantras'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {signedIn && !userIsAdmin && (
            <button onClick={() => setShowRequest(true)} className="btn-secondary btn-sm">
              <Plus size={15} /> Add a mantra
            </button>
          )}
          {userIsAdmin && (
            <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
              <Plus size={15} /> Add
            </button>
          )}
          <CollapsibleSearch value={search} onChange={setSearch} placeholder="Search mantras" />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`${pill} shrink-0 ring-1 ${category === c ? 'bg-white text-brand-700 shadow-soft ring-amber-300' : 'bg-sandal-100 text-maroon-800/65 ring-sandal-200 hover:bg-sandal-200/60'}`}
              style={{ minHeight: 0 }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {shown.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-sandal-200">
          <BookHeart size={30} className="mx-auto text-amber-400" />
          <p className="mt-3 text-sm font-medium text-maroon-900">{filtering ? 'No mantra found' : 'No mantras yet'}</p>
          <p className="mt-1 text-xs text-maroon-900/55">{filtering ? 'Try a different word or category.' : 'Mantras added by devotees will appear here.'}</p>
        </div>
      ) : (
        <ul className="divide-y divide-sandal-200 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-sandal-200">
          {shown.map((s) => {
            const v = view(s);
            const liked = !!user && s.likedBy?.includes(user.uid);
            const comments = Object.values(s.comments || {}).sort((a, b) => a.timestamp - b.timestamp);
            const idx = slokas.findIndex((x) => x.id === s.id);
            const langName = langOptions.find((l) => l.code === v.lang)?.label || v.lang;
            const showMeaning = !!meaningOpen[s.id];
            const isOpen = !!expanded[s.id];
            const toggle = () => setExpanded((x) => ({ ...x, [s.id]: !isOpen }));
            return (
              <li key={s.id} className={`transition-colors duration-300 motion-reduce:transition-none ${isOpen ? 'bg-sandal-50/60' : ''}`}>
                {/* Header — tap to expand */}
                <button
                  onClick={toggle}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-sandal-50/70 sm:px-5"
                  style={{ minHeight: 0 }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-maroon-900">{s.title}</span>
                      {isOpen && s.category && (
                        <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10.5px] font-semibold text-brand-700 ring-1 ring-amber-200/70">{s.category}</span>
                      )}
                    </span>
                    {!isOpen && <span className="mt-0.5 block truncate text-xs leading-relaxed text-maroon-900/50">{s.mantra.split('\n')[0]}</span>}
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-maroon-900/40 transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-3 px-4 pb-4 sm:px-5">
                      {/* Meta (left) and language picker (right) */}
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <p className="flex min-w-0 flex-1 basis-40 items-center gap-1.5 text-xs text-maroon-900/55">
                          {!v.missing && v.by && (
                            <>
                              <UserRound size={13} className="shrink-0 text-brand-500/70" />
                              <span className="min-w-0 break-words">
                                {v.lang === 'en' ? 'Added by' : `${langName} version by`} <span className="font-semibold text-maroon-900/70">{v.by}</span>
                              </span>
                            </>
                          )}
                        </p>
                        <LangPicker
                          value={v.lang}
                          options={langOptions}
                          onChange={(l) => setLangs((x) => ({ ...x, [s.id]: l }))}
                          onRequest={() => (signedIn ? setRequestLang(true) : showInfo('Please sign in to request a language.'))}
                        />
                      </div>

                      {/* The mantra */}
                      {v.missing ? (
                        <div className="flex flex-col items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-sandal-200 sm:flex-row sm:items-center sm:justify-between">
                          <p className="min-w-0 break-words text-sm leading-relaxed text-maroon-900/65">
                            The {langName} version is not here yet. If you know it, please add it. It will help other devotees too.
                          </p>
                          <button
                            onClick={() => (signedIn ? setTranslateFor({ sloka: s, lang: v.lang, langName }) : showInfo('Please sign in to add a version.'))}
                            className="btn-primary btn-sm shrink-0"
                          >
                            <Plus size={15} /> Add {langName}
                          </button>
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50 via-white to-sandal-50 px-4 pb-6 pt-8 shadow-soft ring-1 ring-sandal-200 sm:px-8 sm:pb-7 sm:pt-9">
                          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-marigold-400/10 blur-2xl" aria-hidden="true" />
                          <Lotus className="absolute left-1/2 top-2.5 h-4 w-8 -translate-x-1/2 text-marigold-400/60" />
                          <div key={v.lang} className="relative break-words text-center font-medium text-maroon-900 motion-safe:animate-fadeIn">
                            <MantraText text={v.mantra} lines={v.lang === 'en' ? s.lines : 0} maxSize={24} />
                          </div>
                        </div>
                      )}

                      {/* Meaning */}
                      {!v.missing && v.meaning && (
                        <div className="rounded-xl bg-white ring-1 ring-sandal-200/80">
                          <button
                            onClick={() => setMeaningOpen((m) => ({ ...m, [s.id]: !showMeaning }))}
                            className="flex h-10 w-full items-center justify-between gap-2 px-3.5 text-left text-[13px] font-semibold text-brand-700 transition hover:text-brand-600"
                            aria-expanded={showMeaning}
                            style={{ minHeight: 0 }}
                          >
                            <span className="flex items-center gap-1.5">
                              <Lightbulb size={14} /> {showMeaning ? 'Hide meaning' : 'Show meaning'}
                            </span>
                            <ChevronDown size={16} className={`shrink-0 transition-transform duration-300 motion-reduce:transition-none ${showMeaning ? 'rotate-180' : ''}`} />
                          </button>
                          <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${showMeaning ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                            <div className="min-h-0 overflow-hidden">
                              <p className="whitespace-pre-line break-words border-t border-sandal-200/70 px-3.5 py-3 text-left text-sm leading-relaxed text-maroon-900/75">{v.meaning}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button onClick={() => like(s)} className={`${act} ${liked ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-white text-maroon-800/70 ring-sandal-200 hover:bg-sandal-100'}`} aria-label={liked ? 'Unlike' : 'Like'} style={{ minHeight: 0 }}>
                          <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {s.likes || 0}
                        </button>
                        <button onClick={() => setCommentsOpen(commentsOpen === s.id ? null : s.id)} className={`${act} ${commentsOpen === s.id ? 'bg-amber-50 text-brand-700 ring-amber-200' : 'bg-white text-maroon-800/70 ring-sandal-200 hover:bg-sandal-100'}`} aria-label="Comments" aria-expanded={commentsOpen === s.id} style={{ minHeight: 0 }}>
                          <MessageCircle size={16} /> {comments.length}
                        </button>
                        {!v.missing && (
                          <button onClick={() => copy(s)} className={`${act} bg-white text-maroon-800/70 ring-sandal-200 hover:bg-sandal-100`} aria-label="Copy" style={{ minHeight: 0 }}>
                            {copied === s.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                            <span className="hidden sm:inline">{copied === s.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                        {userIsAdmin && (
                          <span className="ml-auto flex items-center gap-2">
                            <button onClick={() => setEditing(s)} className={`${act} w-10 !px-0 bg-white text-maroon-800/70 ring-sandal-200 hover:bg-sandal-100`} aria-label="Edit" title="Edit" style={{ minHeight: 0 }}>
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => move(idx, -1)} disabled={idx <= 0} className={`${act} w-10 !px-0 bg-white text-maroon-800/70 ring-sandal-200 hover:bg-sandal-100 disabled:opacity-30`} aria-label="Move up" title="Move up" style={{ minHeight: 0 }}>
                              <ChevronUp size={17} />
                            </button>
                            <button onClick={() => move(idx, 1)} disabled={idx >= slokas.length - 1} className={`${act} w-10 !px-0 bg-white text-maroon-800/70 ring-sandal-200 hover:bg-sandal-100 disabled:opacity-30`} aria-label="Move down" title="Move down" style={{ minHeight: 0 }}>
                              <ChevronDown size={17} />
                            </button>
                            <button onClick={() => removeSloka(s)} className={`${act} w-10 !px-0 bg-white text-rose-600 ring-rose-200 hover:bg-rose-50`} aria-label="Delete" title="Delete" style={{ minHeight: 0 }}>
                              <Trash2 size={16} />
                            </button>
                          </span>
                        )}
                      </div>

                      {/* Comments */}
                      {commentsOpen === s.id && (
                        <div className="space-y-2.5 rounded-2xl bg-white p-3 ring-1 ring-sandal-200/80 motion-safe:animate-fadeIn">
                          {comments.length === 0 && <p className="py-1 text-center text-sm text-maroon-900/50">No comments yet.</p>}
                          {comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-2.5 rounded-xl bg-sandal-50/70 px-3 py-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold uppercase text-brand-700" aria-hidden="true">
                                {(c.userName || 'D').trim().charAt(0)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="min-w-0 truncate text-sm font-semibold text-maroon-900">{c.userName}</span>
                                  <span className="shrink-0 text-[11px] text-maroon-900/45">{new Date(c.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-maroon-900/75">{c.text}</p>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <input
                              value={commentText[s.id] || ''}
                              onChange={(e) => setCommentText((c) => ({ ...c, [s.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addComment(s.id)}
                              placeholder="Write a comment"
                              aria-label="Write a comment"
                              className={`${fieldCls} h-11 min-w-0 flex-1`}
                            />
                            <button onClick={() => addComment(s.id)} className="btn-primary h-11 shrink-0 px-3.5" aria-label="Post comment">
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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
          <h3 className="text-sm font-semibold text-maroon-900">Your requests</h3>
          <p className="mb-3 text-xs text-maroon-900/55">Mantras and versions you sent for review.</p>
          <ul className="divide-y divide-sandal-200/70">
            {requests.map((r) => (
              <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-medium text-maroon-900">{r.title}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                    {r.status === 'pending' ? 'Waiting' : r.status === 'approved' ? 'Added' : 'Not added'}
                  </span>
                </div>
                {r.adminComment && <p className="mt-1 break-words text-xs text-maroon-900/65">Note: {r.adminComment}</p>}
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
      {requestLang && <LanguageRequestForm existing={langOptions.map((l) => l.label)} onClose={() => setRequestLang(false)} />}
      {translateFor && <MantraTranslateForm sloka={translateFor.sloka} lang={translateFor.lang} langName={translateFor.langName} onClose={() => setTranslateFor(null)} />}
      {dialog}
    </div>
  );
};

/** A small lotus drawn in thin lines, used as a quiet ornament */
const Lotus: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M32 30C26.5 24 26.5 12 32 3c5.5 9 5.5 21 0 27Z" />
    <path d="M32 30c-6-2.5-13.5-9-15.5-19 8 .5 14 7 15.5 19Z" />
    <path d="M32 30c6-2.5 13.5-9 15.5-19-8 .5-14 7-15.5 19Z" />
    <path d="M32 30C24 30.5 12 28 5 20.5c8.5-2.5 18.5 1.5 27 9.5Z" />
    <path d="M32 30c8 .5 20-2 27-9.5-8.5-2.5-18.5 1.5-27 9.5Z" />
  </svg>
);

export default SlokasLibrary;
