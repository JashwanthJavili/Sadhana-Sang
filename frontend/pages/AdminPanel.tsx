import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Database,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Inbox,
  MessageCircle,
  MessageSquare,
  Moon,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { ref, get, set, push, remove, update } from 'firebase/database';
import { PageLoader } from '../components/LoadingScreen';
import Avatar from '../components/Avatar';
import { useConfirm } from '../components/ConfirmDialog';
import FeedbackViewer from '../components/FeedbackViewer';
import AdminRequestsPanel from '../components/AdminRequestsPanel';
import EkadashiAdmin from '../components/ekadashi/EkadashiAdmin';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import {
  ADMIN_EMAIL,
  deleteUserPermanently,
  getAllAdmins,
  getAllUsersAdmin,
  getAppStatistics,
  grantAdminAccess,
  revokeAdminAccess,
} from '../services/admin';
import { migrateAllUserProfiles } from '../scripts/migrateUserProfiles';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface UserInfo {
  uid: string;
  userName: string;
  email: string;
  guruName: string;
  iskconCenter: string;
  gender?: 'male' | 'female' | null;
  joinedDate: number;
  lastActive: number;
  loginCount: number;
  isAdmin?: boolean;
  feedbackRating?: number;
}

interface AdminInfo {
  uid: string;
  email: string;
  isSuperAdmin: boolean;
  grantedAt: number;
}

interface AppStats {
  totalUsers: number;
  activeUsers: number;
  totalQuestions: number;
  totalAnswers: number;
  totalChats: number;
}

interface QuestionItem {
  id: string;
  title: string;
  content: string;
  userName: string;
  category?: string;
  timestamp: number;
  answerCount?: number;
  hidden?: boolean;
}

interface AnswerItem {
  id: string;
  questionId: string;
  questionTitle: string;
  content: string;
  userName: string;
  timestamp: number;
  hidden?: boolean;
}

interface SentAnnouncement {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  recipientCount?: number;
}

interface UsageInfo {
  sizeMB: number;
  percent: number;
  users: number;
  questions: number;
  chats: number;
}

type TabId = 'users' | 'admins' | 'moderation' | 'feedback' | 'requests' | 'ekadashi' | 'announce' | 'system';

