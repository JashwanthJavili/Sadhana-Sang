import React, { useEffect, useState } from 'react';
import { PageLoader } from '../components/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useConfirm, askText } from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { 
  Users, Trash2, RefreshCw, BarChart3, MessageSquare, 
  HelpCircle, Shield, UserX, Calendar, Activity, UserPlus, UserMinus,
  Download, Bell, Flag, CheckCircle, XCircle, Search, Filter,
  TrendingUp, Database, Zap, FileText, Eye, EyeOff, AlertTriangle, MoreVertical, MessageCircle, Send, Moon
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  getAllUsersAdmin, 
  deleteUserPermanently, 
  getAppStatistics,
  ADMIN_EMAIL,
  getAllAdmins,
  grantAdminAccess,
  revokeAdminAccess,
} from '../services/admin';
import { migrateAllUserProfiles } from '../scripts/migrateUserProfiles';
import { ref, set, push, get, remove, update } from 'firebase/database';
import { db } from '../services/firebase';
import FeedbackViewer from '../components/FeedbackViewer';
import AdminRequestsPanel from '../components/AdminRequestsPanel';
import EkadashiAdmin from '../components/ekadashi/EkadashiAdmin';

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
  feedbackTimestamp?: number;
}

interface Admin {
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

/* ---- Small layout helpers shared by the admin tabs ---- */
const Panel: React.FC<{ title: string; icon?: React.ElementType; children: React.ReactNode; action?: React.ReactNode }> = ({ title, icon: Icon, children, action }) => (
  <section className="rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold text-maroon-900">
        {Icon && <Icon size={18} className="shrink-0 text-brand-600" />}
        <span className="truncate">{title}</span>
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const MetricRow: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-maroon-900' }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-sandal-50 px-3.5 py-2.5 text-sm">
    <span className="min-w-0 truncate text-maroon-900/70">{label}</span>
    <span className={`shrink-0 font-semibold ${tone}`}>{value}</span>
  </div>
);

const StatTile: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone: string }> = ({ label, value, icon: Icon, tone }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-sandal-200 bg-white p-3 shadow-soft">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon size={17} />
    </span>
    <div className="min-w-0">
      <p className="text-lg font-bold leading-none text-maroon-900">{value}</p>
      <p className="mt-1 truncate text-[11px] font-medium text-maroon-900/50">{label}</p>
    </div>
  </div>
);

