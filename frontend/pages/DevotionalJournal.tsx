import CollapsibleSearch from '../components/CollapsibleSearch';
import React, { useState, useEffect, useMemo } from 'react';
import { localDateKey } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import {
  Plus, Trash2, PenLine, X, Leaf, Smile, Lightbulb, CloudRain, HandHeart,
  ChevronDown, LucideIcon,
} from 'lucide-react';
import { getJournalEntries, saveJournalEntry, deleteJournalEntry } from '../services/storage';

interface JournalEntry {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  content: string;
  mood: 'peaceful' | 'joyful' | 'contemplative' | 'struggling' | 'grateful';
  tags: string[];
}

type Mood = JournalEntry['mood'];

const MOODS: Mood[] = ['peaceful', 'joyful', 'grateful', 'contemplative', 'struggling'];

const moodIcons: Record<Mood, LucideIcon> = {
  peaceful: Leaf,
  joyful: Smile,
  contemplative: Lightbulb,
  struggling: CloudRain,
  grateful: HandHeart,
};

const moodTint: Record<Mood, string> = {
  peaceful: 'bg-emerald-50 text-emerald-700',
  joyful: 'bg-amber-100 text-amber-700',
  contemplative: 'bg-sky-50 text-sky-700',
  struggling: 'bg-stone-100 text-stone-600',
  grateful: 'bg-rose-50 text-rose-700',
};

const moodLabels = {
  en: {
    peaceful: 'Peaceful',
    joyful: 'Happy',
    contemplative: 'Thoughtful',
    struggling: 'Struggling',
    grateful: 'Grateful',
  },
  hi: {
    peaceful: 'शांत',
    joyful: 'आनंदमय',
    contemplative: 'चिंतनशील',
    struggling: 'संघर्षरत',
    grateful: 'कृतज्ञ',
  },
  te: {
    peaceful: 'శాంతియుతం',
    joyful: 'ఆనందకరం',
    contemplative: 'ఆలోచనాత్మకం',
    struggling: 'కష్టపడుతున్నాను',
    grateful: 'కృతజ్ఞత',
  },
};

