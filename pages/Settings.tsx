import React, { useEffect, useState } from 'react';
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
  Info,
  LogOut,
  LogIn,
  Trash2,
  UserX,
  ShieldAlert,
  ChevronRight,
  Flower2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { clearAllChats } from '../scripts/clearAllChats';
import { useConfirm } from '../components/ConfirmDialog';
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
  'block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-2.5 text-sm text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';

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
  const requestsSnapshot = await get(ref(db, 'connectionRequests'));
  if (requestsSnapshot.exists()) {
    const deletePromises: Promise<void>[] = [];
    requestsSnapshot.forEach((requestSnapshot) => {
      const request = requestSnapshot.val();
      if (request.fromUserId === userId || request.toUserId === userId) {
        deletePromises.push(remove(ref(db, `connectionRequests/${requestSnapshot.key}`)));
      }
    });
    await Promise.all(deletePromises);
  }

  // Chats where user is a participant
  const chatsSnapshot = await get(ref(db, 'chats'));
  if (chatsSnapshot.exists()) {
    const deleteChatPromises: Promise<void>[] = [];
    chatsSnapshot.forEach((chatSnapshot) => {
      const chat = chatSnapshot.val();
      if (chat.participants?.includes(userId)) {
        deleteChatPromises.push(remove(ref(db, `chats/${chatSnapshot.key}`)));
        deleteChatPromises.push(remove(ref(db, `chatMessages/${chatSnapshot.key}`)));
      }
    });
    await Promise.all(deleteChatPromises);
  }

  // Questions posted by user
  const questionsSnapshot = await get(ref(db, 'questions'));
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
  const answersSnapshot = await get(ref(db, 'answers'));
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
    <h2 className={`mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${danger ? 'text-red-600/80' : 'text-maroon-900/50'}`}>
      {title}
    </h2>
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-card divide-y ${
        danger ? 'border-red-100 divide-red-50' : 'border-sandal-200 divide-sandal-100'
      }`}
    >
      {children}
    </div>
  </section>
);

type Tone = 'amber' | 'red';

const IconBox: React.FC<{ icon: React.ElementType; tone?: Tone }> = ({ icon: Icon, tone = 'amber' }) => (
  <span
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
      tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-marigold-400/15 text-brand-700'
    }`}
  >
    <Icon size={18} />
  </span>
);

interface RowProps {
  icon: React.ElementType;
  label: string;
  helper?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: Tone;
  href?: string;
}

const Row: React.FC<RowProps> = ({ icon, label, helper, right, onClick, disabled, tone = 'amber', href }) => {
  const content = (
    <>
      <IconBox icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${tone === 'red' ? 'text-red-700' : 'text-maroon-900'}`}>{label}</span>
        {helper && <span className="mt-0.5 block text-xs leading-snug text-maroon-900/55">{helper}</span>}
      </span>
      {right !== undefined ? right : (onClick || href) && <ChevronRight size={18} className="shrink-0 text-maroon-900/30" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 text-left';
  if (href) {
    return (
      <a href={href} className={`${cls} transition-colors hover:bg-sandal-50`}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${cls} transition-colors hover:bg-sandal-50 disabled:cursor-not-allowed disabled:opacity-50`}
      >
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
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      checked ? 'bg-brand-600' : 'bg-stone-300'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
    />
  </button>
);

/* ---------- Page ---------- */

type PrivacyState = {
  showGuruName: boolean;
  showIskconCenter: boolean;
  showLastSeen: boolean;
  messagingPrivacy: 'everyone' | 'connections-only';
};

const privacyFrom = (s: UserSettings | null): PrivacyState => ({
  showGuruName: s?.showGuruName ?? true,
  showIskconCenter: s?.showIskconCenter ?? true,
  showLastSeen: s?.showLastSeen ?? true,
  messagingPrivacy: s?.messagingPrivacy ?? 'everyone',
});