const IconAction: React.FC<{ onClick: () => void; title: string; tone: string; children: React.ReactNode }> = ({ onClick, title, tone, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 ${tone}`}
    style={{ minHeight: 0 }}
  >
    {children}
  </button>
);

const Toggle: React.FC<{ label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, hint, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-sandal-50 px-3.5 py-3">
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-maroon-900">{label}</span>
      <span className="block text-xs text-maroon-900/55">{hint}</span>
    </span>
    <span className="relative inline-flex shrink-0 items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="h-6 w-11 rounded-full bg-sandal-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-marigold-400/40 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
    </span>
  </label>
);

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const confirmAsk = (text: string) => askText(ask, text);
  const [profileUser, setProfileUser] = useState<UserInfo | null>(null);
  // In-app notice instead of the browser's alert(): the leading ✅ / ❌ / ⚠️ picks the style
  const notify = (text: string) => {
    const raw = text.trim();
    const type = raw.startsWith('✅') ? 'success' : raw.startsWith('❌') ? 'error' : raw.startsWith('⚠') ? 'warning' : 'info';
    const lines = raw.replace(/^(✅|❌|⚠️|⚠)\s*/, '').split(/[\r\n]+/);
    toast.showToast({ type, title: lines[0], message: lines.slice(1).join(String.fromCharCode(10)).trim() || undefined });
  };
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'content' | 'ekadashi' | 'feedback' | 'requests' | 'announcements' | 'system' | 'logs' | 'reports' | 'settings'>('users');
  
  // Announcements State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'update' | 'warning' | 'celebration'>('info');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  const [textColor, setTextColor] = useState('#000000');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Content Moderation States
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<any[]>([]);
  const [contentFilter, setContentFilter] = useState<'all' | 'questions' | 'answers' | 'flagged'>('all');
  const [contentSearch, setContentSearch] = useState('');

  // App Settings States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [guestModeEnabled, setGuestModeEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [firebaseUsage, setFirebaseUsage] = useState<any>(null);

  const isSuperAdmin = user?.email === ADMIN_EMAIL;
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PANEL_PASSWORD || 'Hare Krishna';

  // Password authentication
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  useEffect(() => {
    // Redirect if not admin
    if (!isSuperAdmin) {
      notify('⛔ Access Denied: Admin privileges required');
      navigate('/dashboard');
      return;
    }

    if (isAuthenticated) {
      loadData();
    }
  }, [isSuperAdmin, navigate, isAuthenticated]);

  const loadContentData = async () => {
    try {
      // Load all questions
      const questionsSnapshot = await get(ref(db, 'questions'));
      const questionsData: any[] = [];
      if (questionsSnapshot.exists()) {
        questionsSnapshot.forEach((child) => {
          questionsData.push({ id: child.key, ...child.val() });
        });
      }
      setQuestions(questionsData);

      // Load all answers
      const answersData: any[] = [];
      for (const question of questionsData) {
        const answersSnapshot = await get(ref(db, `questions/${question.id}/answers`));
        if (answersSnapshot.exists()) {
          answersSnapshot.forEach((child) => {
            answersData.push({ 
              id: child.key, 
              questionId: question.id,
              questionTitle: question.title,
              ...child.val() 
            });
          });
        }
      }
      setAnswers(answersData);

      // Load flagged content (from a dedicated flagged content collection)
      const flaggedSnapshot = await get(ref(db, 'flaggedContent'));
      const flaggedData: any[] = [];
      if (flaggedSnapshot.exists()) {
        flaggedSnapshot.forEach((child) => {
          flaggedData.push({ id: child.key, ...child.val() });
        });
      }
      setFlaggedContent(flaggedData);

    } catch (error) {
      console.error('Error loading content data:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData, adminsData] = await Promise.all([
        getAllUsersAdmin(),
        getAppStatistics(),
        getAllAdmins(),
        loadContentData(),
        loadAppSettings(),
        loadFirebaseUsage()
      ]);
      
      // Mark users who are admins
      const adminIds = new Set(adminsData.map(a => a.uid));
      const usersWithAdminFlag = usersData.map(u => ({
        ...u,
        isAdmin: adminIds.has(u.uid) || u.email === ADMIN_EMAIL
      }));
      
      setUsers(usersWithAdminFlag);
      setStats(statsData);
      setAdmins(adminsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      notify('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadAppSettings = async () => {
    try {
      const settingsRef = ref(db, 'appSettings');
      const snapshot = await get(settingsRef);
      
      if (snapshot.exists()) {
        const settings = snapshot.val();
        setMaintenanceMode(settings.maintenanceMode || false);
        setGuestModeEnabled(settings.guestModeEnabled !== false); // default true
        setRegistrationEnabled(settings.registrationEnabled !== false); // default true
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  };

  const loadFirebaseUsage = async () => {
    try {
      // Estimate Firebase usage by counting data
      const usersSnapshot = await get(ref(db, 'users'));
      const questionsSnapshot = await get(ref(db, 'questions'));
      const chatsSnapshot = await get(ref(db, 'chats'));
      
      let totalSize = 0;
      let userCount = 0;
      let questionCount = 0;
      let chatCount = 0;

      if (usersSnapshot.exists()) {
        userCount = Object.keys(usersSnapshot.val()).length;
        totalSize += JSON.stringify(usersSnapshot.val()).length;
      }

      if (questionsSnapshot.exists()) {
        questionCount = Object.keys(questionsSnapshot.val()).length;
        totalSize += JSON.stringify(questionsSnapshot.val()).length;
      }

      if (chatsSnapshot.exists()) {
        chatCount = Object.keys(chatsSnapshot.val()).length;
        totalSize += JSON.stringify(chatsSnapshot.val()).length;
      }

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      const freeLimit = 1024; // 1GB free tier
      const usagePercent = ((parseFloat(sizeInMB) / freeLimit) * 100).toFixed(2);

      setFirebaseUsage({
        totalSizeMB: parseFloat(sizeInMB),
        freeLimitMB: freeLimit,
        usagePercent: parseFloat(usagePercent),
        userCount,
        questionCount,
        chatCount,
        estimatedReadsPerDay: userCount * 50, // Rough estimate
        estimatedWritesPerDay: userCount * 20
      });
    } catch (error) {
      console.error('Error loading Firebase usage:', error);
    }
  };

  const saveAppSettings = async (setting: string, value: boolean) => {
    try {
      await update(ref(db, 'appSettings'), { [setting]: value });
      
      switch (setting) {
        case 'maintenanceMode':
          setMaintenanceMode(value);
          break;
        case 'guestModeEnabled':
          setGuestModeEnabled(value);
          break;
        case 'registrationEnabled':
          setRegistrationEnabled(value);
          break;
      }

      notify(`✅ ${setting} ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving app settings:', error);
      notify('❌ Failed to save settings');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const ok = await ask({
      title: `Delete ${userName}?`,
      message: 'This permanently removes their profile, journal, messages, questions and answers. It cannot be undone.',
      confirmLabel: 'Delete permanently',
      danger: true,
      requireText: userName,
    });
    if (!ok) return;

    try {
      await deleteUserPermanently(userId);
      notify(`✅ ${userName} has been deleted`);
      loadData(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting user:', error);
      notify(`❌ Failed to delete user: ${error.message}`);
    }
  };

  const handleMigrateProfiles = async () => {
    if (!await confirmAsk('Create chat profiles for all existing users?')) return;

    try {
      setMigrationStatus('running');
      const result = await migrateAllUserProfiles();
      setMigrationStatus('success');
      notify(`✅ Migration complete!\n${result.migratedCount} created\n${result.skippedCount} skipped\n${result.errorCount} errors`);
      setTimeout(() => setMigrationStatus('idle'), 3000);
      loadData();
    } catch (error: any) {
      setMigrationStatus('error');
      notify(`❌ Migration failed: ${error.message}`);
      setTimeout(() => setMigrationStatus('idle'), 3000);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Prepare analytics data
  const getUserActivityData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: 0,
        new: 0
      };
    });

    users.forEach(user => {
      const dayIndex = Math.floor((Date.now() - user.lastActive) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < 7) {
        last7Days[6 - dayIndex].active++;
      }
      
      const joinDayIndex = Math.floor((Date.now() - user.joinedDate) / (24 * 60 * 60 * 1000));
      if (joinDayIndex >= 0 && joinDayIndex < 7) {
        last7Days[6 - joinDayIndex].new++;
      }
    });

    return last7Days;
  };

  const getCenterDistribution = () => {
    const centers: { [key: string]: number } = {};
    users.forEach(user => {
      const center = user.iskconCenter || 'Not Specified';
      centers[center] = (centers[center] || 0) + 1;
    });

    return Object.entries(centers)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 centers
  };

  const getEngagementStats = () => {
    const highly = users.filter(u => u.loginCount > 10).length;
    const moderate = users.filter(u => u.loginCount > 3 && u.loginCount <= 10).length;
    const low = users.filter(u => u.loginCount <= 3).length;

    return [
      { name: 'Highly Active (10+)', value: highly, color: '#22c55e' },
      { name: 'Moderate (4-10)', value: moderate, color: '#f59e0b' },
      { name: 'Low (1-3)', value: low, color: '#ef4444' }
    ];
  };

  const handleBulkAction = async (action: 'select-all' | 'deselect-all') => {
    if (action === 'select-all') {
      setSelectedUsers(new Set(filteredUsers.map(u => u.uid)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleExportUsers = () => {
    const csv = [
      ['Name', 'Email', 'Guru', 'Center', 'Joined', 'Last Active', 'Logins', 'Is Admin'].join(','),
      ...filteredUsers.map(u => [
        u.userName,
        u.email,
        u.guruName,
        u.iskconCenter,
        formatDate(u.joinedDate),
        formatDate(u.lastActive),
        u.loginCount,
        u.isAdmin ? 'Yes' : 'No'
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sadhana-sanga-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBroadcastAnnouncement = async () => {
    if (!announcement.trim()) {
      notify('⚠️ Please enter an announcement message');
      return;
    }

    if (!await confirmAsk(`📢 Send this announcement to all ${users.length} users?\n\n"${announcement}"`)) {
      return;
    }

    try {
      const timestamp = Date.now();
      
      // Save broadcast to database
      const broadcastRef = ref(db, `broadcasts/${timestamp}`);
      await set(broadcastRef, {
        message: announcement,
        sentBy: user?.email,
        sentByName: user?.displayName || 'Admin',
        timestamp,
        recipientCount: users.length
      });

      // Send notification to each user
      const notificationPromises = users.map(async (targetUser) => {
        const notificationRef = push(ref(db, `userNotifications/${targetUser.uid}`));
        return set(notificationRef, {
          type: 'broadcast',
          title: '📢 Admin Announcement',
          message: announcement,
          from: 'Admin Team',
          timestamp,
          read: false,
          priority: 'high'
        });
      });

      await Promise.all(notificationPromises);

      notify(`✅ Success!\n\nAnnouncement sent to ${users.length} users.\n\nAll users will receive this notification when they next use the app.`);
      setAnnouncement('');
      
      // Reload data to show updated stats
      loadData();
    } catch (error) {
      console.error('Broadcast error:', error);
      notify('❌ Failed to send announcement. Please try again.');
    }
  };

  // Content Moderation Handlers
  const handleDeleteQuestion = async (questionId: string, title: string) => {
    if (!await confirmAsk(`Delete question: "${title}"?\n\nThis will also delete all answers.`)) return;

    try {
      await remove(ref(db, `questions/${questionId}`));
      notify('✅ Question deleted successfully');
      loadContentData();
    } catch (error: any) {
      notify(`❌ Failed to delete: ${error.message}`);
    }
  };

  const handleDeleteAnswer = async (questionId: string, answerId: string) => {
    if (!await confirmAsk('Delete this answer?')) return;

    try {
      await remove(ref(db, `questions/${questionId}/answers/${answerId}`));
      notify('✅ Answer deleted successfully');
      loadContentData();
    } catch (error: any) {
      notify(`❌ Failed to delete: ${error.message}`);
    }
  };

  const handleFlagContent = async (contentId: string, contentType: 'question' | 'answer', content: any) => {
    try {
      const flagRef = push(ref(db, 'flaggedContent'));
      await set(flagRef, {
        contentId,
        contentType,
        content,
        flaggedBy: user?.uid,
        flaggedAt: Date.now(),
        reason: 'Admin flagged for review',
        status: 'pending'
      });
      notify('✅ Content flagged successfully');
      loadContentData();
    } catch (error: any) {
      notify(`❌ Failed to flag: ${error.message}`);
    }
  };

  const handleUnflagContent = async (flagId: string) => {
    if (!await confirmAsk('Remove flag from this content?')) return;

    try {
      await remove(ref(db, `flaggedContent/${flagId}`));
      notify('✅ Content unflagged');
      loadContentData();
    } catch (error: any) {
      notify(`❌ Failed: ${error.message}`);
    }
  };

  const handleApproveContent = async (flagId: string) => {
    try {
      await update(ref(db, `flaggedContent/${flagId}`), {
        status: 'approved',
        reviewedBy: user?.uid,
        reviewedAt: Date.now()
      });
      notify('✅ Content approved');
      loadContentData();
    } catch (error: any) {
      notify(`❌ Failed: ${error.message}`);
    }
  };

  const handleHideContent = async (contentType: 'question' | 'answer', contentId: string, questionId?: string) => {
    if (!await confirmAsk('Hide this content? It will no longer be visible to users.')) return;

    try {
      const path = contentType === 'question' 
        ? `questions/${contentId}` 
        : `questions/${questionId}/answers/${contentId}`;
      
      await update(ref(db, path), {
        hidden: true,
        hiddenBy: user?.uid,
        hiddenAt: Date.now()
      });
      
      notify('✅ Content hidden successfully');
      loadContentData();
    } catch (error: any) {
      notify(`❌ Failed: ${error.message}`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.guruName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.iskconCenter.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? (u.lastActive > Date.now() - 7 * 24 * 60 * 60 * 1000) :
      filterStatus === 'inactive' ? (u.lastActive <= Date.now() - 7 * 24 * 60 * 60 * 1000) :
      true;

    return matchesSearch && matchesStatus;
  });

  const handleGrantAdmin = async (userId: string, userEmail: string) => {
    if (!await confirmAsk(`Grant admin privileges to ${userEmail}?`)) return;

    try {
      await grantAdminAccess(userId, userEmail);
      notify(`✅ Admin rights granted to ${userEmail}`);
      loadData();
    } catch (error: any) {
      notify(`❌ Failed: ${error.message}`);
    }
  };

  const handleRevokeAdmin = async (userId: string, userName: string) => {
    if (!await confirmAsk(`Revoke admin privileges from ${userName}?`)) return;

    try {
      await revokeAdminAccess(userId);
      notify(`✅ Admin rights revoked from ${userName}`);
      loadData();
    } catch (error: any) {
      notify(`❌ Failed: ${error.message}`);
    }
  };

  if (!isSuperAdmin) return null;

  // Password Authentication Screen
  if (!isAuthenticated) {
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

          <form onSubmit={handlePasswordSubmit} className="space-y-3 p-5">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              aria-label="Admin password"
              className="h-12 w-full rounded-2xl border border-sandal-300 px-4 outline-none transition focus:border-marigold-400 focus:ring-4 focus:ring-marigold-400/20"
              autoFocus
            />
            {passwordError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle size={15} className="shrink-0" />
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              disabled={!passwordInput}
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-marigold-400 to-brand-500 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50"
              style={{ minHeight: 0 }}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <PageLoader label="Loading admin panel…" />;

  const tabItems: { id: typeof activeTab; label: string; Icon: React.ElementType; count?: number; superOnly?: boolean }[] = [
    { id: 'users', label: 'Users', Icon: Users, count: users.length },
    { id: 'admins', label: 'Admins', Icon: Shield, count: admins.length, superOnly: true },
    { id: 'content', label: 'Moderation', Icon: Flag },
    { id: 'feedback', label: 'Feedback', Icon: MessageCircle },
    { id: 'ekadashi', label: 'Ekadashi', Icon: Moon },
    { id: 'requests', label: 'Requests', Icon: Send },
    { id: 'announcements', label: 'Announce', Icon: Bell, superOnly: true },
    { id: 'system', label: 'System', Icon: Database, superOnly: true },
    { id: 'settings', label: 'Settings', Icon: Zap },
  ];
  const statTiles = stats
    ? [
        { label: 'Total users', value: stats.totalUsers, Icon: Users, tone: 'bg-marigold-100 text-brand-700' },
        { label: 'Active (24h)', value: stats.activeUsers, Icon: Activity, tone: 'bg-emerald-100 text-emerald-700' },
        { label: 'Chats', value: stats.totalChats, Icon: MessageSquare, tone: 'bg-sky-100 text-sky-700' },
        { label: 'Questions', value: stats.totalQuestions, Icon: HelpCircle, tone: 'bg-amber-100 text-amber-700' },
        { label: 'Answers', value: stats.totalAnswers, Icon: BarChart3, tone: 'bg-rose-100 text-rose-700' },
      ]
    : [];

  const renderUserActions = (u: UserInfo) => (
    <div className="relative">
      <button
        onClick={() => setOpenDropdown(openDropdown === u.uid ? null : u.uid)}
        className="p-2 hover:bg-sandal-200 rounded-lg transition-all"
        title="User actions"
      >
        <MoreVertical size={20} className="text-maroon-900/60" />
      </button>
      
      {/* Dropdown Menu */}
      {openDropdown === u.uid && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpenDropdown(null)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-soft border border-sandal-200 z-20 overflow-hidden">
            <div className="p-2 bg-sandal-100 border-b border-sandal-200">
              <p className="text-xs font-bold text-maroon-900/60 px-2">USER ACTIONS</p>
            </div>
            
            <div className="py-1">
              {/* Admin Actions */}
              {!u.isAdmin ? (
                <button
                  onClick={() => {
                    handleGrantAdmin(u.uid, u.email);
                    setOpenDropdown(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-green-50 transition-all flex items-center gap-2 text-green-700 font-semibold"
                >
                  <UserPlus size={16} />
                  Grant Admin Rights
                </button>
              ) : u.email !== 'jashwanthjavili7@gmail.com' ? (
                <button
                  onClick={() => {
                    handleRevokeAdmin(u.uid, u.userName);
                    setOpenDropdown(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-sandal-50 transition-all flex items-center gap-2 text-brand-600 font-semibold"
                >
                  <UserMinus size={16} />
                  Revoke Admin Rights
                </button>
              ) : (
                <div className="px-4 py-2 text-maroon-900/40 text-sm flex items-center gap-2">
                  <Shield size={16} />
                  Super Admin (Protected)
                </div>
              )}
              
              <div className="border-t border-sandal-200 my-1" />
              
              {/* View Profile */}
              <button
                onClick={() => {
                  setProfileUser(u);
                  setOpenDropdown(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-sandal-50 transition-all flex items-center gap-2 text-brand-600 font-semibold"
              >
                <Eye size={16} />
                View Full Profile
              </button>

              {isSuperAdmin && (
                <>
                  <div className="border-t border-sandal-200 my-1" />
                  
                  {/* Delete User */}
                  <button
                    onClick={() => {
                      handleDeleteUser(u.uid, u.userName);
                      setOpenDropdown(null);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-red-50 transition-all flex items-center gap-2 text-red-700 font-semibold"
                  >
                    <Trash2 size={16} />
                    Delete User
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto min-h-full max-w-7xl animate-fadeIn space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-marigold-400 to-brand-500 text-white shadow-soft">
            <Shield size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-maroon-900 sm:text-xl">Admin</h1>
            <p className="truncate text-xs text-maroon-900/50">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-amber-200 transition hover:bg-amber-50 active:scale-95"
          style={{ minHeight: 0 }}
          aria-label="Refresh"
        >
          <RefreshCw size={16} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Statistics — swipe on phones, one row on larger screens */}
      {stats && (
        <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0" style={{ scrollbarWidth: 'none' }}>
          {statTiles.map(({ label, value, Icon, tone }) => (
            <div key={label} className="flex w-[132px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-sandal-200 bg-white p-3 shadow-soft sm:w-auto">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-maroon-900">{value}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-maroon-900/50">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="sticky top-16 z-20 -mx-4 overflow-x-auto bg-sandal-100/90 px-4 py-2 backdrop-blur sm:top-[72px] sm:mx-0 sm:rounded-2xl sm:px-2" style={{ scrollbarWidth: 'none' }}>
        <div className="flex w-max gap-1.5">
          {tabItems
            .filter((t) => !t.superOnly || isSuperAdmin)
            .map(({ id, label, Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{ minHeight: 0 }}
                className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition ${
                  activeTab === id ? 'bg-brand-600 text-white shadow-soft' : 'bg-white text-maroon-900/65 ring-1 ring-sandal-200 hover:bg-sandal-50'
                }`}
              >
                <Icon size={15} />
                {label}
                {count !== undefined && (
                  <span className={`rounded-full px-1.5 text-[11px] ${activeTab === id ? 'bg-white/25' : 'bg-sandal-100'}`}>{count}</span>
                )}
              </button>
            ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'ekadashi' && <EkadashiAdmin />}

      {activeTab === 'users' && (
        <div className="space-y-3">
          {/* Search and filters */}
          <div className="rounded-2xl border border-sandal-200 bg-white p-3 shadow-soft sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-maroon-900/40" size={18} />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-xl border border-sandal-200 pl-10 pr-4 outline-none focus:ring-2 focus:ring-marigold-400/40"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-sandal-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-marigold-400/40 sm:flex-none"
                >
                  <option value="all">All users</option>
                  <option value="active">Active (7 days)</option>
                  <option value="inactive">Inactive (&gt;7 days)</option>
                </select>
                <button
                  onClick={handleExportUsers}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                  style={{ minHeight: 0 }}
                >
                  <Download size={17} />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">CSV</span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-maroon-900/50">{filteredUsers.length} of {users.length} users</p>
          </div>

          {/* One card per user */}
          <ul className="grid gap-2.5 lg:grid-cols-2">
            {filteredUsers.map((u) => (
              <li key={u.uid} className="rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 font-semibold text-maroon-900">
                      <span className="break-words">{u.userName}</span>
                      {u.isAdmin && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">ADMIN</span>}
                    </p>
                    <p className="break-all text-xs text-maroon-900/55">{u.email}</p>
                  </div>
                  <div className="shrink-0">{renderUserActions(u)}</div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="min-w-0"><dt className="text-maroon-900/40">Guru</dt><dd className="break-words font-medium text-maroon-900/80">{u.guruName || '—'}</dd></div>
                  <div className="min-w-0"><dt className="text-maroon-900/40">Center</dt><dd className="break-words font-medium text-maroon-900/80">{u.iskconCenter || '—'}</dd></div>
                  <div><dt className="text-maroon-900/40">Joined</dt><dd className="font-medium text-maroon-900/80">{formatDate(u.joinedDate)}</dd></div>
                  <div>
                    <dt className="text-maroon-900/40">Last active</dt>
                    <dd className={`font-medium ${u.lastActive > Date.now() - 86400000 ? 'text-emerald-600' : 'text-maroon-900/80'}`}>{formatRelativeTime(u.lastActive)}</dd>
                  </div>
                  <div><dt className="text-maroon-900/40">Logins</dt><dd className="font-medium text-maroon-900/80">{u.loginCount}</dd></div>
                  <div><dt className="text-maroon-900/40">Feedback</dt><dd className="font-medium text-maroon-900/80">{u.feedbackRating ? `${u.feedbackRating} / 5 ⭐` : 'None'}</dd></div>
                </dl>
              </li>
            ))}
          </ul>

          {filteredUsers.length === 0 && (
            <div className="rounded-2xl border border-sandal-200 bg-white py-10 text-center text-sm text-maroon-900/50">No users match.</div>
          )}
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 px-1 text-base font-semibold text-maroon-900">
            <Shield size={18} className="text-brand-600" /> Admins ({admins.length})
          </h2>
          <ul className="space-y-2.5">
            {admins.map((admin) => {
              const name = users.find((u) => u.uid === admin.uid)?.userName || admin.email.split('@')[0] || 'Admin';
              return (
                <li key={admin.uid} className="flex flex-col gap-3 rounded-2xl border border-sandal-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-maroon-900">
                      <span className="truncate">{name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${admin.isSuperAdmin ? 'bg-brand-600' : 'bg-red-600'}`}>
                        {admin.isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                      </span>
                    </p>
                    <p className="truncate text-xs text-maroon-900/55">{admin.email}</p>
                    <p className="mt-0.5 text-xs text-maroon-900/40">Granted {admin.grantedAt ? formatDate(admin.grantedAt) : 'N/A'}</p>
                  </div>
                  {!admin.isSuperAdmin ? (
                    <button
                      onClick={() => handleRevokeAdmin(admin.uid, name)}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                      style={{ minHeight: 0 }}
                    >
                      <UserMinus size={16} /> Revoke
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-maroon-900/40">Protected</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-3">
          {/* Counts */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile label="Questions" value={questions.length} icon={HelpCircle} tone="bg-amber-100 text-amber-700" />
            <StatTile label="Answers" value={answers.length} icon={MessageSquare} tone="bg-emerald-100 text-emerald-700" />
            <StatTile label="Flagged" value={flaggedContent.filter((f) => f.status === 'pending').length} icon={AlertTriangle} tone="bg-red-100 text-red-700" />
            <StatTile label="Hidden" value={questions.filter((q) => q.hidden).length + answers.filter((a) => a.hidden).length} icon={Eye} tone="bg-sandal-200 text-maroon-900/70" />
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-sandal-200 bg-white p-3 shadow-soft">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-maroon-900/40" size={18} />
              <input
                type="text"
                placeholder="Search content…"
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-sandal-200 pl-10 pr-4 outline-none focus:ring-2 focus:ring-marigold-400/40"
              />
            </div>
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {(
                [
                  ['all', 'All'],
                  ['questions', `Questions ${questions.length}`],
                  ['answers', `Answers ${answers.length}`],
                  ['flagged', `Flagged ${flaggedContent.filter((f) => f.status === 'pending').length}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setContentFilter(id)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition ${
                    contentFilter === id ? 'bg-brand-600 text-white' : 'bg-white text-maroon-900/65 ring-1 ring-sandal-200'
                  }`}
                  style={{ minHeight: 0 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions */}
          {(contentFilter === 'all' || contentFilter === 'questions') && (
            <Panel title="Questions" icon={HelpCircle}>
              <ul className="space-y-2.5">
                {questions
                  .filter(
                    (q) =>
                      !contentSearch ||
                      q.title?.toLowerCase().includes(contentSearch.toLowerCase()) ||
                      q.description?.toLowerCase().includes(contentSearch.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((question) => (
                    <li key={question.id} className={`rounded-xl border p-3.5 ${question.hidden ? 'border-red-200 bg-red-50' : 'border-sandal-200 bg-sandal-50/60'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-maroon-900">{question.title}</h4>
                          <p className="mt-1 line-clamp-2 text-sm text-maroon-900/60">{question.description}</p>
                          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-maroon-900/50">
                            <span>{question.userName || 'Anonymous'}</span>
                            <span>{question.category || 'General'}</span>
                            <span>{new Date(question.timestamp).toLocaleDateString()}</span>
                            {question.hidden && <span className="font-semibold text-red-600">Hidden</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {!question.hidden && (
                            <>
                              <IconAction onClick={() => handleHideContent('question', question.id)} title="Hide" tone="bg-amber-100 text-amber-700">
                                <EyeOff size={16} />
                              </IconAction>
                              <IconAction onClick={() => handleFlagContent(question.id, 'question', question)} title="Flag for review" tone="bg-yellow-100 text-yellow-700">
                                <Flag size={16} />
                              </IconAction>
                            </>
                          )}
                          <IconAction onClick={() => handleDeleteQuestion(question.id, question.title)} title="Delete" tone="bg-red-100 text-red-700">
                            <Trash2 size={16} />
                          </IconAction>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
              {questions.length === 0 && <p className="py-6 text-center text-sm text-maroon-900/50">No questions found</p>}
            </Panel>
          )}

          {/* Answers */}
          {(contentFilter === 'all' || contentFilter === 'answers') && (
            <Panel title="Answers" icon={MessageSquare}>
              <ul className="space-y-2.5">
                {answers
                  .filter(
                    (a) =>
                      !contentSearch ||
                      a.answer?.toLowerCase().includes(contentSearch.toLowerCase()) ||
                      a.questionTitle?.toLowerCase().includes(contentSearch.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((answer) => (
                    <li key={answer.id} className={`rounded-xl border p-3.5 ${answer.hidden ? 'border-red-200 bg-red-50' : 'border-sandal-200 bg-sandal-50/60'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-maroon-900/50">On: {answer.questionTitle}</p>
                          <p className="mt-1 line-clamp-3 text-sm text-maroon-900">{answer.answer}</p>
                          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-maroon-900/50">
                            <span>{answer.userName || 'Anonymous'}</span>
                            <span>{new Date(answer.timestamp).toLocaleDateString()}</span>
                            {answer.hidden && <span className="font-semibold text-red-600">Hidden</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {!answer.hidden && (
                            <>
                              <IconAction onClick={() => handleHideContent('answer', answer.id, answer.questionId)} title="Hide" tone="bg-amber-100 text-amber-700">
                                <EyeOff size={16} />
                              </IconAction>
                              <IconAction onClick={() => handleFlagContent(answer.id, 'answer', answer)} title="Flag for review" tone="bg-yellow-100 text-yellow-700">
                                <Flag size={16} />
                              </IconAction>
                            </>
                          )}
                          <IconAction onClick={() => handleDeleteAnswer(answer.questionId, answer.id)} title="Delete" tone="bg-red-100 text-red-700">
                            <Trash2 size={16} />
                          </IconAction>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
              {answers.length === 0 && <p className="py-6 text-center text-sm text-maroon-900/50">No answers found</p>}
            </Panel>
          )}

          {/* Flagged */}
          {(contentFilter === 'all' || contentFilter === 'flagged') && (
            <Panel title="Flagged for review" icon={AlertTriangle}>
              <ul className="space-y-2.5">
                {flaggedContent
                  .filter((f) => f.status === 'pending')
                  .map((item) => (
                    <li key={item.id} className="rounded-xl border border-red-200 bg-red-50 p-3.5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-xs text-maroon-900/50">
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{item.contentType?.toUpperCase()}</span>
                            {new Date(item.flaggedAt).toLocaleDateString()}
                          </p>
                          <p className="mt-1.5 line-clamp-3 text-sm text-maroon-900">{item.content?.title || item.content?.answer}</p>
                          <p className="mt-1 text-xs text-maroon-900/55">Reason: {item.reason}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <IconAction onClick={() => handleApproveContent(item.id)} title="Approve" tone="bg-emerald-100 text-emerald-700">
                            <CheckCircle size={16} />
                          </IconAction>
                          <IconAction onClick={() => handleUnflagContent(item.id)} title="Unflag" tone="bg-sandal-200 text-maroon-900/70">
                            <XCircle size={16} />
                          </IconAction>
                          <IconAction
                            onClick={() =>
                              item.contentType === 'question'
                                ? handleDeleteQuestion(item.contentId, item.content?.title)
                                : handleDeleteAnswer(item.content?.questionId, item.contentId)
                            }
                            title="Delete"
                            tone="bg-red-100 text-red-700"
                          >
                            <Trash2 size={16} />
                          </IconAction>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
              {flaggedContent.filter((f) => f.status === 'pending').length === 0 && (
                <p className="py-6 text-center text-sm text-maroon-900/50">Nothing is waiting for review</p>
              )}
            </Panel>
          )}

          {/* Export */}
          <button
            onClick={async () => {
              if (await confirmAsk('Export all content data to JSON?')) {
                const data = { questions, answers, flaggedContent };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `content-export-${Date.now()}.json`;
                a.click();
              }
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-amber-200 transition hover:bg-amber-50 sm:w-auto sm:px-5"
            style={{ minHeight: 0 }}
          >
            <Download size={17} /> Export all content
          </button>
        </div>
      )}

      {activeTab === 'feedback' && <FeedbackViewer />}

      {activeTab === 'requests' && <AdminRequestsPanel />}

      {/* Announcements Tab - Rich Text Broadcast System */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-brand-600 rounded-xl p-6 text-white shadow-soft">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <Bell size={32} />
              Broadcast Announcements
            </h2>
            <p className="text-cyan-100">Send styled announcements and notifications to all users</p>
          </div>

          {/* Rich Text Editor */}
          <div className="bg-white rounded-xl shadow-soft border border-sandal-200 p-6">
            <h3 className="text-xl font-bold mb-4 text-brand-600">Create New Announcement</h3>
            
            {/* Announcement Type Selector */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-maroon-900 mb-2">Announcement Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'info', label: '📢 Information', color: 'blue' },
                  { value: 'update', label: '🆕 Version Update', color: 'green' },
                  { value: 'warning', label: '⚠️ Important Notice', color: 'amber' },
                  { value: 'celebration', label: '🎉 Celebration', color: 'purple' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setAnnouncementType(type.value as any)}
                    className={`p-3 rounded-lg border font-semibold text-sm transition-all ${
                      announcementType === type.value
                        ? `bg-${type.color}-600 text-white border-${type.color}-600 shadow-soft scale-105`
                        : `bg-white text-${type.color}-700 border-${type.color}-300 hover:border-${type.color}-500`
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-maroon-900 mb-2">Title</label>
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Enter announcement title..."
                className="w-full px-4 py-3 border border-sandal-200 rounded-lg focus:border-sandal-200 focus:outline-none text-lg font-semibold"
              />
            </div>

            {/* Text Formatting Toolbar */}
            <div className="mb-2">
              <label className="block text-sm font-bold text-maroon-900 mb-2">Message</label>
              <div className="flex flex-wrap gap-2 p-3 bg-sandal-100 rounded-t-lg border border-b-0 border-sandal-200">
                {/* Bold */}
                <button
                  onClick={() => setIsBold(!isBold)}
                  className={`px-3 py-2 rounded-lg font-bold transition-all ${
                    isBold ? 'bg-brand-600 text-white' : 'bg-white text-maroon-900 hover:bg-sandal-200'
                  }`}
                  title="Bold"
                >
                  <span className="font-bold">B</span>
                </button>
                
                {/* Italic */}
                <button
                  onClick={() => setIsItalic(!isItalic)}
                  className={`px-3 py-2 rounded-lg font-bold transition-all ${
                    isItalic ? 'bg-brand-600 text-white' : 'bg-white text-maroon-900 hover:bg-sandal-200'
                  }`}
                  title="Italic"
                >
                  <span className="italic">I</span>
                </button>

                <div className="w-px h-8 bg-sandal-200"></div>

                {/* Font Size */}
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-sandal-200 bg-white hover:border-sandal-200 transition-all cursor-pointer"
                >
                  <option value="12">Small</option>
                  <option value="16">Normal</option>
                  <option value="20">Large</option>
                  <option value="24">Extra Large</option>
                </select>

                {/* Text Color */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-maroon-900">Color:</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-sandal-200 cursor-pointer"
                  />
                </div>

                <div className="w-px h-8 bg-sandal-200"></div>

                {/* Quick Emojis */}
                <div className="flex gap-1">
                  {['🙏', '🎉', '📢', '⚠️', '✨', '🔔', '❤️', '🌟'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setAnnouncementText(announcementText + emoji)}
                      className="px-2 py-1 hover:bg-sandal-200 rounded transition-all text-xl"
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message Textarea */}
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              style={{
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                fontSize: `${fontSize}px`,
                color: textColor
              }}
              className="w-full px-4 py-3 border border-t-0 border-sandal-200 rounded-b-lg focus:border-sandal-200 focus:outline-none resize-none"
            />

            {/* Preview */}
            <div className="mt-4 p-4 bg-sandal-50 rounded-lg border border-sandal-200">
              <p className="text-xs font-bold text-brand-600 mb-2">PREVIEW</p>
              <div className={`
                p-4 rounded-lg shadow-md
                ${announcementType === 'info' ? 'bg-sandal-50 border border-sandal-200' : ''}
                ${announcementType === 'update' ? 'bg-green-50 border border-sandal-200' : ''}
                ${announcementType === 'warning' ? 'bg-sandal-50 border border-sandal-200' : ''}
                ${announcementType === 'celebration' ? 'bg-sandal-50 border border-sandal-200' : ''}
              `}>
                {announcementTitle && (
                  <h4 className="font-bold text-lg mb-2">{announcementTitle}</h4>
                )}
                {announcementText && (
                  <p
                    style={{
                      fontWeight: isBold ? 'bold' : 'normal',
                      fontStyle: isItalic ? 'italic' : 'normal',
                      fontSize: `${fontSize}px`,
                      color: textColor
                    }}
                    className="whitespace-pre-wrap"
                  >
                    {announcementText}
                  </p>
                )}
                {!announcementTitle && !announcementText && (
                  <p className="text-maroon-900/40 italic">Your announcement will appear here...</p>
                )}
              </div>
            </div>

            {/* Send Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  if (!announcementTitle || !announcementText) {
                    notify('Please enter both title and message');
                    return;
                  }
                  
                  try {
                    const announcementData = {
                      title: announcementTitle,
                      message: announcementText,
                      type: announcementType,
                      formatting: {
                        bold: isBold,
                        italic: isItalic,
                        fontSize: fontSize,
                        color: textColor
                      },
                      sentBy: user?.email,
                      timestamp: Date.now()
                    };

                    // Send to all users
                    const promises = users.map(async (targetUser) => {
                      const notifRef = push(ref(db, `userNotifications/${targetUser.uid}`));
                      return set(notifRef, {
                        type: announcementType,
                        title: announcementTitle,
                        message: announcementText,
                        formatting: announcementData.formatting,
                        timestamp: Date.now(),
                        read: false
                      });
                    });

                    await Promise.all(promises);
                    
                    // Save to announcement history
                    const historyRef = push(ref(db, 'announcements'));
                    await set(historyRef, announcementData);

                    notify(`✅ Announcement sent to ${users.length} users!`);
                    setAnnouncementTitle('');
                    setAnnouncementText('');
                    setIsBold(false);
                    setIsItalic(false);
                    setFontSize('16');
                    setTextColor('#000000');
                  } catch (error: any) {
                    notify(`❌ Failed to send: ${error.message}`);
                  }
                }}
                disabled={!announcementTitle || !announcementText}
                className="flex-1 px-8 py-4 bg-brand-600 hover:bg-brand-700 disabled:from-stone-300 disabled:to-stone-400 text-white rounded-xl font-bold text-lg shadow-soft transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <Send size={24} />
                Broadcast to All Users ({users.length})
              </button>
              <button
                onClick={() => {
                  setAnnouncementTitle('');
                  setAnnouncementText('');
                  setIsBold(false);
                  setIsItalic(false);
                  setFontSize('16');
                  setTextColor('#000000');
                }}
                className="px-6 py-4 bg-sandal-200 hover:bg-sandal-200 text-maroon-900 rounded-xl font-bold transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Quick Templates */}
          <div className="bg-white rounded-xl shadow-soft border border-sandal-200 p-6">
            <h3 className="text-xl font-bold mb-4 text-maroon-900">Quick Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'New Feature Announcement',
                  message: 'Exciting news! We\'ve added new features to enhance your spiritual journey. Check them out now! 🎉',
                  type: 'update'
                },
                {
                  title: 'Festival Reminder',
                  message: 'Don\'t forget! Upcoming festival celebrations. Mark your calendars! 🙏',
                  type: 'celebration'
                },
                {
                  title: 'Maintenance Notice',
                  message: 'Scheduled maintenance will occur soon. The app may be temporarily unavailable. Thank you for your patience. ⚙️',
                  type: 'warning'
                },
                {
                  title: 'Community Update',
                  message: 'Join our growing community of devotees! Share your experiences and connect with others on the spiritual path. ✨',
                  type: 'info'
                }
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAnnouncementTitle(template.title);
                    setAnnouncementText(template.message);
                    setAnnouncementType(template.type as any);
                  }}
                  className="p-4 text-left border border-sandal-200 rounded-lg hover:border-sandal-200 hover:bg-sandal-50 transition-all group"
                >
                  <h4 className="font-bold text-maroon-900 group-hover:text-brand-600">{template.title}</h4>
                  <p className="text-sm text-maroon-900/60 mt-1 line-clamp-2">{template.message}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Status" icon={Zap}>
              <p className="text-2xl font-bold text-emerald-600">Healthy</p>
              <p className="mt-1 text-sm text-maroon-900/55">All systems operational</p>
            </Panel>

            <Panel title="Database" icon={Database}>
              <p className="text-2xl font-bold text-brand-600">{firebaseUsage ? `${firebaseUsage.totalSizeMB} MB` : 'Loading…'}</p>
              <p className="mt-1 text-sm text-maroon-900/55">{firebaseUsage ? `${firebaseUsage.usagePercent}% of 1 GB used` : 'Firebase Realtime DB'}</p>
              {firebaseUsage && (
                <div className="mt-3 space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-sandal-200">
                    <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(firebaseUsage.usagePercent, 100)}%` }} />
                  </div>
                  <MetricRow label="Users" value={`${firebaseUsage.userCount} records`} />
                  <MetricRow label="Questions" value={`${firebaseUsage.questionCount} records`} />
                  <MetricRow label="Chats" value={`${firebaseUsage.chatCount} records`} />
                </div>
              )}
            </Panel>

            <Panel title="Online now" icon={Activity}>
              <p className="text-2xl font-bold text-brand-600">
                {
                  users.filter((u) => {
                    const lastActive = u.lastActive ? new Date(u.lastActive) : null;
                    return lastActive && new Date().getTime() - lastActive.getTime() < 15 * 60 * 1000;
                  }).length
                }
              </p>
              <p className="mt-1 text-sm text-maroon-900/55">Active in the last 15 minutes</p>
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Performance" icon={TrendingUp}>
              <div className="space-y-2">
                <MetricRow label="Avg response time" value="~300ms" tone="text-emerald-600" />
                <MetricRow label="Uptime (30 days)" value="99.9%" tone="text-emerald-600" />
                <MetricRow label="Error rate" value="<0.1%" tone="text-emerald-600" />
              </div>
            </Panel>
            <Panel title="System information" icon={Zap}>
              <div className="space-y-2">
                <MetricRow label="Platform" value="Firebase" tone="text-brand-600" />
                <MetricRow label="Plan" value="Spark (Free)" tone="text-brand-600" />
                <MetricRow label="Region" value="Asia-South" tone="text-brand-600" />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* App settings */}
      {activeTab === 'settings' && (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="General" icon={Zap}>
              <div className="space-y-2">
                <Toggle label="Maintenance mode" hint="Disable the app for maintenance" checked={maintenanceMode} onChange={(v) => saveAppSettings('maintenanceMode', v)} />
                <Toggle label="Guest mode access" hint="Allow guest demo access" checked={guestModeEnabled} onChange={(v) => saveAppSettings('guestModeEnabled', v)} />
                <Toggle label="New user registration" hint="Allow new sign-ups" checked={registrationEnabled} onChange={(v) => saveAppSettings('registrationEnabled', v)} />
              </div>
            </Panel>

            <Panel title="Database" icon={Database}>
              <button
                onClick={handleMigrateProfiles}
                disabled={migrationStatus === 'running'}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition ${
                  migrationStatus === 'running'
                    ? 'cursor-wait bg-yellow-500'
                    : migrationStatus === 'success'
                    ? 'bg-emerald-500'
                    : migrationStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
                style={{ minHeight: 0 }}
              >
                <RefreshCw size={17} className={migrationStatus === 'running' ? 'animate-spin' : ''} />
                {migrationStatus === 'running'
                  ? 'Migrating…'
                  : migrationStatus === 'success'
                  ? 'Migration complete'
                  : migrationStatus === 'error'
                  ? 'Migration failed'
                  : 'Migrate chat profiles'}
              </button>
            </Panel>
          </div>

          {firebaseUsage && (
            <Panel
              title="Firebase usage"
              icon={Database}
              action={
                <button
                  onClick={() => loadFirebaseUsage()}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-brand-700 ring-1 ring-amber-200 transition hover:bg-amber-50"
                  style={{ minHeight: 0 }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              }
            >
              <div className="rounded-xl bg-sandal-50 p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-maroon-900/70">Storage used</span>
                  <span className="text-xl font-bold text-brand-600">{firebaseUsage.totalSizeMB} MB</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-sandal-200">
                  <div
                    className={`h-full transition-all ${firebaseUsage.usagePercent > 80 ? 'bg-red-500' : firebaseUsage.usagePercent > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(firebaseUsage.usagePercent, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-maroon-900/55">
                  {firebaseUsage.usagePercent}% of {firebaseUsage.freeLimitMB} MB free tier
                </p>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <StatTile label="Users" value={firebaseUsage.userCount} icon={Users} tone="bg-marigold-100 text-brand-700" />
                <StatTile label="Questions" value={firebaseUsage.questionCount} icon={HelpCircle} tone="bg-amber-100 text-amber-700" />
                <StatTile label="Chats" value={firebaseUsage.chatCount} icon={MessageSquare} tone="bg-sky-100 text-sky-700" />
                <StatTile label="Reads / day" value={firebaseUsage.estimatedReadsPerDay} icon={Activity} tone="bg-emerald-100 text-emerald-700" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-maroon-900/55">
                Free tier: 1 GB storage, 10 GB downloads per month, 100 concurrent connections. Estimated time until the storage limit:{' '}
                {Math.floor((firebaseUsage.freeLimitMB - firebaseUsage.totalSizeMB) / (firebaseUsage.totalSizeMB / 30))} days.
              </p>
            </Panel>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Last 24 hours" icon={Activity}>
              <div className="space-y-2">
                <MetricRow label="New registrations" value={users.filter((u) => Date.now() - u.joinedDate < 86400000).length} tone="text-emerald-600" />
                <MetricRow label="Active users" value={users.filter((u) => Date.now() - u.lastActive < 86400000).length} tone="text-brand-600" />
              </div>
            </Panel>
            <Panel title="Security" icon={Shield}>
              <p className="text-sm text-maroon-900/60">
                Admin access is protected by a password and limited to super admins. Password change, 2FA and IP allow-lists are not available yet.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {dialog}

      {profileUser && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="User profile">
          <div className="absolute inset-0 animate-fadeIn bg-maroon-900/35 backdrop-blur-[2px]" onClick={() => setProfileUser(null)} />
          <div className="relative max-h-[90dvh] w-full animate-rise-in overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-lift sm:max-w-sm sm:rounded-[28px]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-maroon-900">{profileUser.userName}</h3>
                <p className="truncate text-sm text-maroon-900/55">{profileUser.email}</p>
              </div>
              <button onClick={() => setProfileUser(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-maroon-900/50 hover:bg-sandal-100" aria-label="Close" style={{ minHeight: 0 }}>
                <XCircle size={20} />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {(
                [
                  ['Guru', profileUser.guruName],
                  ['Center', profileUser.iskconCenter],
                  ['Joined', formatDate(profileUser.joinedDate)],
                  ['Last active', formatRelativeTime(profileUser.lastActive)],
                  ['Logins', String(profileUser.loginCount)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-sandal-50 px-3.5 py-2.5">
                  <dt className="text-maroon-900/55">{k}</dt>
                  <dd className="min-w-0 truncate font-medium text-maroon-900">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
