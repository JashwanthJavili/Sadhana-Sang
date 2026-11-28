import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../services/storage';
import { UserSettings } from '../types';
import {
  Pencil,
  Check,
  X,
  Building2,
  Clock,
  MessageCircle,
  Download,
  Smartphone,
  RefreshCw,
  Mail,
  LogOut,
  LogIn,
  Trash2,
  UserX,
  ShieldAlert,
  ChevronRight,
  Flower2,
  Compass,
  Bell,
  Eye,
  UserPlus,
  Ban,
  Sparkles,
  Target,
  HeartHandshake,
  CalendarDays,
} from 'lucide-react';
import { SEEKING, REFERRAL_SOURCES } from '../components/OnboardingModal';
import { listenBlocked, unblockUser, unpublishProfile, getPublicProfile } from '../services/privacy';
import { getPushState, enablePush, disablePush, PushState } from '../services/push';
import { startGuide } from '../components/AppGuide';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { clearAllChats } from '../scripts/clearAllChats';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { updateUserProfile } from '../services/chat';
import { ref, remove, get } from 'firebase/database';
import { db, auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';

// @ts-ignore
import versionData from '../version.json';

// Declare global deferredPrompt
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

const ADMIN_EMAIL = 'jashwanthjavili7@gmail.com';
const CONTACT_EMAIL = 'jashwanthjavili7@gmail.com';

const fieldCls =
  'block h-11 w-full rounded-xl border border-sandal-300 bg-white px-3.5 text-sm text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

/** Removes everything stored for a user in the database (shared by "clear data" and "delete account"). */
const deleteUserData = async (userId: string) => {
  await remove(ref(db, `users/${userId}`));
  await remove(ref(db, `userProfiles/${userId}`));
  await remove(ref(db, `userNotifications/${userId}`));

  // Connections (both directions)
  const connectionsSnapshot = await get(ref(db, `connections/${userId}`));
  if (connectionsSnapshot.exists()) {
    const connectedUsers = Object.keys(connectionsSnapshot.val());
    for (const connectedUserId of connectedUsers) {
      await remove(ref(db, `connections/${connectedUserId}/${userId}`));
    }
    await remove(ref(db, `connections/${userId}`));
  }

  // Connection requests (sent and received)
  const requestsSnapshot = await get(ref(db, 'connectionRequests')).catch(() => null);
  if (requestsSnapshot?.exists()) {
    const deletePromises: Promise<void>[] = [];
    requestsSnapshot.forEach((requestSnapshot) => {
      const request = requestSnapshot.val();
      if (request.fromUserId === userId || request.toUserId === userId) {
        deletePromises.push(remove(ref(db, `connectionRequests/${requestSnapshot.key}`)));
      }
    });
    await Promise.all(deletePromises);
  }

  // Public card and blocks
  await unpublishProfile(userId);
  await remove(ref(db, `blocks/${userId}`)).catch(() => undefined);
  await remove(ref(db, `pushSubscribers/${userId}`)).catch(() => undefined);

  // Chats where user is a participant (private index)
  const myChats = await get(ref(db, `userChats/${userId}`)).catch(() => null);
  const chatIds = Object.keys(myChats?.val() || {});
  await Promise.all(
    chatIds.flatMap((id) => [
      remove(ref(db, `messages/${id}`)).catch(() => undefined),
      remove(ref(db, `typing/${id}`)).catch(() => undefined),
      remove(ref(db, `chats/${id}`)).catch(() => undefined),
    ])
  );
  await remove(ref(db, `userChats/${userId}`)).catch(() => undefined);

  // Questions posted by user
  const questionsSnapshot = await get(ref(db, 'questions')).catch(() => null);
  if (!questionsSnapshot) return;
  if (questionsSnapshot.exists()) {
    const deleteQuestionPromises: Promise<void>[] = [];
    questionsSnapshot.forEach((questionSnapshot) => {
      const question = questionSnapshot.val();
      if (question.userId === userId) {
        deleteQuestionPromises.push(remove(ref(db, `questions/${questionSnapshot.key}`)));
        deleteQuestionPromises.push(remove(ref(db, `answers/${questionSnapshot.key}`)));
      }
    });
    await Promise.all(deleteQuestionPromises);
  }

  // Answers posted by user
  const answersSnapshot = await get(ref(db, 'answers')).catch(() => null);
  if (!answersSnapshot) return;
  if (answersSnapshot.exists()) {
    const deleteAnswerPromises: Promise<void>[] = [];
    answersSnapshot.forEach((questionAnswersSnapshot) => {
      questionAnswersSnapshot.forEach((answerSnapshot) => {
        const answer = answerSnapshot.val();
        if (answer.userId === userId) {
          deleteAnswerPromises.push(remove(ref(db, `answers/${questionAnswersSnapshot.key}/${answerSnapshot.key}`)));
        }
      });
    });
    await Promise.all(deleteAnswerPromises);
  }
};

/* ---------- Small layout pieces ---------- */

const Section: React.FC<{ title: string; children: React.ReactNode; danger?: boolean }> = ({ title, children, danger }) => (
  <section>
    <h2 className={`mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide ${danger ? 'text-red-600/80' : 'text-maroon-900/50'}`}>
      {title}
    </h2>
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-soft ring-1 divide-y ${
        danger ? 'ring-red-200 divide-red-100' : 'ring-sandal-200 divide-sandal-200/70'
      }`}
    >
      {children}
    </div>
  </section>
);

interface RowProps {
  icon: React.ElementType;
  label: string;
  helper?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  href?: string;
}

const Row: React.FC<RowProps> = ({ icon: Icon, label, helper, right, onClick, disabled, danger, href }) => {
  const content = (
    <>
      <Icon size={18} className={`shrink-0 ${danger ? 'text-red-500' : 'text-maroon-900/45'}`} />
      <span className="min-w-0 flex-1">
        <span className={`block break-words text-sm font-semibold ${danger ? 'text-red-700' : 'text-maroon-900'}`}>{label}</span>
        {helper && <span className="mt-0.5 block break-words text-xs leading-snug text-maroon-900/55">{helper}</span>}
      </span>
      {right !== undefined ? right : (onClick || href) && <ChevronRight size={18} className="shrink-0 text-maroon-900/30" />}
    </>
  );
  const cls = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left';
  const hover = danger ? 'hover:bg-red-50/60' : 'hover:bg-sandal-50';
  if (href) {
    return (
      <a href={href} className={`${cls} transition ${hover}`}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${cls} transition ${hover} active:bg-sandal-100 disabled:cursor-not-allowed disabled:opacity-50`}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    style={{ minHeight: 0 }}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
      checked ? 'bg-brand-600' : 'bg-stone-300'
    }`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
  </button>
);

/* ---------- Page ---------- */

type PrivacyState = {
  showGuruName: boolean;
  showIskconCenter: boolean;
  showLastSeen: boolean;
  messagingPrivacy: 'everyone' | 'connections-only';
  profileVisibility: 'everyone' | 'same-gender';
  requestsFrom: 'everyone' | 'same-gender' | 'nobody';
};

/** Unset values fall back to protective defaults for Matajis. */
const privacyFrom = (s: UserSettings | null): PrivacyState => {
  const mataji = s?.gender === 'female';
  return {
    showGuruName: s?.showGuruName ?? true,
    showIskconCenter: s?.showIskconCenter ?? true,
    showLastSeen: s?.showLastSeen ?? !mataji,
    messagingPrivacy: s?.messagingPrivacy ?? (mataji ? 'connections-only' : 'everyone'),
    profileVisibility: s?.profileVisibility ?? 'everyone',
    requestsFrom: s?.requestsFrom ?? 'everyone',
  };
};

const Segmented: React.FC<{ value: string; options: [string, string][]; onChange: (v: string) => void }> = ({ value, options, onChange }) => (
  <div className="mt-3 flex gap-1 rounded-xl bg-sandal-100 p-1">
    {options.map(([v, text]) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        aria-pressed={value === v}
        className={`h-9 flex-1 rounded-lg px-2 text-[13px] font-medium transition ${value === v ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/60 hover:text-maroon-900'}`}
        style={{ minHeight: 0 }}
      >
        {text}
      </button>
    ))}
  </div>
);