const Settings: React.FC = () => {
  const { user, logout, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { userSettings: contextSettings, updateUserSettings } = useUserData();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<UserSettings | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyState>(privacyFrom(null));
  const [privacySaving, setPrivacySaving] = useState(false);
  const { ask, dialog } = useConfirm();
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
    privacy.messagingPrivacy !== savedPrivacy.messagingPrivacy;

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
        });
        setSettings(editedSettings);
        setSaveStatus('saved');
        setIsEditing(false);
        // Notify other components to refresh
        window.dispatchEvent(new CustomEvent('userDataUpdated'));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
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
      // Force refresh so the Community page picks up the change
      window.location.reload();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      alert('Failed to save privacy settings. Please try again.');
      setPrivacySaving(false);
    }
  };

  /* ----- App ----- */

  const handleInstallClick = async () => {
    if (!window.deferredPrompt) {
      alert('To install this app:\n\niPhone: tap the Share button, then "Add to Home Screen".\n\nAndroid: open the browser menu, then "Install app" or "Add to Home screen".');
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
              alert(`You are on the latest version.\n\nVersion: ${versionData.version}\nBuild date: ${versionData.buildDate}`);
            }
            setCheckingUpdate(false);
          }, 2000);
        } else {
          alert(`Running in browser mode.\n\nVersion: ${versionData.version}\nInstall the app for automatic updates.`);
          setCheckingUpdate(false);
        }
      } else {
        alert(`Updates are automatic in browser mode.\n\nCurrent version: ${versionData.version}\nRefresh the page to get the latest updates.`);
        setCheckingUpdate(false);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      alert('Failed to check for updates. Please try again.');
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
      alert('Failed to export data. Please try again.');
    }
  };

  const handleClearMyData = async () => {
    if (!user || isGuest) {
      alert('Guest users cannot clear data. Please sign in with Google.');
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
      alert('All your data has been deleted.\n\nThe page will now reload.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error clearing user data:', error);
      setClearDataStatus('error');
      alert('Failed to clear data. Please try again or contact support.');
      setTimeout(() => setClearDataStatus('idle'), 3000);
    }
  };

  const handleDeleteMyAccount = async () => {
    if (!user || isGuest) {
      alert('Guest accounts cannot be deleted. Please sign in with Google.');
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
      alert('Your account has been deleted.\n\nYou will now be signed out.');
      setTimeout(async () => {
        await signOut(auth);
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteAccountStatus('error');
      alert('Failed to delete account. Please try again or contact support.');
      setTimeout(() => setDeleteAccountStatus('idle'), 3000);
    }
  };

  const handleClearAllChats = async () => {
    if (!isAdmin) {
      alert('Access denied. Only the admin can do this.');
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
      alert('All chats have been deleted.');
      setTimeout(() => setClearChatsStatus('idle'), 3000);
    } catch (error) {
      console.error('Error clearing chats:', error);
      setClearChatsStatus('error');
      alert('Failed to clear chats. Check the console for details.');
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
      alert('Sign in failed. Please try again.');
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
    <div className="mx-auto w-full max-w-2xl animate-fadeIn space-y-6 pb-10">

      {/* Profile card */}
      <section className="overflow-hidden rounded-2xl border border-sandal-200 bg-gradient-to-br from-sandal-50 via-white to-brand-50/60 shadow-card">
        {!isEditing ? (
          <div className="flex items-center gap-4 p-4 sm:p-5">
            <Avatar gender={settings?.gender} name={displayName} className="h-16 w-16 ring-4 ring-white shadow-soft" textClassName="text-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-maroon-900">{displayName}</p>
              {profileLine && <p className="truncate text-sm text-maroon-900/60">{profileLine}</p>}
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-maroon-900/50">
                <Flower2 size={13} className="shrink-0 text-marigold-500" />
                <span className="truncate">{settings.guruName ? `Guided by ${settings.guruName}` : 'Spiritual guide not set'}</span>
              </p>
            </div>
            <button type="button" onClick={handleEdit} className="btn-secondary btn-sm shrink-0" aria-label="Edit profile">
              <Pencil size={14} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Avatar gender={editedSettings?.gender ?? settings?.gender} name={editedSettings?.userName || displayName} className="h-12 w-12" />
              <div>
                <p className="text-base font-bold text-maroon-900">Edit profile</p>
                <p className="text-xs text-maroon-900/55">This is how other devotees see you.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-maroon-900/80">Your name</span>
                <input
                  type="text"
                  value={editedSettings?.userName || ''}
                  onChange={(e) => setEditedSettings({ ...editedSettings!, userName: e.target.value })}
                  className={fieldCls}
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-maroon-900/80">ISKCON center or group</span>
                <input
                  type="text"
                  value={editedSettings?.iskconCenter || ''}
                  onChange={(e) => setEditedSettings({ ...editedSettings!, iskconCenter: e.target.value })}
                  className={fieldCls}
                  placeholder="e.g. ISKCON Bangalore"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-maroon-900/80">Spiritual guide</span>
                <input
                  type="text"
                  value={editedSettings?.guruName || ''}
                  onChange={(e) => setEditedSettings({ ...editedSettings!, guruName: e.target.value })}
                  className={fieldCls}
                  placeholder="Your diksha or siksha guru"
                />
              </label>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-maroon-900/80">Address me as</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as const).map((g) => {
                    const active = editedSettings?.gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditedSettings({ ...editedSettings!, gender: g })}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                          active
                            ? 'border-brand-400 bg-brand-50 text-brand-800'
                            : 'border-sandal-300 bg-white text-maroon-900/70 hover:bg-sandal-50'
                        }`}
                      >
                        {g === 'male' ? 'Prabhuji (male)' : 'Mataji (female)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                <X size={16} />
                Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={saveStatus === 'saving'} className="btn-primary">
                <Check size={16} />
                {saveStatus === 'saving' ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Privacy */}
      {!isGuest && (
        <Section title="Privacy">
          <Row
            icon={Flower2}
            label="Show spiritual guide"
            helper="Let other devotees see your guide"
            right={<Toggle label="Show spiritual guide" checked={privacy.showGuruName} onChange={(v) => setPrivacy({ ...privacy, showGuruName: v })} />}
          />
          <Row
            icon={Building2}
            label="Show ISKCON center"
            helper="Let other devotees see your center"
            right={<Toggle label="Show ISKCON center" checked={privacy.showIskconCenter} onChange={(v) => setPrivacy({ ...privacy, showIskconCenter: v })} />}
          />
          <Row
            icon={Clock}
            label="Show last seen"
            helper="Let others see when you were last active"
            right={<Toggle label="Show last seen" checked={privacy.showLastSeen} onChange={(v) => setPrivacy({ ...privacy, showLastSeen: v })} />}
          />
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <IconBox icon={MessageCircle} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-maroon-900">Who can message you</p>
                <p className="mt-0.5 text-xs text-maroon-900/55">Choose who can start a chat with you</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-sandal-100 p-1">
              {([
                ['everyone', 'Everyone'],
                ['connections-only', 'Connections'],
              ] as const).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPrivacy({ ...privacy, messagingPrivacy: value })}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    privacy.messagingPrivacy === value ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/60 hover:text-maroon-900'
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
          {privacyDirty && (
            <div className="flex items-center justify-between gap-3 bg-brand-50/60 px-4 py-3">
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

      {/* App */}
      <Section title="App">
        {showInstallButton && (
          <Row icon={Smartphone} label="Install app" helper="Add Sadhana Sang to your home screen" onClick={handleInstallClick} />
        )}
        <Row
          icon={RefreshCw}
          label={updateAvailable ? 'Update available' : 'Check for updates'}
          helper={`Version ${versionData.version} · ${versionData.buildDate}`}
          onClick={handleCheckForUpdates}
          disabled={checkingUpdate}
          right={
            checkingUpdate ? (
              <RefreshCw size={16} className="shrink-0 animate-spin text-maroon-900/40" />
            ) : undefined
          }
        />
        <Row icon={Mail} label="Contact and feedback" helper="Questions, ideas or privacy requests" href={`mailto:${CONTACT_EMAIL}`} />
        <Row
          icon={Info}
          label="About Sadhana Sang"
          helper="A daily sadhana companion for devotees. Your journal, planner and chanting stats are private to you."
          right={null}
        />
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
            tone="red"
            label={clearDataStatus === 'clearing' ? 'Clearing data...' : 'Clear all my data'}
            helper="Delete entries, journal, chats and progress. Your account stays."
            onClick={handleClearMyData}
            disabled={clearDataStatus === 'clearing'}
          />
          <Row
            icon={UserX}
            tone="red"
            label={deleteAccountStatus === 'deleting' ? 'Deleting account...' : 'Delete my account'}
            helper="Remove your account and all data forever."
            onClick={handleDeleteMyAccount}
            disabled={deleteAccountStatus === 'deleting'}
          />
          {isAdmin && (
            <Row
              icon={ShieldAlert}
              tone="red"
              label={clearChatsStatus === 'clearing' ? 'Clearing chats...' : 'Clear all chats (admin)'}
              helper="Delete every chat for every user."
              onClick={handleClearAllChats}
              disabled={clearChatsStatus === 'clearing'}
            />
          )}
        </Section>
      )}

      <p className="text-center text-xs text-maroon-900/40">Hare Krishna. Sadhana Sang v{versionData.version}</p>
      {dialog}
    </div>
  );
};

export default Settings;
