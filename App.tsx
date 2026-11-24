import React, { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import OnboardingModal from './components/OnboardingModal';
import GenderSelectionModal from './components/GenderSelectionModal';
import NamaskarGreeting from './components/NamaskarGreeting';
import { startGuide } from './components/AppGuide';
import FeedbackPrompt from './components/FeedbackPrompt';
import LoadingScreen, { PageLoader } from './components/LoadingScreen';
import VersionChecker from './components/VersionChecker';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserDataProvider, useUserData } from './contexts/UserDataContext';
import { ToastProvider } from './contexts/ToastContext';
import { getSettings, saveSettings, cleanupFakeSeedData } from './services/storage';
import { createUserProfile, setUserOnlineStatus, getUserProfile, updateUserProfile } from './services/chat';
import { ref, get, set } from 'firebase/database';
import { db } from './services/firebase';
import { checkForUpdates, markVersionSeen, VERSION_HISTORY } from './utils/version';
import { X, Sparkles } from 'lucide-react';
// Lazy load heavy pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DailyPlanner = lazy(() => import('./pages/DailyPlanner'));
const Settings = lazy(() => import('./pages/Settings'));
const About = lazy(() => import('./pages/About'));
const DevotionalJournal = lazy(() => import('./pages/DevotionalJournal'));
const Community = lazy(() => import('./pages/Community'));
const ChatsList = lazy(() => import('./pages/ChatsList'));
const ChatWindow = lazy(() => import('./pages/ChatWindow'));
const QuestionsPage = lazy(() => import('./pages/QuestionsPage'));
const AskQuestionPage = lazy(() => import('./pages/AskQuestionPage'));
const QuestionDetailPage = lazy(() => import('./pages/QuestionDetailPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ChantingCounter = lazy(() => import('./pages/ChantingCounter'));
const SlokasLibrary = lazy(() => import('./pages/SlokasLibrary'));
const FestivalsPage = lazy(() => import('./pages/FestivalsPage'));
const FestivalDetailPage = lazy(() => import('./pages/FestivalDetailPage'));
const EkadashiDetailPage = lazy(() => import('./pages/EkadashiDetailPage'));
const ConnectionRequests = lazy(() => import('./pages/ConnectionRequests'));

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Catch-all redirect based on auth status
const DefaultRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // If logged in, go to dashboard; otherwise go to login
  return <Navigate to={user ? "/" : "/login"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <UserDataProvider>
        <ToastProvider>
          <LanguageProvider>
            <HashRouter>
              <AppContent />
            </HashRouter>
          </LanguageProvider>
        </ToastProvider>
      </UserDataProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGenderSelection, setShowGenderSelection] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const [onboardingUserName, setOnboardingUserName] = useState('');
  const [onboardingPrefill, setOnboardingPrefill] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showVersionUpdate, setShowVersionUpdate] = useState(false);
  const [versionInfo, setVersionInfo] = useState<any>(null);

  // Check for version updates
  useEffect(() => {
    if (user) {
      const updateInfo = checkForUpdates();
      // "What's new" popup is intentionally not shown — just record the version as seen.
      if (updateInfo.hasUpdate) markVersionSeen();
    }
  }, [user]);
  // CRITICAL: Clear localStorage immediately for authenticated users
  useEffect(() => {
    if (user && user.uid !== 'guest') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sl_')) {
          keysToRemove.push(key);
        }
      }
      if (keysToRemove.length > 0) {
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 [App.tsx] Cleared ${keysToRemove.length} localStorage items for authenticated user ${user.uid}`);
      }
    }
  }, [user]);

  useEffect(() => {
    const checkFirstTime = async () => {
      if (user && user.uid !== 'guest') {
        // AUTOMATIC CLEANUP: Remove fake seed data from old version
        const removedCount = await cleanupFakeSeedData(user.uid);
        if (removedCount > 0) {
          console.log(`✅ Automatically removed ${removedCount} fake entries`);
        }

        const settings = await getSettings(user.uid);

        // Check if user needs to select gender (existing users without gender)
        if (!settings.isFirstTime && !settings.gender) {
          setShowGenderSelection(true);
        } else if (settings.isFirstTime) {
          setOnboardingPrefill(settings.userName || user.displayName || '');
          setShowOnboarding(true);
        }

        // ONCE-PER-DAY CHECK: Check if user should see feedback prompt
        checkFeedbackEligibility(user.uid, settings);
      }
    };
    checkFirstTime();
  }, [user]);

  // Feedback prompt: at most once every 30 days, counted from when it was last
  // SHOWN — so closing it (or refreshing) never brings it back early.
  const FEEDBACK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
  const feedbackChecked = React.useRef<string | null>(null);

  const checkFeedbackEligibility = async (userId: string, _settings: any) => {
    if (feedbackChecked.current === userId) return; // avoid double-run (StrictMode / re-renders)
    feedbackChecked.current = userId;

    const localKey = `ss_feedback_prompted_${userId}`;
    const now = Date.now();
    try {
      const localTs = Number(localStorage.getItem(localKey) || 0);
      if (now - localTs < FEEDBACK_INTERVAL_MS) return;
    } catch {
      /* storage unavailable — fall back to the database */
    }

    try {
      const [shownSnap, submittedSnap, dismissedSnap] = await Promise.all([
        get(ref(db, `users/${userId}/feedbackPrompt/lastShown`)),
        get(ref(db, `users/${userId}/lastFeedback/timestamp`)),
        get(ref(db, `users/${userId}/lastFeedbackDismissed/timestamp`)),
      ]);
      const lastTouch = Math.max(
        Number(shownSnap.val()) || 0,
        Number(submittedSnap.val()) || 0,
        Number(dismissedSnap.val()) || 0
      );
      if (now - lastTouch < FEEDBACK_INTERVAL_MS) {
        try { localStorage.setItem(localKey, String(lastTouch)); } catch { /* ignore */ }
        return;
      }

      // Give new devotees a couple of days before asking
      const createdAt = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : now;
      if (now - createdAt < 2 * 24 * 60 * 60 * 1000) return;

      setTimeout(async () => {
        setShowFeedback(true);
        try { localStorage.setItem(localKey, String(Date.now())); } catch { /* ignore */ }
        try {
          await set(ref(db, `users/${userId}/feedbackPrompt/lastShown`), Date.now());
        } catch (err) {
          console.warn('Could not record feedback prompt time:', err);
        }
      }, 8000);
    } catch (error) {
      console.error('Error checking feedback eligibility:', error);
    }
  };

  const handleOnboardingComplete = async (data: { userName: string; gender: 'male' | 'female'; guruName: string; iskconCenter: string }) => {
    if (user) {
      const settings = await getSettings(user.uid);
      await saveSettings(user.uid, {
        ...settings,
        userName: data.userName,
        gender: data.gender,
        guruName: data.guruName,
        iskconCenter: data.iskconCenter,
        language: 'en', // Default to English
        isFirstTime: false,
        tourCompleted: false, // Enable tour for new users
      });

      // Create user profile for chat system
      try {
        const existingProfile = await getUserProfile(user.uid);
        if (!existingProfile) {
          await createUserProfile(user.uid, {
            userName: data.userName,
            guruName: data.guruName,
            iskconCenter: data.iskconCenter,
            photoURL: user.photoURL || undefined,
            gender: data.gender,
          });
        }
      } catch (error) {
        console.error('Error creating user profile:', error);
      }

      setShowOnboarding(false);
      setOnboardingUserName(data.userName);
      setShowFeatureTour(true);

      // SMART UPDATE: Trigger context refresh
      console.log('✅ Onboarding complete - showing feature tour');
      window.dispatchEvent(new CustomEvent('userDataUpdated'));
    }
  };

  const handleGenderSelection = async (gender: 'male' | 'female') => {
    if (user) {
      const settings = await getSettings(user.uid);
      await saveSettings(user.uid, {
        ...settings,
        gender: gender,
      });

      setShowGenderSelection(false);
      updateUserProfile(user.uid, { gender }).catch(() => undefined);

      // SMART UPDATE: Trigger context refresh
      console.log('✅ Gender updated - updating app state');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('userDataUpdated'));
      }, 300);
    }
  };

  // Show loading screen while authentication is being checked
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Version Checker - Always active, checks every 60 seconds */}
      <VersionChecker />
      
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/planner" element={<PrivateRoute><DailyPlanner /></PrivateRoute>} />
            <Route path="/journal" element={<PrivateRoute><DevotionalJournal /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/about" element={<PrivateRoute><About /></PrivateRoute>} />
            <Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>} />
            <Route path="/connection-requests" element={<PrivateRoute><ConnectionRequests /></PrivateRoute>} />
            <Route path="/chats" element={<PrivateRoute><ChatsList /></PrivateRoute>} />
            <Route path="/chat/:chatId" element={<PrivateRoute><ChatWindow /></PrivateRoute>} />
            <Route path="/questions" element={<PrivateRoute><QuestionsPage /></PrivateRoute>} />
            <Route path="/questions/ask" element={<PrivateRoute><AskQuestionPage /></PrivateRoute>} />
            <Route path="/questions/:questionId" element={<PrivateRoute><QuestionDetailPage /></PrivateRoute>} />
            <Route path="/chanting" element={<PrivateRoute><ChantingCounter /></PrivateRoute>} />
            <Route path="/slokas" element={<PrivateRoute><SlokasLibrary /></PrivateRoute>} />
            <Route path="/festivals" element={<PrivateRoute><FestivalsPage /></PrivateRoute>} />
            <Route path="/festival/:festivalId" element={<PrivateRoute><FestivalDetailPage /></PrivateRoute>} />
            <Route path="/ekadashi/:slug" element={<PrivateRoute><EkadashiDetailPage /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />

            {/* Catch-all: redirect to dashboard if logged in, login if not */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </Suspense>
      </Layout>

      <OnboardingModal isOpen={showOnboarding} onComplete={handleOnboardingComplete} prefillName={onboardingPrefill || user?.displayName || ''} />
      <GenderSelectionModal isOpen={showGenderSelection} onComplete={handleGenderSelection} />
      <NamaskarGreeting
        open={showFeatureTour}
        name={onboardingUserName}
        onClose={() => {
          setShowFeatureTour(false);
          startGuide();
        }}
      />

      {/* Feedback Prompt - Shows after 2+ days */}
      {showFeedback && <FeedbackPrompt onClose={() => setShowFeedback(false)} />}


      {/* Version Update Modal */}
      {showVersionUpdate && versionInfo && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm animate-fadeIn"
            onClick={() => { markVersionSeen(); setShowVersionUpdate(false); }}
          />
          <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-scale-in sm:rounded-3xl">
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-amber-600 px-6 pb-6 pt-7 text-white">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <button
                onClick={() => { markVersionSeen(); setShowVersionUpdate(false); }}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles size={13} /> What's new
              </span>
              <h2 className="mt-3 text-2xl font-bold text-white">Version {versionInfo.latestVersion}</h2>
              <p className="mt-1 text-sm text-white/80">Here's what we've improved for your sadhana.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <ul className="space-y-2.5">
                {versionInfo.latestFeatures.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <details className="group mt-6 rounded-xl border border-stone-200">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-stone-700 hover:text-brand-700">
                  Full version history
                </summary>
                <div className="space-y-4 border-t border-stone-100 px-4 py-4">
                  {VERSION_HISTORY.slice(1).map((version) => {
                    const isUserAdmin = user?.email === 'jashwanthjavili7@gmail.com';
                    const filteredFeatures = version.features.filter((feature) => {
                      if (isUserAdmin) return true;
                      const f = feature.toLowerCase();
                      return !['admin', 'permission', 'security', 'database', 'rule', 'deploy', 'backend'].some((w) => f.includes(w));
                    });
                    if (filteredFeatures.length === 0) return null;
                    return (
                      <div key={version.version} className="border-l-2 border-stone-200 pl-3">
                        <p className="text-sm font-semibold text-stone-800">
                          v{version.version} <span className="font-normal text-stone-400">· {version.date}</span>
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-stone-600">
                          {filteredFeatures.map((feature, idx) => (
                            <li key={idx}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>

            <div className="border-t border-stone-100 p-4 sm:px-6">
              <button
                onClick={() => { markVersionSeen(); setShowVersionUpdate(false); }}
                className="btn-primary btn-lg w-full"
              >
                Got it, thanks 🙏
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;