const ChoiceRow: React.FC<{ icon: React.ElementType; label: string; helper: string; children: React.ReactNode }> = ({ icon: Icon, label, helper, children }) => (
  <div className="px-4 py-3.5">
    <div className="flex items-center gap-3">
      <Icon size={18} className="shrink-0 text-maroon-900/45" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-maroon-900">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-maroon-900/55">{helper}</p>
      </div>
    </div>
    {children}
  </div>
);

const Settings: React.FC = () => {
  const { user, logout, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { userSettings: contextSettings, updateUserSettings } = useUserData();
  const [settings, setSettings] = useState<UserSettings | null>(contextSettings);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<UserSettings | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyState>(() => privacyFrom(contextSettings));
  const [privacySaving, setPrivacySaving] = useState(false);
  const { ask, dialog } = useConfirm();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [clearDataStatus, setClearDataStatus] = useState<'idle' | 'clearing' | 'success' | 'error'>('idle');
  const [deleteAccountStatus, setDeleteAccountStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle');
  const [clearChatsStatus, setClearChatsStatus] = useState<'idle' | 'clearing' | 'success' | 'error'>('idle');
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const isGuest = user?.uid === 'guest';
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Check if app can be installed
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    } else if (window.deferredPrompt) {
      setShowInstallButton(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (contextSettings) setSettings(contextSettings);
  }, [contextSettings]);

  useEffect(() => {
    const fetch = async () => {
      if (user) {
        const data = await getSettings(user.uid);
        // If settings are empty, pre-fill user name from Auth
        if (!data.userName && user.displayName) {
          data.userName = user.displayName;
        }
        setSettings(data);
      }
    };
    fetch();
  }, [user]);

  // Keep the privacy toggles in sync with the saved settings
  useEffect(() => {
    setPrivacy(privacyFrom(settings));
  }, [settings]);

  const savedPrivacy = privacyFrom(settings);
  const privacyDirty =
    privacy.showGuruName !== savedPrivacy.showGuruName ||
    privacy.showIskconCenter !== savedPrivacy.showIskconCenter ||
    privacy.showLastSeen !== savedPrivacy.showLastSeen ||
    privacy.messagingPrivacy !== savedPrivacy.messagingPrivacy ||
    privacy.profileVisibility !== savedPrivacy.profileVisibility ||
    privacy.requestsFrom !== savedPrivacy.requestsFrom;

  /* ----- Notifications ----- */
  const [pushState, setPushState] = useState<PushState>(() => getPushState());
  const [pushBusy, setPushBusy] = useState(false);
  const togglePush = async () => {
    if (!user) return;
    setPushBusy(true);
    if (pushState === 'granted') {
      await disablePush(user.uid);
      showInfo('Notifications turned off on this device');
      setPushState('default');
    } else {
      const res = await enablePush(user.uid);
      setPushState(getPushState());
      if (res.ok) showSuccess('Notifications are on');
      else showWarning('Could not turn on notifications', res.reason || 'Please allow notifications in your browser settings.');
    }
    setPushBusy(false);
  };
  const setNotifyPref = async (key: 'notifyMessages' | 'notifyRequests' | 'notifyFestivals', v: boolean) => {
    setSettings((prev) => (prev ? { ...prev, [key]: v } : prev));
    await updateUserSettings({ [key]: v });
  };

  /* ----- Blocked devotees ----- */
  const [blocked, setBlocked] = useState<{ uid: string; name: string }[]>([]);
  useEffect(() => {
    if (!user || isGuest) return;
    return listenBlocked(user.uid, async (ids) => {
      const named = await Promise.all(ids.map(async (uid) => ({ uid, name: (await getPublicProfile(uid))?.userName || 'Devotee' })));
      setBlocked(named);
    });
  }, [user, isGuest]);

  /* ----- Profile ----- */

  const handleEdit = () => {
    setEditedSettings({ ...settings! });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editedSettings && user) {
      const ok = await ask({
        title: 'Save your profile?',
        message: 'Other devotees will see your new name, guide and temple.',
        confirmLabel: 'Save',
      });
      if (!ok) return;
      try {
        setSaveStatus('saving');
        // Optimistic update via context - instant UI, background sync
        await updateUserSettings({
          userName: editedSettings.userName,
          guruName: editedSettings.guruName,
          iskconCenter: editedSettings.iskconCenter,
          gender: editedSettings.gender,
          city: editedSettings.city || '',
          sankalpa: editedSettings.sankalpa || '',
          seeking: editedSettings.seeking || [],
          referralSource: editedSettings.referralSource || '',
          referredBy: editedSettings.referredBy || '',
        });
        if (editedSettings.gender) updateUserProfile(user.uid, { gender: editedSettings.gender }).catch(() => undefined);
        setSettings(editedSettings);
        setSaveStatus('saved');
        setIsEditing(false);
        // Notify other components to refresh
        window.dispatchEvent(new CustomEvent('userDataUpdated'));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Error saving settings:', error);
        showError('Could not save your profile', 'Please try again.');
        setSaveStatus('idle');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedSettings(null);
    setIsEditing(false);
  };

  /* ----- Privacy ----- */

  const handleSavePrivacy = async () => {
    if (!user) return;
    const ok = await ask({
      title: 'Change who can see you?',
      message: 'Your privacy choices will update for everyone in the community.',
      confirmLabel: 'Yes, update',
    });
    if (!ok) return;
    try {
      setPrivacySaving(true);
      await updateUserSettings(privacy);
      setSettings({ ...settings!, ...privacy });
      showSuccess('Privacy updated', 'Your public profile now follows these choices.');
      setPrivacySaving(false);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      showError('Could not save privacy settings', 'Please try again.');
      setPrivacySaving(false);
    }
  };

  /* ----- App ----- */

  const handleInstallClick = async () => {
    if (!window.deferredPrompt) {
      showInfo('Install this app', 'iPhone: tap Share, then Add to Home Screen. Android: open the browser menu, then Install app.');
      return;
    }
    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallButton(false);
    window.deferredPrompt = null;
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          // Wait a bit for the update check to complete
          setTimeout(() => {
            if (registration.waiting) {
              setUpdateAvailable(true);
              ask({ title: 'A new version is ready', message: 'The app will reload to update.', confirmLabel: 'Update now' }).then((yes) => {
                if (!yes) return;
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              });
            } else {
              showSuccess('You are on the latest version', `Version ${versionData.version} · ${versionData.buildDate}`);
            }
            setCheckingUpdate(false);
          }, 2000);
        } else {
          showInfo('Running in browser mode', `Version ${versionData.version}. Install the app for automatic updates.`);
          setCheckingUpdate(false);
        }
      } else {
        showInfo('Updates are automatic in browser mode', `Version ${versionData.version}. Refresh the page to get the latest.`);
        setCheckingUpdate(false);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      showError('Could not check for updates', 'Please try again.');
      setCheckingUpdate(false);
    }
  };

  /* ----- Data ----- */

  const handleExportData = () => {
    if (!user) return;
    try {
      const userData = {
        exportDate: new Date().toISOString(),
        userId: user.uid,
        email: user.email,
        settings: settings,
        note: 'This is your complete Sadhana Tracker data export. You have full ownership of this data.',
      };
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sadhana-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      showError('Could not export your data', 'Please try again.');
    }
  };

  const handleClearMyData = async () => {
    if (!user || isGuest) {
      showWarning('Guests cannot clear data', 'Please sign in with Google first.');
      return;
    }

    const confirmed = await ask({
      title: 'Delete all your data?',
      message:
        'This removes your entries, journal, settings, chats, connections and questions. It cannot be undone. Your account stays active.',
      confirmLabel: 'Delete my data',
      danger: true,
      requireText: 'DELETE',
    });
    if (!confirmed) return;

    try {
      setClearDataStatus('clearing');
      await deleteUserData(user.uid);

      // Clear app keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sl_')) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      setClearDataStatus('success');
      showSuccess('All your data has been deleted', 'The page will now reload.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error clearing user data:', error);
      setClearDataStatus('error');
      showError('Could not clear your data', 'Please try again or contact support.');
      setTimeout(() => setClearDataStatus('idle'), 3000);
    }
  };

  const handleDeleteMyAccount = async () => {
    if (!user || isGuest) {
      showWarning('Guest accounts cannot be deleted', 'Please sign in with Google first.');
      return;
    }

    const confirmed = await ask({
      title: 'Delete your account?',
      message: 'Your account and everything in it will be removed for good. You would need a new account to use the app again.',
      confirmLabel: 'Delete account',
      danger: true,
      requireText: user.email || 'DELETE',
    });
    if (!confirmed) return;

    try {
      setDeleteAccountStatus('deleting');
      await deleteUserData(user.uid);
      localStorage.clear();
      setDeleteAccountStatus('success');
      showSuccess('Your account has been deleted', 'You will now be signed out.');
      setTimeout(async () => {
        await signOut(auth);
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteAccountStatus('error');
      showError('Could not delete your account', 'Please try again or contact support.');
      setTimeout(() => setDeleteAccountStatus('idle'), 3000);
    }
  };

  const handleClearAllChats = async () => {
    if (!isAdmin) {
      showWarning('Access denied', 'Only the admin can do this.');
      return;
    }
    const ok = await ask({
      title: 'Delete all chats for everyone?',
      message: 'Every message and conversation of every user will be removed. This cannot be undone.',
      confirmLabel: 'Delete all chats',
      danger: true,
      requireText: 'DELETE',
    });
    if (!ok) return;

    try {
      setClearChatsStatus('clearing');
      await clearAllChats();
      setClearChatsStatus('success');
      showSuccess('All chats have been deleted');
      setTimeout(() => setClearChatsStatus('idle'), 3000);
    } catch (error) {
      console.error('Error clearing chats:', error);
      setClearChatsStatus('error');
      showError('Could not clear chats', 'Check the console for details.');
      setTimeout(() => setClearChatsStatus('idle'), 3000);
    }
  };

  /* ----- Account ----- */

  const handleSignOut = async () => {
    const ok = await ask({
      title: isGuest ? 'Leave guest mode?' : 'Sign out?',
      message: isGuest ? 'What you did as a guest stays only on this device.' : 'You can sign back in any time.',
      confirmLabel: isGuest ? 'Leave' : 'Sign out',
    });
    if (!ok) return;
    await logout();
    navigate('/login');
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in failed:', error);
      showError('Sign in failed', 'Please try again.');
    }
  };

  if (!settings) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner message="Loading settings..." size="md" />
      </div>
    );
  }

  const displayName = settings.userName || user?.displayName || 'Devotee';
  const genderLabel = settings.gender === 'male' ? 'Prabhuji' : settings.gender === 'female' ? 'Mataji' : '';
  const profileLine = [genderLabel, settings.iskconCenter].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto w-full max-w-2xl animate-rise-in space-y-6 pb-10">
      {/* Profile card */}
      <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-sandal-200 sm:p-5">
        <div className="flex items-center gap-4">
          <Avatar gender={settings?.gender} name={displayName} className="h-16 w-16 shrink-0 ring-4 ring-white shadow-soft" textClassName="text-lg" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-lg font-bold leading-tight text-maroon-900">{displayName}</p>
            {profileLine && <p className="mt-0.5 break-words text-sm text-maroon-900/60">{profileLine}</p>}
            <p className="mt-1 flex items-start gap-1.5 text-xs text-maroon-900/55">
              <Flower2 size={13} className="mt-0.5 shrink-0 text-marigold-500" />
              <span className="min-w-0 break-words">{settings.guruName ? `Guided by ${settings.guruName}` : 'Spiritual guide not set'}</span>
            </p>
            {user?.email && !isGuest && <p className="mt-1 break-all text-xs text-maroon-900/45">{user.email}</p>}
          </div>
        </div>
        <button type="button" onClick={handleEdit} className="btn-secondary mt-4 h-11 w-full justify-center rounded-xl transition">
          <Pencil size={15} />
          Edit profile
        </button>
      </section>

      {/* My journey — private to the devotee */}
      {!isGuest && (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-emerald-50/40 p-4 shadow-soft ring-1 ring-sandal-200 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-maroon-900">
              <Sparkles size={16} className="text-marigold-500" /> My journey
            </h2>
            <span className="text-[11px] font-medium text-maroon-900/40">Only you can see this</span>
          </div>
          {settings.sankalpa ? (
            <blockquote className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-[15px] italic leading-relaxed text-maroon-900/80 ring-1 ring-amber-200/60">
              “{settings.sankalpa}”
            </blockquote>
          ) : (
            <button type="button" onClick={handleEdit} className="mt-3 w-full rounded-2xl border border-dashed border-amber-300 px-4 py-3 text-left text-sm text-maroon-900/55 hover:bg-white/60">
              Add your sankalpa — who do you wish to become?
            </button>
          )}
          {!!settings.seeking?.length && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-maroon-900/55">
                <Target size={13} /> The change I am seeking
              </p>
              <div className="flex flex-wrap gap-1.5">
                {settings.seeking.map((x) => (
                  <span key={x} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-maroon-900/75 ring-1 ring-sandal-200">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {[
              ['Practising', settings.practiceDuration],
              ['Initiation', settings.initiationStatus],
              ['Daily goal', settings.dailyRoundsGoal ? `${settings.dailyRoundsGoal} rounds` : ''],
              ['City', settings.city],
              ['Came through', [settings.referralSource, settings.referredBy].filter(Boolean).join(' · ')],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-sandal-200/80">
                  <dt className="text-maroon-900/45">{k}</dt>
                  <dd className="truncate font-semibold text-maroon-900">{v}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {/* Edit profile sheet */}
      {isEditing &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Edit profile">
            <div className="absolute inset-0 animate-fadeIn bg-maroon-900/40 backdrop-blur-[2px]" onClick={handleCancelEdit} />
            <div
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
              className="relative max-h-[90dvh] w-full animate-rise-in overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 shadow-lift sm:max-w-md sm:rounded-[28px] sm:px-6"
            >
              <div className="flex items-center gap-3">
                <Avatar gender={editedSettings?.gender ?? settings?.gender} name={editedSettings?.userName || displayName} className="h-12 w-12 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-maroon-900">Edit profile</h3>
                  <p className="text-xs text-maroon-900/55">This is how other devotees see you.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">Your name</span>
                  <input
                    type="text"
                    value={editedSettings?.userName || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings!, userName: e.target.value })}
                    className={fieldCls}
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">Temple or spiritual community</span>
                  <input
                    type="text"
                    value={editedSettings?.iskconCenter || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings!, iskconCenter: e.target.value })}
                    className={fieldCls}
                    placeholder="e.g. Sri Krishna Temple, Bangalore"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">Spiritual guide</span>
                  <input
                    type="text"
                    value={editedSettings?.guruName || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings!, guruName: e.target.value })}
                    className={fieldCls}
                    placeholder="Your diksha or siksha guru"
                  />
                </label>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">Address me as</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as const).map((g) => {
                      const active = editedSettings?.gender === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEditedSettings({ ...editedSettings!, gender: g })}
                          className={`h-11 rounded-xl border px-2 text-sm font-semibold transition ${
                            active ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-sandal-300 bg-white text-maroon-900/70 hover:bg-sandal-50'
                          }`}
                        >
                          {g === 'male' ? 'Prabhuji' : 'Mataji'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-sandal-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-maroon-900/45">My journey · private</p>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">My sankalpa</span>
                  <textarea
                    rows={2}
                    value={editedSettings?.sankalpa || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings!, sankalpa: e.target.value.slice(0, 160) })}
                    className={`${fieldCls} h-auto resize-none py-2.5`}
                    placeholder="Who do you wish to become?"
                  />
                </label>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">The change I am seeking</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SEEKING.map((x) => {
                      const on = !!editedSettings?.seeking?.includes(x);
                      return (
                        <button
                          key={x}
                          type="button"
                          onClick={() =>
                            setEditedSettings({
                              ...editedSettings!,
                              seeking: on ? (editedSettings?.seeking || []).filter((y) => y !== x) : [...(editedSettings?.seeking || []), x],
                            })
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${on ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-maroon-900/65 ring-sandal-300'}`}
                          style={{ minHeight: 0 }}
                        >
                          {x}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">Came through</span>
                    <select
                      value={editedSettings?.referralSource || ''}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, referralSource: e.target.value })}
                      className={fieldCls}
                    >
                      <option value="">—</option>
                      {REFERRAL_SOURCES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">Suggested by</span>
                    <input
                      type="text"
                      value={editedSettings?.referredBy || ''}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, referredBy: e.target.value })}
                      className={fieldCls}
                      placeholder="Name"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-maroon-900/60">City</span>
                  <input type="text" value={editedSettings?.city || ''} onChange={(e) => setEditedSettings({ ...editedSettings!, city: e.target.value })} className={fieldCls} placeholder="Your city" />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={handleCancelEdit} className="btn-secondary w-full justify-center sm:flex-1">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveEdit} disabled={saveStatus === 'saving'} className="btn-primary w-full justify-center sm:flex-1">
                  {saveStatus === 'saving' ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Privacy */}
      {!isGuest && (
        <Section title="Privacy & safety">
          {settings.gender === 'female' && (
            <p className="flex items-start gap-2 bg-emerald-50/70 px-4 py-3 text-xs leading-relaxed text-emerald-900/80">
              <ShieldAlert size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              Mataji, your journal, sadhana and email are never visible to anyone. Below you choose what devotees can see and who can reach you.
            </p>
          )}
          <ChoiceRow icon={Eye} label="Who can find my profile" helper="Devotees outside this group cannot see you in the community">
            <Segmented
              value={privacy.profileVisibility}
              options={[
                ['everyone', 'All devotees'],
                ['same-gender', settings.gender === 'female' ? 'Only Matajis' : 'Only Prabhujis'],
              ]}
              onChange={(v) => setPrivacy({ ...privacy, profileVisibility: v as PrivacyState['profileVisibility'] })}
            />
          </ChoiceRow>
          <ChoiceRow icon={UserPlus} label="Who can send me requests" helper="Connection requests from others are blocked">
            <Segmented
              value={privacy.requestsFrom}
              options={[
                ['everyone', 'Everyone'],
                ['same-gender', settings.gender === 'female' ? 'Matajis' : 'Prabhujis'],
                ['nobody', 'No one'],
              ]}
              onChange={(v) => setPrivacy({ ...privacy, requestsFrom: v as PrivacyState['requestsFrom'] })}
            />
          </ChoiceRow>
          <Row
            icon={Flower2}
            label="Show spiritual guide"
            helper="Let other devotees see your guide"
            right={<Toggle label="Show spiritual guide" checked={privacy.showGuruName} onChange={(v) => setPrivacy({ ...privacy, showGuruName: v })} />}
          />
          <Row
            icon={Building2}
            label="Show temple"
            helper="Let other devotees see your temple"
            right={<Toggle label="Show temple" checked={privacy.showIskconCenter} onChange={(v) => setPrivacy({ ...privacy, showIskconCenter: v })} />}
          />
          <Row
            icon={Clock}
            label="Show last seen"
            helper="Let others see when you were last active"
            right={<Toggle label="Show last seen" checked={privacy.showLastSeen} onChange={(v) => setPrivacy({ ...privacy, showLastSeen: v })} />}
          />
          <ChoiceRow icon={MessageCircle} label="Who can message you" helper="Choose who can start a chat with you">
            <Segmented
              value={privacy.messagingPrivacy}
              options={[
                ['everyone', 'Everyone'],
                ['connections-only', 'Connections'],
              ]}
              onChange={(v) => setPrivacy({ ...privacy, messagingPrivacy: v as PrivacyState['messagingPrivacy'] })}
            />
          </ChoiceRow>
          {privacyDirty && (
            <div className="flex animate-fadeIn flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-brand-50/60 px-4 py-3">
              <p className="text-xs text-maroon-900/70">You have unsaved changes.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPrivacy(savedPrivacy)} className="btn-ghost btn-sm" disabled={privacySaving}>
                  Undo
                </button>
                <button type="button" onClick={handleSavePrivacy} className="btn-primary btn-sm" disabled={privacySaving}>
                  {privacySaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Notifications */}
      {!isGuest && (
        <Section title="Notifications">
          <Row
            icon={Bell}
            label={pushState === 'granted' ? 'Notifications are on' : 'Turn on notifications'}
            helper={
              pushState === 'denied'
                ? 'Blocked in your browser. Allow them in site settings, then come back.'
                : pushState === 'ios-needs-install'
                  ? 'On iPhone, add the app to your Home Screen first.'
                  : pushState === 'unsupported'
                    ? 'This browser does not support notifications.'
                    : 'Messages, requests and festival reminders on this device'
            }
            right={
              pushState === 'denied' || pushState === 'unsupported' || pushState === 'ios-needs-install' ? null : (
                <Toggle label="Notifications" checked={pushState === 'granted'} onChange={() => !pushBusy && togglePush()} />
              )
            }
          />
          {pushState === 'granted' && (
            <>
              <Row icon={MessageCircle} label="New messages" right={<Toggle label="New messages" checked={settings.notifyMessages !== false} onChange={(v) => setNotifyPref('notifyMessages', v)} />} />
              <Row icon={HeartHandshake} label="Connection requests" right={<Toggle label="Connection requests" checked={settings.notifyRequests !== false} onChange={(v) => setNotifyPref('notifyRequests', v)} />} />
              <Row icon={CalendarDays} label="Festivals & Ekadashi" helper="One day before" right={<Toggle label="Festivals" checked={settings.notifyFestivals !== false} onChange={(v) => setNotifyPref('notifyFestivals', v)} />} />
            </>
          )}
        </Section>
      )}

      {!isGuest && blocked.length > 0 && (
        <Section title="Blocked devotees">
          {blocked.map((b) => (
            <Row
              key={b.uid}
              icon={Ban}
              label={b.name}
              right={
                <button type="button" onClick={() => unblockUser(user!.uid, b.uid)} className="btn-secondary btn-sm">
                  Unblock
                </button>
              }
            />
          ))}
        </Section>
      )}

      {/* App */}
      <Section title="App">
        {showInstallButton && <Row icon={Smartphone} label="Install app" helper="Add Sadhana Sang to your home screen" onClick={handleInstallClick} />}
        <Row
          icon={RefreshCw}
          label={updateAvailable ? 'Update available' : 'Check for updates'}
          helper={`Version ${versionData.version} · ${versionData.buildDate}`}
          onClick={handleCheckForUpdates}
          disabled={checkingUpdate}
          right={checkingUpdate ? <RefreshCw size={16} className="shrink-0 animate-spin text-maroon-900/40" /> : undefined}
        />
        <Row icon={Compass} label="App guide" helper="A quick walk through the menu" onClick={startGuide} />
        <Row icon={Mail} label="Contact and feedback" helper="Questions, ideas or privacy requests" href={`mailto:${CONTACT_EMAIL}`} />
      </Section>

      {/* Account */}
      <Section title="Account">
        {isGuest ? (
          <Row icon={LogIn} label="Sign in with Google" helper="Save your progress and join the community" onClick={handleGoogleSignIn} />
        ) : (
          <Row icon={Download} label="Download my data" helper="Save a copy of your settings as a file" onClick={handleExportData} />
        )}
        <Row icon={LogOut} label={isGuest ? 'Leave guest mode' : 'Sign out'} onClick={handleSignOut} />
      </Section>

      {/* Danger zone */}
      {!isGuest && (
        <Section title="Danger zone" danger>
          <Row
            icon={Trash2}
            danger
            label={clearDataStatus === 'clearing' ? 'Clearing data...' : 'Clear all my data'}
            helper="Delete entries, journal, chats and progress. Your account stays."
            onClick={handleClearMyData}
            disabled={clearDataStatus === 'clearing'}
          />
          <Row
            icon={UserX}
            danger
            label={deleteAccountStatus === 'deleting' ? 'Deleting account...' : 'Delete my account'}
            helper="Remove your account and all data forever."
            onClick={handleDeleteMyAccount}
            disabled={deleteAccountStatus === 'deleting'}
          />
          {isAdmin && (
            <Row
              icon={ShieldAlert}
              danger
              label={clearChatsStatus === 'clearing' ? 'Clearing chats...' : 'Clear all chats (admin)'}
              helper="Delete every chat for every user."
              onClick={handleClearAllChats}
              disabled={clearChatsStatus === 'clearing'}
            />
          )}
        </Section>
      )}

      <p className="px-4 text-center text-xs leading-relaxed text-maroon-900/40">
        Your journal, planner, chanting stats and journey are private to you.
        <br />
        Hare Krishna. Sadhana Sang v{versionData.version}
      </p>
      {dialog}
    </div>
  );
};

export default Settings;