const DAY = 86_400_000;
const FREE_TIER_MB = 1024;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const fmtDate = (ts: number) => (ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const fmtAgo = (ts: number) => {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(ts);
};

const known = (v?: string) => (v && v.toLowerCase() !== 'n/a' && v !== 'Not Specified' ? v : '');

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const card = 'rounded-2xl border border-sandal-200 bg-white shadow-soft';
const field =
  'h-11 w-full rounded-xl border border-sandal-200 bg-white px-3.5 text-[15px] text-maroon-900 outline-none transition placeholder:text-maroon-900/35 focus:border-marigold-400 focus:ring-4 focus:ring-marigold-400/20';

const Panel: React.FC<{ title: string; icon?: React.ElementType; action?: React.ReactNode; children: React.ReactNode }> = ({ title, icon: Icon, action, children }) => (
  <section className={`${card} p-4 sm:p-5`}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-maroon-900">
        {Icon && <Icon size={17} className="shrink-0 text-brand-600" />}
        <span className="truncate">{title}</span>
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const StatTile: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone: string }> = ({ label, value, icon: Icon, tone }) => (
  <div className={`${card} flex items-center gap-3 p-3`}>
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon size={18} />
    </span>
    <div className="min-w-0">
      <p className="text-xl font-bold leading-none text-maroon-900">{value}</p>
      <p className="mt-1 truncate text-[11px] font-medium text-maroon-900/50">{label}</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; title: string; hint?: string }> = ({ icon: Icon, title, hint }) => (
  <div className={`${card} px-6 py-12 text-center`}>
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-brand-600 ring-1 ring-amber-200">
      <Icon size={22} />
    </span>
    <p className="mt-3 text-[15px] font-semibold text-maroon-900">{title}</p>
    {hint && <p className="mx-auto mt-1 max-w-xs text-sm text-maroon-900/55">{hint}</p>}
  </div>
);

const Segmented: React.FC<{ value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }> = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-xl bg-sandal-100 p-1 ring-1 ring-sandal-200" role="tablist">
    {options.map((o) => (
      <button
        key={o.id}
        role="tab"
        aria-selected={value === o.id}
        onClick={() => onChange(o.id)}
        className={`h-8 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition ${
          value === o.id ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/55 hover:text-maroon-900'
        }`}
        style={{ minHeight: 0 }}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/** Bottom sheet on phones, centered card on larger screens */
const Sheet: React.FC<{ onClose: () => void; label: string; children: React.ReactNode }> = ({ onClose, label, children }) => (
  <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
    <div className="absolute inset-0 animate-fadeIn bg-maroon-900/40 backdrop-blur-[2px]" onClick={onClose} />
    <div
      className="relative max-h-[90dvh] w-full animate-rise-in overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-lift sm:max-w-md sm:rounded-[28px] sm:p-6"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl bg-sandal-50 px-3.5 py-2.5 text-sm">
    <span className="shrink-0 text-maroon-900/55">{label}</span>
    <span className="min-w-0 break-words text-right font-medium text-maroon-900">{value}</span>
  </div>
);

const Badge: React.FC<{ tone: string; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{children}</span>
);

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'moderation', label: 'Moderation', icon: HelpCircle },
  { id: 'feedback', label: 'Feedback', icon: MessageCircle },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'ekadashi', label: 'Ekadashi', icon: Moon },
  { id: 'announce', label: 'Announce', icon: Megaphone },
  { id: 'system', label: 'System', icon: Database },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toastCtx = useToast();
  // keep a stable handle so data loaders don't re-run whenever a toast appears
  const toastRef = useRef(toastCtx);
  toastRef.current = toastCtx;
  const toast = useMemo(
    () => ({
      showSuccess: (...a: Parameters<typeof toastCtx.showSuccess>) => toastRef.current.showSuccess(...a),
      showError: (...a: Parameters<typeof toastCtx.showError>) => toastRef.current.showError(...a),
    }),
    []
  );
  const { ask, dialog } = useConfirm();

  const isSuperAdmin = user?.email === ADMIN_EMAIL;
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PANEL_PASSWORD || 'Hare Krishna';

  // access gate
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // core data
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [tab, setTab] = useState<TabId>('users');

  // users tab
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState<'all' | 'active' | 'inactive'>('all');
  const [openUser, setOpenUser] = useState<UserInfo | null>(null);
  const [userBusy, setUserBusy] = useState(false);

  // moderation tab (loaded the first time the tab is opened)
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [contentKind, setContentKind] = useState<'questions' | 'answers'>('questions');
  const [contentSearch, setContentSearch] = useState('');
  const [contentLimit, setContentLimit] = useState(20);

  // announce tab
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SentAnnouncement[]>([]);

  // system tab
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [migration, setMigration] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setUnlocked(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
    setPasswordInput('');
  };

  /* ----------------------------- loading ----------------------------- */

  const loadMain = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, statsData, adminsData] = await Promise.all([getAllUsersAdmin(), getAppStatistics(), getAllAdmins()]);
      const adminIds = new Set(adminsData.map((a: AdminInfo) => a.uid));
      setUsers(usersData.map((u: UserInfo) => ({ ...u, isAdmin: adminIds.has(u.uid) || u.email === ADMIN_EMAIL })));
      setStats(statsData);
      setAdmins(adminsData);
    } catch (e) {
      console.error('Error loading admin data:', e);
      toast.showError('Could not load admin data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadContent = useCallback(async () => {
    try {
      const [qSnap, aSnap] = await Promise.all([get(ref(db, 'questions')), get(ref(db, 'answers'))]);
      const qs: QuestionItem[] = [];
      const titles: Record<string, string> = {};
      qSnap.forEach((c) => {
        const v = c.val();
        qs.push({ id: c.key!, title: v.title || '', content: v.content || '', userName: v.userName || 'Anonymous', category: v.category, timestamp: v.timestamp || 0, answerCount: v.answerCount, hidden: !!v.hidden });
        titles[c.key!] = v.title || '';
      });
      const as: AnswerItem[] = [];
      aSnap.forEach((group) => {
        group.forEach((c) => {
          const v = c.val();
          as.push({ id: c.key!, questionId: group.key!, questionTitle: titles[group.key!] || 'Deleted question', content: v.content || '', userName: v.userName || 'Anonymous', timestamp: v.timestamp || 0, hidden: !!v.hidden });
        });
      });
      setQuestions(qs.sort((a, b) => b.timestamp - a.timestamp));
      setAnswers(as.sort((a, b) => b.timestamp - a.timestamp));
      setContentLoaded(true);
    } catch (e) {
      console.error('Error loading content:', e);
      toast.showError('Could not load questions and answers');
    }
  }, [toast]);

  const loadHistory = useCallback(async () => {
    try {
      const snap = await get(ref(db, 'announcements'));
      const list: SentAnnouncement[] = [];
      snap.forEach((c) => {
        const v = c.val();
        list.push({ id: c.key!, title: v.title || '', message: v.message || '', timestamp: v.timestamp || 0, recipientCount: v.recipientCount });
      });
      setHistory(list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8));
    } catch (e) {
      console.error('Error loading announcements:', e);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const [u, q, c] = await Promise.all([get(ref(db, 'users')), get(ref(db, 'questions')), get(ref(db, 'chats'))]);
      const bytes = [u, q, c].reduce((sum, s) => sum + (s.exists() ? JSON.stringify(s.val()).length : 0), 0);
      const sizeMB = bytes / (1024 * 1024);
      setUsage({
        sizeMB: Math.round(sizeMB * 100) / 100,
        percent: Math.round((sizeMB / FREE_TIER_MB) * 10000) / 100,
        users: u.exists() ? Object.keys(u.val()).length : 0,
        questions: q.exists() ? Object.keys(q.val()).length : 0,
        chats: c.exists() ? Object.keys(c.val()).length : 0,
      });
    } catch (e) {
      console.error('Error loading usage:', e);
      toast.showError('Could not check database size');
    } finally {
      setUsageLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.showError('Access denied', 'Admin privileges required');
      navigate('/');
      return;
    }
    if (unlocked) loadMain();
  }, [isSuperAdmin, unlocked, navigate, loadMain, toast]);

  useEffect(() => {
    if (!unlocked) return;
    if (tab === 'moderation' && !contentLoaded) loadContent();
    if (tab === 'announce') loadHistory();
    if (tab === 'system' && !usage) loadUsage();
  }, [tab, unlocked, contentLoaded, usage, loadContent, loadHistory, loadUsage]);

  /* ----------------------------- users ----------------------------- */

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (activity === 'active' && u.lastActive <= Date.now() - 7 * DAY) return false;
      if (activity === 'inactive' && u.lastActive > Date.now() - 7 * DAY) return false;
      return !q || [u.userName, u.email, u.guruName, u.iskconCenter].some((v) => v?.toLowerCase().includes(q));
    });
  }, [users, search, activity]);

  const exportUsers = () => {
    const header = ['Name', 'Email', 'Guru', 'Center', 'Joined', 'Last active', 'Logins', 'Admin'];
    const rows = filteredUsers.map((u) => [u.userName, u.email, u.guruName, u.iskconCenter, fmtDate(u.joinedDate), fmtDate(u.lastActive), u.loginCount, u.isAdmin ? 'Yes' : 'No']);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sadhana-sang-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleAdmin = async (u: UserInfo) => {
    const making = !u.isAdmin;
    const ok = await ask({
      title: making ? `Make ${u.userName} an admin?` : `Remove admin rights from ${u.userName}?`,
      message: making ? 'They will be able to manage users and content.' : 'They will lose access to the admin tools.',
      confirmLabel: making ? 'Make admin' : 'Remove admin',
      danger: !making,
    });
    if (!ok) return;
    setUserBusy(true);
    try {
      if (making) await grantAdminAccess(u.uid, u.email);
      else await revokeAdminAccess(u.uid);
      toast.showSuccess(making ? `${u.userName} is now an admin` : 'Admin rights removed');
      setOpenUser(null);
      await loadMain();
    } catch (e: any) {
      toast.showError('Could not update admin rights', e?.message);
    } finally {
      setUserBusy(false);
    }
  };

  const deleteUser = async (u: UserInfo) => {
    const ok = await ask({
      title: `Delete ${u.userName}?`,
      message: 'This permanently removes their profile, journal, messages, questions and answers. It cannot be undone.',
      confirmLabel: 'Delete permanently',
      danger: true,
      requireText: u.userName,
    });
    if (!ok) return;
    setUserBusy(true);
    try {
      await deleteUserPermanently(u.uid);
      toast.showSuccess(`${u.userName} has been deleted`);
      setOpenUser(null);
      await loadMain();
    } catch (e: any) {
      toast.showError('Could not delete user', e?.message);
    } finally {
      setUserBusy(false);
    }
  };

  /* ----------------------------- moderation ----------------------------- */

  const setHidden = async (path: string, hidden: boolean) => {
    try {
      await update(ref(db, path), hidden ? { hidden: true, hiddenBy: user?.uid ?? null, hiddenAt: Date.now() } : { hidden: null, hiddenBy: null, hiddenAt: null });
      toast.showSuccess(hidden ? 'Hidden from the Forum' : 'Visible in the Forum again');
      await loadContent();
    } catch (e: any) {
      toast.showError('Could not update', e?.message);
    }
  };

  const deleteQuestion = async (q: QuestionItem) => {
    const ok = await ask({ title: 'Delete this question?', message: `"${q.title}" and all of its answers will be removed for good.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Promise.all([remove(ref(db, `questions/${q.id}`)), remove(ref(db, `answers/${q.id}`))]);
      toast.showSuccess('Question deleted');
      await Promise.all([loadContent(), loadMain()]);
    } catch (e: any) {
      toast.showError('Could not delete', e?.message);
    }
  };

  const deleteAnswer = async (a: AnswerItem) => {
    const ok = await ask({ title: 'Delete this answer?', message: 'It will be removed for good.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await remove(ref(db, `answers/${a.questionId}/${a.id}`));
      const q = questions.find((x) => x.id === a.questionId);
      if (q) await update(ref(db, `questions/${a.questionId}`), { answerCount: Math.max((q.answerCount || 1) - 1, 0) });
      toast.showSuccess('Answer deleted');
      await Promise.all([loadContent(), loadMain()]);
    } catch (e: any) {
      toast.showError('Could not delete', e?.message);
    }
  };

  const contentItems = useMemo(() => {
    const q = contentSearch.trim().toLowerCase();
    if (contentKind === 'questions') return questions.filter((x) => !q || x.title.toLowerCase().includes(q) || x.content.toLowerCase().includes(q) || x.userName.toLowerCase().includes(q));
    return answers.filter((x) => !q || x.content.toLowerCase().includes(q) || x.questionTitle.toLowerCase().includes(q) || x.userName.toLowerCase().includes(q));
  }, [contentKind, contentSearch, questions, answers]);

  /* ----------------------------- announce ----------------------------- */

  const sendAnnouncement = async () => {
    const title = annTitle.trim();
    const message = annMessage.trim();
    if (!title || !message) return;
    const ok = await ask({
      title: `Send to all ${users.length} users?`,
      message: `"${title}"\n\nIt appears in each user's notifications for 24 hours.`,
      confirmLabel: 'Send',
    });
    if (!ok) return;
    setSending(true);
    try {
      const timestamp = Date.now();
      const updates: Record<string, unknown> = {};
      users.forEach((u) => {
        const key = push(ref(db, `userNotifications/${u.uid}`)).key!;
        updates[`userNotifications/${u.uid}/${key}`] = { type: 'broadcast', title, message, from: 'Admin Team', timestamp, read: false };
      });
      const historyKey = push(ref(db, 'announcements')).key!;
      updates[`announcements/${historyKey}`] = { title, message, sentBy: user?.email ?? null, timestamp, recipientCount: users.length };
      await update(ref(db), updates);
      toast.showSuccess(`Sent to ${users.length} users`);
      setAnnTitle('');
      setAnnMessage('');
      loadHistory();
    } catch (e: any) {
      toast.showError('Could not send the announcement', e?.message);
    } finally {
      setSending(false);
    }
  };

  /* ----------------------------- system ----------------------------- */

  const runMigration = async () => {
    const ok = await ask({ title: 'Create chat profiles?', message: 'Adds a chat profile for every existing user who does not have one yet. Existing profiles are left alone.', confirmLabel: 'Run' });
    if (!ok) return;
    setMigration('running');
    try {
      const r = await migrateAllUserProfiles();
      setMigration('success');
      toast.showSuccess('Chat profiles updated', `${r.migratedCount} created · ${r.skippedCount} skipped · ${r.errorCount} errors`);
      loadMain();
    } catch (e: any) {
      setMigration('error');
      toast.showError('Migration failed', e?.message);
    } finally {
      setTimeout(() => setMigration('idle'), 3000);
    }
  };

  /* ----------------------------- render ----------------------------- */

  if (!isSuperAdmin) return null;

  if (!unlocked) {
    return (
      <div className="flex min-h-[calc(100dvh-11rem)] items-center justify-center px-1 lg:min-h-[calc(100dvh-9rem)]">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-sandal-200">
          <div className="relative bg-gradient-to-br from-marigold-400 to-brand-500 px-6 pb-6 pt-7 text-center">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white">
              <Shield size={28} />
            </span>
            <h1 className="relative mt-3 text-xl font-bold text-white">Admin access</h1>
            <p className="relative mt-0.5 text-sm text-white/75">Enter the password to continue</p>
          </div>
          <form onSubmit={handlePassword} className="space-y-3 p-5">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password" aria-label="Admin password" className={`${field} h-12 rounded-2xl`} autoFocus />
            {passwordError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle size={15} className="shrink-0" /> {passwordError}
              </p>
            )}
            <button type="submit" disabled={!passwordInput} className="h-12 w-full rounded-2xl bg-gradient-to-r from-marigold-400 to-brand-500 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50" style={{ minHeight: 0 }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !users.length) return <PageLoader label="Loading admin…" />;

  const counts: Partial<Record<TabId, number>> = { users: users.length, admins: admins.length };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 animate-fadeIn">
      {dialog}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-marigold-400 to-brand-500 text-white shadow-soft">
            <Shield size={21} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-maroon-900">Admin</h1>
            <p className="break-all text-xs text-maroon-900/50">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={loadMain}
          disabled={loading}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-amber-200 transition hover:bg-amber-50 active:scale-95 disabled:opacity-60"
          style={{ minHeight: 0 }}
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Overview numbers */}
      {stats && (
        <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'Users', value: stats.totalUsers, icon: Users, tone: 'bg-marigold-100 text-brand-700' },
            { label: 'Active today', value: stats.activeUsers, icon: Activity, tone: 'bg-emerald-100 text-emerald-700' },
            { label: 'Chats', value: stats.totalChats, icon: MessageSquare, tone: 'bg-sky-100 text-sky-700' },
            { label: 'Questions', value: stats.totalQuestions, icon: HelpCircle, tone: 'bg-amber-100 text-amber-700' },
            { label: 'Answers', value: stats.totalAnswers, icon: MessageCircle, tone: 'bg-rose-100 text-rose-700' },
          ].map((s) => (
            <div key={s.label} className="w-[138px] shrink-0 snap-start sm:w-auto">
              <StatTile label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-16 z-20 -mx-4 overflow-x-auto bg-sandal-100/90 px-4 py-2 backdrop-blur sm:top-[72px] sm:mx-0 sm:rounded-2xl sm:px-2" style={{ scrollbarWidth: 'none' }}>
        <div className="flex w-max gap-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition ${
                tab === id ? 'bg-brand-600 text-white shadow-soft' : 'bg-white text-maroon-900/65 ring-1 ring-sandal-200 hover:bg-sandal-50'
              }`}
              style={{ minHeight: 0 }}
            >
              <Icon size={15} />
              {label}
              {counts[id] !== undefined && <span className={`rounded-full px-1.5 text-[11px] ${tab === id ? 'bg-white/25' : 'bg-sandal-100'}`}>{counts[id]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------ Users ------------------------------ */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className={`${card} space-y-3 p-3 sm:p-4`}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-maroon-900/40" size={17} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, guru or temple" className={`${field} pl-10`} />
              </div>
              <button onClick={exportUsers} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700" style={{ minHeight: 0 }}>
                <Download size={16} /> Export CSV
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented
                value={activity}
                onChange={(v) => setActivity(v as typeof activity)}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active 7d' },
                  { id: 'inactive', label: 'Inactive' },
                ]}
              />
              <p className="text-xs text-maroon-900/50">
                {filteredUsers.length} of {users.length}
              </p>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState icon={Users} title="No users match" hint="Try a different search or filter." />
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((u) => {
                const subtitle = [known(u.guruName), known(u.iskconCenter)].filter(Boolean).join(' · ');
                const online = u.lastActive > Date.now() - DAY;
                return (
                  <li key={u.uid}>
                    <button onClick={() => setOpenUser(u)} className={`${card} flex w-full items-center gap-3 p-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50/40 active:scale-[0.99]`} style={{ minHeight: 0 }}>
                      <Avatar gender={u.gender} name={u.userName} className="h-11 w-11 shrink-0" textClassName="text-sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="break-words text-[15px] font-semibold leading-tight text-maroon-900">{u.userName}</span>
                          {u.isAdmin && <Badge tone="bg-red-100 text-red-700">Admin</Badge>}
                        </span>
                        <span className="block break-all text-xs text-maroon-900/55">{u.email}</span>
                        {subtitle && <span className="mt-0.5 block break-words text-xs text-maroon-900/60">{subtitle}</span>}
                        <span className={`mt-1 block text-[11px] font-medium ${online ? 'text-emerald-600' : 'text-maroon-900/40'}`}>
                          {online && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />}
                          Active {fmtAgo(u.lastActive).toLowerCase()}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------ Admins ------------------------------ */}
      {tab === 'admins' && (
        <div className="space-y-2.5">
          {admins.map((a) => {
            const name = users.find((u) => u.uid === a.uid)?.userName || a.email.split('@')[0];
            return (
              <div key={a.uid} className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-maroon-900">
                    <span className="break-words">{name}</span>
                    <Badge tone={a.isSuperAdmin ? 'bg-brand-600 text-white' : 'bg-red-100 text-red-700'}>{a.isSuperAdmin ? 'Super admin' : 'Admin'}</Badge>
                  </p>
                  <p className="break-all text-xs text-maroon-900/55">{a.email}</p>
                  {!a.isSuperAdmin && <p className="mt-0.5 text-xs text-maroon-900/40">Since {fmtDate(a.grantedAt)}</p>}
                </div>
                {a.isSuperAdmin ? (
                  <span className="text-xs font-medium text-maroon-900/40">Cannot be removed</span>
                ) : (
                  <button
                    onClick={() => {
                      const u = users.find((x) => x.uid === a.uid);
                      if (u) toggleAdmin(u);
                    }}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                    style={{ minHeight: 0 }}
                  >
                    <UserMinus size={16} /> Remove admin
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------- Moderation ---------------------------- */}
      {tab === 'moderation' && (
        <div className="space-y-3">
          <div className={`${card} space-y-3 p-3 sm:p-4`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Segmented
                value={contentKind}
                onChange={(v) => {
                  setContentKind(v as typeof contentKind);
                  setContentLimit(20);
                }}
                options={[
                  { id: 'questions', label: `Questions ${questions.length}` },
                  { id: 'answers', label: `Answers ${answers.length}` },
                ]}
              />
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-maroon-900/40" size={17} />
                <input value={contentSearch} onChange={(e) => setContentSearch(e.target.value)} placeholder="Search" className={`${field} pl-10`} />
              </div>
            </div>
            <p className="text-xs text-maroon-900/50">Hidden items disappear from the Forum for everyone. Deleting is permanent.</p>
          </div>

          {!contentLoaded ? (
            <PageLoader label="Loading…" />
          ) : contentItems.length === 0 ? (
            <EmptyState icon={HelpCircle} title={contentKind === 'questions' ? 'No questions' : 'No answers'} hint={contentSearch ? 'Nothing matches your search.' : undefined} />
          ) : (
            <>
              <ul className="space-y-2.5">
                {contentItems.slice(0, contentLimit).map((item) => {
                  const isQ = contentKind === 'questions';
                  const q = item as QuestionItem;
                  const a = item as AnswerItem;
                  const path = isQ ? `questions/${item.id}` : `answers/${a.questionId}/${item.id}`;
                  return (
                    <li key={`${isQ ? 'q' : 'a'}-${item.id}`} className={`${card} p-4 ${item.hidden ? 'border-red-200 bg-red-50/50' : ''}`}>
                      {isQ ? (
                        <h4 className="break-words font-semibold text-maroon-900">{q.title}</h4>
                      ) : (
                        <p className="break-words text-xs text-maroon-900/50">On: {a.questionTitle}</p>
                      )}
                      <p className={`mt-1 line-clamp-3 break-words text-sm ${isQ ? 'text-maroon-900/65' : 'text-maroon-900'}`}>{item.content}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-maroon-900/50">
                          <span>{item.userName}</span>
                          <span>{fmtDate(item.timestamp)}</span>
                          {isQ && <span>{q.answerCount || 0} answers</span>}
                          {item.hidden && <Badge tone="bg-red-100 text-red-700">Hidden</Badge>}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setHidden(path, !item.hidden)}
                            className="flex h-9 items-center gap-1.5 rounded-xl bg-sandal-100 px-3 text-sm font-semibold text-maroon-900/70 transition hover:bg-sandal-200"
                            style={{ minHeight: 0 }}
                          >
                            {item.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                            {item.hidden ? 'Unhide' : 'Hide'}
                          </button>
                          <button
                            onClick={() => (isQ ? deleteQuestion(q) : deleteAnswer(a))}
                            className="flex h-9 items-center gap-1.5 rounded-xl bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            style={{ minHeight: 0 }}
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {contentItems.length > contentLimit && (
                <button onClick={() => setContentLimit((n) => n + 20)} className="mx-auto flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-amber-200" style={{ minHeight: 0 }}>
                  Show more ({contentItems.length - contentLimit} left)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'feedback' && <FeedbackViewer />}
      {tab === 'requests' && <AdminRequestsPanel />}
      {tab === 'ekadashi' && <EkadashiAdmin />}

      {/* ------------------------------ Announce ------------------------------ */}
      {tab === 'announce' && (
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Panel title="New announcement" icon={Megaphone}>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/55">Title</span>
                  <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} maxLength={80} placeholder="e.g. New Ekadashi calendar" className={field} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/55">Message</span>
                  <textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    maxLength={400}
                    rows={5}
                    placeholder="Write a short message for every devotee"
                    className="w-full resize-none rounded-xl border border-sandal-200 bg-white px-3.5 py-3 text-[15px] text-maroon-900 outline-none transition placeholder:text-maroon-900/35 focus:border-marigold-400 focus:ring-4 focus:ring-marigold-400/20"
                  />
                  <span className="mt-1 block text-right text-[11px] text-maroon-900/40">{annMessage.length}/400</span>
                </label>

                {(annTitle || annMessage) && (
                  <div className="rounded-xl bg-sandal-50 p-3 ring-1 ring-sandal-200">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-maroon-900/40">How it will look</p>
                    <div className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-soft">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Megaphone size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-maroon-900">{annTitle || 'Title'}</p>
                        <p className="mt-0.5 whitespace-pre-line break-words text-sm text-maroon-900/65">{annMessage || 'Message'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={sendAnnouncement}
                  disabled={!annTitle.trim() || !annMessage.trim() || sending}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-marigold-400 to-brand-500 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50"
                  style={{ minHeight: 0 }}
                >
                  <Send size={17} /> {sending ? 'Sending…' : `Send to all ${users.length} users`}
                </button>
                <p className="text-center text-xs text-maroon-900/45">Shown in each user's notifications for 24 hours.</p>
              </div>
            </Panel>
          </div>

          <div className="lg:col-span-2">
            <Panel title="Recently sent" icon={Inbox}>
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-maroon-900/50">Nothing sent yet.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-xl bg-sandal-50 px-3.5 py-3">
                      <p className="break-words text-sm font-semibold text-maroon-900">{h.title}</p>
                      <p className="mt-0.5 line-clamp-2 break-words text-xs text-maroon-900/60">{h.message}</p>
                      <p className="mt-1.5 text-[11px] text-maroon-900/40">
                        {fmtAgo(h.timestamp)}
                        {h.recipientCount ? ` · ${h.recipientCount} users` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ------------------------------ System ------------------------------ */}
      {tab === 'system' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel
            title="Database size"
            icon={Database}
            action={
              <button onClick={loadUsage} disabled={usageLoading} className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-brand-700 ring-1 ring-amber-200 transition hover:bg-amber-50 disabled:opacity-60" style={{ minHeight: 0 }}>
                <RefreshCw size={14} className={usageLoading ? 'animate-spin' : ''} /> Check
              </button>
            }
          >
            {usage ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-bold text-maroon-900">{usage.sizeMB} MB</span>
                    <span className="text-xs text-maroon-900/50">of {FREE_TIER_MB} MB free tier</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sandal-200">
                    <div className={`h-full rounded-full transition-all ${usage.percent > 80 ? 'bg-red-500' : usage.percent > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(Math.min(usage.percent, 100), 1)}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-maroon-900/50">{usage.percent}% used (users, questions and chats)</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Users', usage.users],
                    ['Questions', usage.questions],
                    ['Chats', usage.chats],
                  ].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl bg-sandal-50 py-3">
                      <p className="text-lg font-bold text-maroon-900">{v}</p>
                      <p className="text-[11px] text-maroon-900/50">{k}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-maroon-900/50">{usageLoading ? 'Measuring…' : 'Tap Check to measure.'}</p>
            )}
          </Panel>

          <Panel title="Maintenance" icon={RefreshCw}>
            <p className="text-sm text-maroon-900/60">Create chat profiles for older accounts that signed up before chat existed. Safe to run more than once.</p>
            <button
              onClick={runMigration}
              disabled={migration === 'running'}
              className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition ${
                migration === 'success' ? 'bg-emerald-500' : migration === 'error' ? 'bg-red-500' : 'bg-brand-600 hover:bg-brand-700'
              } disabled:opacity-70`}
              style={{ minHeight: 0 }}
            >
              <UserPlus size={16} className={migration === 'running' ? 'animate-pulse' : ''} />
              {migration === 'running' ? 'Working…' : migration === 'success' ? 'Done' : migration === 'error' ? 'Failed' : 'Create missing chat profiles'}
            </button>
          </Panel>
        </div>
      )}

      {/* ------------------------------ User sheet ------------------------------ */}
      {openUser && (
        <Sheet onClose={() => setOpenUser(null)} label="User details">
          <div className="flex items-start gap-3">
            <Avatar gender={openUser.gender} name={openUser.userName} className="h-14 w-14 shrink-0" textClassName="text-lg" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-lg font-semibold leading-tight text-maroon-900">
                <span className="break-words">{openUser.userName}</span>
                {openUser.isAdmin && <Badge tone="bg-red-100 text-red-700">Admin</Badge>}
              </p>
              <p className="break-all text-sm text-maroon-900/55">{openUser.email}</p>
            </div>
            <button onClick={() => setOpenUser(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-maroon-900/50 transition hover:bg-sandal-100" aria-label="Close" style={{ minHeight: 0 }}>
              <X size={19} />
            </button>
          </div>

          <div className="mt-4 space-y-1.5">
            <Row label="Guru" value={known(openUser.guruName) || '—'} />
            <Row label="Temple" value={known(openUser.iskconCenter) || '—'} />
            <Row label="Joined" value={fmtDate(openUser.joinedDate)} />
            <Row label="Last active" value={fmtAgo(openUser.lastActive)} />
            <Row label="Logins" value={openUser.loginCount} />
            {!!openUser.feedbackRating && <Row label="Feedback" value={`${openUser.feedbackRating} / 5`} />}
          </div>

          {openUser.email === ADMIN_EMAIL ? (
            <p className="mt-4 rounded-xl bg-sandal-50 px-3.5 py-3 text-center text-sm text-maroon-900/55">This is the super admin account. It is protected.</p>
          ) : (
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => toggleAdmin(openUser)}
                disabled={userBusy}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-brand-700 ring-1 ring-amber-200 transition hover:bg-amber-50 disabled:opacity-60"
                style={{ minHeight: 0 }}
              >
                {openUser.isAdmin ? <UserMinus size={16} /> : <UserPlus size={16} />}
                {openUser.isAdmin ? 'Remove admin rights' : 'Make admin'}
              </button>
              <button
                onClick={() => deleteUser(openUser)}
                disabled={userBusy}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-60"
                style={{ minHeight: 0 }}
              >
                <Trash2 size={16} /> Delete user
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
};

export default AdminPanel;