const field =
  'block w-full rounded-2xl border border-sandal-300 bg-white px-4 py-3 text-[15px] text-maroon-900 placeholder:text-maroon-900/30 transition focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const DevotionalJournal: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showError } = useToast();
  const { ask, dialog } = useConfirm();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<Partial<JournalEntry>>({
    title: '',
    content: '',
    mood: 'peaceful',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  // UI-only state
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const L = (en: string, hi: string, te: string) => (language === 'hi' ? hi : language === 'te' ? te : en);
  const locale = language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'te-IN';

  useEffect(() => {
    const fetchEntries = async () => {
      if (user) {
        try {
          const data = await getJournalEntries(user.uid);
          setEntries(data);
        } catch (error) {
          console.error('Error loading journal entries:', error);
        }
      }
      setLoading(false);
    };
    fetchEntries();
  }, [user]);

  const handleSave = async () => {
    if (user && currentEntry.title && currentEntry.content) {
      setSaving(true);
      try {
        const entry: JournalEntry = {
          id: editingId || Date.now().toString(),
          date: localDateKey(),
          timestamp: Date.now(),
          title: currentEntry.title!,
          content: currentEntry.content!,
          mood: currentEntry.mood || 'peaceful',
          tags: currentEntry.tags || []
        };

        await saveJournalEntry(user.uid, entry);
        const updated = await getJournalEntries(user.uid);
        setEntries(updated);

        setIsWriting(false);
        setEditingId(null);
        setCurrentEntry({ title: '', content: '', mood: 'peaceful', tags: [] });
      } catch (error) {
        console.error('Error saving journal entry:', error);
        showError(L('Could not save entry', 'प्रविष्टि सहेजी नहीं जा सकी', 'ఎంట్రీని సేవ్ చేయలేకపోయాము'), L('Please try again.', 'कृपया पुनः प्रयास करें।', 'దయచేసి మళ్లీ ప్రయత్నించండి.'));
      } finally {
        setSaving(false);
      }
    }
  };

  const startNew = () => {
    setEditingId(null);
    setCurrentEntry({ title: '', content: '', mood: 'peaceful', tags: [] });
    setShowTags(false);
    setIsWriting(true);
  };

  const handleEdit = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setEditingId(entry.id);
    setShowTags((entry.tags?.length || 0) > 0);
    setIsWriting(true);
  };

  const handleCancel = () => {
    setIsWriting(false);
    setEditingId(null);
    setCurrentEntry({ title: '', content: '', mood: 'peaceful', tags: [] });
    setNewTag('');
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const ok = await ask({
      title: L('Delete this entry?', 'यह प्रविष्टि हटाएं?', 'ఈ ఎంట్రీని తొలగించాలా?'),
      message: L('This cannot be undone.', 'इसे वापस नहीं किया जा सकता।', 'దీన్ని తిరిగి పొందలేరు.'),
      confirmLabel: L('Delete', 'हटाएं', 'తొలగించు'),
      cancelLabel: t.common.cancel,
      danger: true,
    });
    if (ok) {
      await deleteJournalEntry(user.uid, id);
      const updated = await getJournalEntries(user.uid);
      setEntries(updated);
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !currentEntry.tags?.includes(tag)) {
      setCurrentEntry({
        ...currentEntry,
        tags: [...(currentEntry.tags || []), tag]
      });
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setCurrentEntry({
      ...currentEntry,
      tags: currentEntry.tags?.filter(t => t !== tag)
    });
  };

  const formatDay = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  // Filter + group by month (display only)
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...entries]
      .filter((e) =>
        !q ||
        e.title?.toLowerCase().includes(q) ||
        e.content?.toLowerCase().includes(q) ||
        e.tags?.some((tag) => tag.toLowerCase().includes(q))
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const map = new Map<string, { label: string; items: JournalEntry[] }>();
    for (const e of list) {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, { label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }), items: [] });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values());
  }, [entries, search, locale]);

  const canSave = !!currentEntry.title && !!currentEntry.content && !saving;

  /* ---------- Writing sheet ---------- */
  const renderEditor = () => (
    <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/40 backdrop-blur-[2px]" onClick={handleCancel} />
      <section className="relative flex max-h-[90dvh] w-full animate-rise-in flex-col overflow-hidden rounded-t-[28px] bg-white shadow-lift sm:max-w-xl sm:rounded-[28px]">
        <div className="flex items-center gap-3 border-b border-sandal-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-maroon-900">
              {editingId ? L('Edit entry', 'प्रविष्टि संपादित करें', 'ఎంట్రీని సవరించండి') : L('New entry', 'नई प्रविष्टि', 'క్రొత్త ఎంట్రీ')}
            </h2>
            <p className="truncate text-xs text-maroon-900/55">
              {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button type="button" onClick={handleCancel} className="icon-btn" aria-label={t.common.cancel}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <input
            type="text"
            value={currentEntry.title}
            onChange={(e) => setCurrentEntry({ ...currentEntry, title: e.target.value })}
            className={`${field} h-11 py-0 font-semibold`}
            placeholder={L('Title', 'शीर्षक', 'శీర్షిక')}
            autoFocus
          />

          <div>
            <p className="mb-2 text-sm font-semibold text-maroon-900">
              {L('How do you feel?', 'आप कैसा महसूस कर रहे हैं?', 'మీరు ఎలా అనుభూతి చెందుతున్నారు?')}
            </p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => {
                const active = currentEntry.mood === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setCurrentEntry({ ...currentEntry, mood })}
                    aria-pressed={active}
                    className={`inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition active:scale-[0.98] ${
                      active ? 'bg-brand-600 text-white shadow-soft' : 'bg-sandal-100 text-maroon-900/70 ring-1 ring-sandal-200 hover:bg-sandal-200'
                    }`}
                  >
                    {moodLabels[language][mood]}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={currentEntry.content}
            onChange={(e) => setCurrentEntry({ ...currentEntry, content: e.target.value })}
            className={`${field} min-h-[200px] resize-y leading-7 sm:min-h-[260px]`}
            placeholder={L(
              'Write what is in your heart today. What did you learn? What are you thankful for?',
              'अपना दिल खोलें... अपनी अनुभूतियां, संघर्ष, कृतज्ञता, या कोई भी भक्ति भावनाएं साझा करें...',
              'మీ హృదయాన్ని పంచుకోండి... మీ అవగాహనలు, కష్టాలు, కృతజ్ఞత లేదా ఏదైనా భక్తి భావాలను పంచుకోండి...'
            )}
          />

          {/* Tags (optional, folded away) */}
          <div className="rounded-2xl ring-1 ring-sandal-200">
            <button
              type="button"
              onClick={() => setShowTags(!showTags)}
              aria-expanded={showTags}
              className="flex h-11 w-full items-center justify-between gap-2 px-4 text-left text-sm font-semibold text-maroon-900"
            >
              <span className="flex items-center gap-2">
                {L('Tags', 'टैग', 'ట్యాగ్‌లు')}
                <span className="font-normal text-maroon-900/55">
                  {currentEntry.tags?.length ? `(${currentEntry.tags.length})` : L('Optional', 'वैकल्पिक', 'ఐచ్ఛికం')}
                </span>
              </span>
              <ChevronDown size={17} className={`text-maroon-900/55 transition-transform ${showTags ? 'rotate-180' : ''}`} />
            </button>
            {showTags && (
              <div className="animate-fadeIn space-y-3 border-t border-sandal-200 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className={`${field} h-11 min-w-0 flex-1 py-0`}
                    placeholder={L('e.g. japa, kirtan', 'एक टैग जोड़ें...', 'ట్యాగ్ జోడించండి...')}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="btn-secondary h-11 shrink-0 disabled:opacity-50"
                    aria-label={L('Add tag', 'टैग जोड़ें', 'ట్యాగ్ జోడించండి')}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {!!currentEntry.tags?.length && (
                  <div className="flex flex-wrap gap-2">
                    {currentEntry.tags.map((tag) => (
                      <span key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-50 py-1 pl-3 pr-1 text-sm font-medium text-brand-700 ring-1 ring-amber-200">
                        <span className="break-all">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-amber-100"
                          aria-label={`${L('Remove', 'हटाएं', 'తొలగించు')} ${tag}`}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          className="flex gap-3 border-t border-sandal-200 px-4 pt-4 sm:justify-end sm:px-6"
        >
          <button type="button" onClick={handleCancel} className="btn-secondary flex-1 sm:flex-none">
            {t.common.cancel}
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave} className="btn-primary flex-1 disabled:opacity-50 sm:flex-none sm:px-8">
            {saving ? L('Saving…', 'सहेज रहे हैं…', 'సేవ్ చేస్తోంది…') : t.common.save}
          </button>
        </div>
      </section>
    </div>
  );

  /* ---------- One past entry ---------- */
  const renderEntry = (entry: JournalEntry) => {
    const mood: Mood = moodIcons[entry.mood] ? entry.mood : 'peaceful';
    const open = openId === entry.id;
    const long = (entry.content?.length || 0) > 180 || (entry.content?.split('\n').length || 0) > 3;

    return (
      <article key={entry.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 transition hover:ring-marigold-400/50 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[15px] font-semibold leading-snug text-maroon-900">{entry.title}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-maroon-900/55">
              <span>{formatDay(entry.timestamp)} · {formatTime(entry.timestamp)}</span>
              <span className={`rounded-full px-2 py-0.5 font-medium ${moodTint[mood]}`}>{moodLabels[language][mood]}</span>
            </p>
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0">
            <button type="button" onClick={() => handleEdit(entry)} className="icon-btn transition hover:text-brand-600" aria-label={L('Edit', 'संपादित करें', 'సవరించు')}>
              <PenLine size={17} />
            </button>
            <button type="button" onClick={() => handleDelete(entry.id)} className="icon-btn transition hover:bg-rose-50 hover:text-rose-600" aria-label={L('Delete', 'हटाएं', 'తొలగించు')}>
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        <p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-maroon-900/75 ${open ? '' : 'line-clamp-3'}`}>
          {entry.content}
        </p>

        {(long || (entry.tags?.length || 0) > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {entry.tags?.map((tag) => (
              <span key={tag} className="max-w-full break-all rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                #{tag}
              </span>
            ))}
            {long && (
              <button
                type="button"
                onClick={() => setOpenId(open ? null : entry.id)}
                className="ml-auto inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-600 hover:bg-amber-50"
              >
                {open ? L('Show less', 'कम दिखाएं', 'తక్కువ చూపించు') : L('Read more', 'और पढ़ें', 'మరింత చదవండి')}
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}
      </article>
    );
  };

  /* ---------- Page ---------- */
  return (
    <div className="mx-auto max-w-3xl animate-rise-in space-y-4 overflow-x-hidden pb-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-xl font-semibold text-maroon-900">
          {L('Journal', 'डायरी', 'డైరీ')}
        </h1>
        <button type="button" onClick={startNew} className="btn-primary h-11 shrink-0">
          <Plus size={17} />
          {L('New entry', 'नई प्रविष्टि', 'క్రొత్త ఎంట్రీ')}
        </button>
      </header>

      {isWriting && renderEditor()}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-sandal-100 ring-1 ring-sandal-200" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-sandal-200">
          <h3 className="text-lg font-semibold text-maroon-900">
            {L('No entries yet', 'अभी तक कोई डायरी प्रविष्टि नहीं', 'ఇంకా డైరీ ఎంట్రీలు లేవు')}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-maroon-900/60">
            {L(
              'Write a few lines each day about your chanting, reading and feelings.',
              'अपनी भक्ति यात्रा और आंतरिक भावनाओं को रिकॉर्ड करना शुरू करें',
              'మీ భక్తి ప్రయాణం మరియు అంతర్గత భావాలను రికార్డ్ చేయడం ప్రారంభించండి'
            )}
          </p>
          <button type="button" onClick={startNew} className="btn-primary mt-6">
            <Plus size={17} />
            {L('Write your first entry', 'पहली प्रविष्टि लिखें', 'మొదటి ఎంట్రీ వ్రాయండి')}
          </button>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-maroon-900">
              {L('Past entries', 'पिछली प्रविष्टियां', 'గత ఎంట్రీలు')}
              <span className="ml-1.5 font-normal text-maroon-900/55">{entries.length}</span>
            </h2>
            <CollapsibleSearch value={search} onChange={setSearch} placeholder={L('Search your entries', 'प्रविष्टियां खोजें', 'ఎంట్రీలను వెతకండి')} />
          </div>

          {groups.length === 0 ? (
            <p className="rounded-2xl bg-sandal-50 px-4 py-8 text-center text-sm text-maroon-900/60 ring-1 ring-sandal-200">
              {L('No entries match your search.', 'कोई प्रविष्टि नहीं मिली।', 'ఏ ఎంట్రీలు సరిపోలలేదు.')}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="space-y-3">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-700/70">{g.label}</h3>
                {g.items.map(renderEntry)}
              </div>
            ))
          )}
        </section>
      )}

      {dialog}
    </div>
  );
};

export default DevotionalJournal;
