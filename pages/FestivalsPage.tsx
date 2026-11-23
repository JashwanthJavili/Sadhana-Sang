import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { ref, get, push } from 'firebase/database';
import { Plus, X, Search, Moon, Sparkles, ChevronRight, ChevronDown, CalendarHeart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAdmin } from '../services/admin';
import FestivalRequestForm from '../components/FestivalRequestForm';
import { getUserFestivalRequests, FestivalRequest } from '../services/requests';
import { PageLoader } from '../components/LoadingScreen';
import { localDateKey, daysUntil, parseDateKey } from '../utils/date';

const EkadashiSection = lazy(() => import('../components/ekadashi/EkadashiSection'));

interface Festival {
  id: string;
  name: string;
  date: string;
  shortDescription: string;
  fullDescription?: string;
  significance?: string;
  offerings?: string[];
  observances?: string[];
  addedBy: string;
  addedByName: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
}

const whenText = (date: string) => {
  const d = daysUntil(date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 1 && d < 31) return `In ${d} days`;
  return '';
};

const fieldCls =
  'block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-2.5 text-sm text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

const EMPTY_FORM = { name: '', date: '', shortDescription: '', fullDescription: '', significance: '', offerings: '', observances: '' };

const FestivalsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Ekadashi is the default view; festivals open with ?tab=festivals
  const activeTab: 'festivals' | 'ekadashi' = searchParams.get('tab') === 'festivals' ? 'festivals' : 'ekadashi';
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userRequests, setUserRequests] = useState<FestivalRequest[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadFestivals = async () => {
    try {
      setLoading(true);
      const snapshot = await get(ref(db, 'festivals'));
      const list: Festival[] = [];
      if (snapshot.exists()) snapshot.forEach((child) => void list.push({ id: child.key!, ...child.val() }));
      setFestivals(list.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('Error loading festivals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFestivals();
    isAdmin().then(setUserIsAdmin);
  }, []);

  useEffect(() => {
    if (user && user.uid !== 'guest') return getUserFestivalRequests(user.uid, setUserRequests);
  }, [user]);

  const handleAdd = async () => {
    if (!user || user.uid === 'guest') return;
    if (!form.name || !form.date || !form.shortDescription) {
      alert('Please fill in the name, date and a short description.');
      return;
    }
    setSaving(true);
    try {
      await push(ref(db, 'festivals'), {
        name: form.name,
        date: form.date,
        shortDescription: form.shortDescription,
        fullDescription: form.fullDescription,
        significance: form.significance,
        offerings: form.offerings ? form.offerings.split(',').map((s) => s.trim()) : [],
        observances: form.observances ? form.observances.split(',').map((s) => s.trim()) : [],
        addedBy: user.uid,
        addedByName: user.displayName || 'Devotee',
        timestamp: Date.now(),
        likes: 0,
        likedBy: [],
      });
      setForm(EMPTY_FORM);
      setShowAddModal(false);
      loadFestivals();
    } catch (error) {
      console.error('Error adding festival:', error);
      alert('Could not add the festival. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const today = localDateKey();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? festivals.filter((f) => f.name.toLowerCase().includes(q) || f.shortDescription?.toLowerCase().includes(q)) : festivals;
  }, [festivals, search]);
  const upcoming = filtered.filter((f) => f.date >= today);
  const past = filtered.filter((f) => f.date < today).reverse();
  const next = upcoming[0];

  // group upcoming festivals by month
  const byMonth = useMemo(() => {
    const groups: { label: string; items: Festival[] }[] = [];
    upcoming.slice(next ? 1 : 0).forEach((f) => {
      const label = parseDateKey(f.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const g = groups[groups.length - 1];
      if (g && g.label === label) g.items.push(f);
      else groups.push({ label, items: [f] });
    });
    return groups;
  }, [upcoming, next]);

  const tabs = (
    <div className="inline-grid grid-cols-2 rounded-2xl bg-sandal-200/60 p-1 ring-1 ring-sandal-300/50" role="tablist" aria-label="Calendar">
      {(
        [
          { id: 'ekadashi', label: 'Ekadashi', Icon: Moon },
          { id: 'festivals', label: 'Festivals', Icon: Sparkles },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => setSearchParams(id === 'festivals' ? { tab: 'festivals' } : {}, { replace: true })}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition ${
            activeTab === id ? 'bg-white text-maroon-900 shadow-sm' : 'text-maroon-900/50 hover:text-maroon-900'
          }`}
          style={{ minHeight: 0 }}
        >
          <Icon size={15} className={activeTab === id ? 'text-brand-500' : ''} />
          {label}
        </button>
      ))}
    </div>
  );

  const Row = ({ f }: { f: Festival }) => {
    const d = parseDateKey(f.date);
    const when = whenText(f.date);
    return (
      <button
        onClick={() => navigate(`/festival/${f.id}`)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-sandal-200 transition hover:-translate-y-px hover:shadow-soft hover:ring-marigold-400/60"
      >
        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-100 text-brand-700">
          <span className="text-[10px] font-semibold uppercase leading-none">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
          <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-maroon-900">{f.name}</span>
          <span className="block truncate text-xs text-maroon-900/55">{f.shortDescription}</span>
        </span>
        {when && <span className="hidden shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 sm:inline">{when}</span>}
        <ChevronRight size={16} className="shrink-0 text-maroon-900/30" />
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex justify-center sm:justify-start">{tabs}</div>

      {activeTab === 'ekadashi' ? (
        <Suspense fallback={<PageLoader label="Opening Ekadashi dates…" />}>
          <EkadashiSection />
        </Suspense>
      ) : loading ? (
        <PageLoader label="Opening the calendar…" />
      ) : (
        <>
          {/* Next festival */}
          {next && !search && (
            <button
              onClick={() => navigate(`/festival/${next.id}`)}
              className="block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 text-left shadow-card ring-1 ring-amber-200/70 transition hover:-translate-y-px sm:p-7"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                <CalendarHeart size={13} /> Next festival
              </span>
              <h2 className="mt-3 text-2xl font-semibold text-maroon-900 sm:text-3xl">{next.name}</h2>
              <p className="mt-1 text-sm font-medium text-brand-600">
                {parseDateKey(next.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                {whenText(next.date) && ` · ${whenText(next.date)}`}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-maroon-900/70">{next.shortDescription}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                Read more <ChevronRight size={15} />
              </span>
            </button>
          )}

          {/* Search + actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-sandal-200 focus-within:ring-marigold-400">
              <Search size={17} className="text-maroon-900/35" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search festivals"
                className="w-full bg-transparent py-3 text-sm text-maroon-900 outline-none placeholder:text-maroon-900/35"
              />
            </label>
            <div className="flex gap-2">
              {user && user.uid !== 'guest' && (
                <button onClick={() => setShowRequestModal(true)} className="btn-secondary flex-1 sm:flex-none">
                  <Plus size={15} /> Suggest a festival
                </button>
              )}
              {userIsAdmin && (
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex-1 sm:flex-none">
                  <Plus size={15} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Upcoming by month */}
          {byMonth.map((g) => (
            <section key={g.label}>
              <h3 className="mb-2 px-1 text-sm font-semibold text-maroon-900/60">{g.label}</h3>
              <div className="space-y-2">
                {g.items.map((f) => (
                  <Row key={f.id} f={f} />
                ))}
              </div>
            </section>
          ))}

          {search && upcoming.length > 0 && byMonth.length === 0 && next && <Row f={next} />}

          {filtered.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-sandal-200">
              <CalendarHeart size={36} className="mx-auto text-maroon-900/25" />
              <p className="mt-3 text-sm text-maroon-900/55">{search ? 'No festival found with that name.' : 'No festivals added yet.'}</p>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <button onClick={() => setShowPast((s) => !s)} className="flex items-center gap-1.5 px-1 text-sm font-semibold text-maroon-900/60 hover:text-maroon-900" style={{ minHeight: 0 }}>
                <ChevronDown size={16} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
                {showPast ? 'Hide past festivals' : `Show past festivals (${past.length})`}
              </button>
              {showPast && (
                <div className="mt-2 space-y-2 opacity-80">
                  {past.map((f) => (
                    <Row key={f.id} f={f} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* My suggestions */}
          {userRequests.length > 0 && (
            <section className="rounded-3xl bg-white p-4 ring-1 ring-sandal-200 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-maroon-900">Your suggestions</h3>
              <ul className="space-y-2">
                {userRequests.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-sandal-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-maroon-900">{r.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {r.status === 'pending' ? 'Waiting' : r.status === 'approved' ? 'Added' : 'Not added'}
                      </span>
                    </div>
                    <p className="text-xs text-maroon-900/55">{parseDateKey(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    {r.adminComment && <p className="mt-1.5 text-xs text-maroon-900/70">Note: {r.adminComment}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Admin: add festival */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Add festival">
          <div className="absolute inset-0 bg-maroon-900/25 backdrop-blur-[2px]" onClick={() => setShowAddModal(false)} />
          <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 sm:max-w-lg sm:rounded-[28px] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-maroon-900">Add festival</h3>
              <button onClick={() => setShowAddModal(false)} className="icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {(
                [
                  { k: 'name', label: 'Name *', ph: 'e.g. Janmashtami' },
                  { k: 'date', label: 'Date *', type: 'date' },
                  { k: 'shortDescription', label: 'Short description *', ph: 'One or two lines' },
                  { k: 'fullDescription', label: 'More about it', area: true },
                  { k: 'significance', label: 'Why we celebrate', area: true },
                  { k: 'offerings', label: 'What to offer', ph: 'Separate with commas' },
                  { k: 'observances', label: 'What to do', ph: 'Separate with commas' },
                ] as { k: keyof typeof EMPTY_FORM; label: string; ph?: string; type?: string; area?: boolean }[]
              ).map((f) => (
                <label key={f.k} className="block">
                  <span className="mb-1 block text-xs font-semibold text-maroon-900/70">{f.label}</span>
                  {f.area ? (
                    <textarea rows={3} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className={`${fieldCls} resize-none`} />
                  ) : (
                    <input type={f.type || 'text'} value={form[f.k]} placeholder={f.ph} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className={fieldCls} />
                  )}
                </label>
              ))}
              <button onClick={handleAdd} disabled={saving} className="btn-primary w-full">
                {saving ? 'Adding…' : 'Add festival'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && <FestivalRequestForm onClose={() => setShowRequestModal(false)} />}
    </div>
  );
};

export default FestivalsPage;
