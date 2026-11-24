import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  MessageSquare,
  MessageCircle,
  Lock,
  Download,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  PenTool,
  Users,
  BookHeart,
  CalendarDays,
} from 'lucide-react';
import { subscribeToUnreadCount } from '../services/chat';
import { UserSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import FeedbackModal from './FeedbackModal';
import NotificationBell from './NotificationBell';
import ConnectionRequestsIcon from './ConnectionRequestsIcon';
import NamaskarGreeting from './NamaskarGreeting';
import BackgroundMusic from './BackgroundMusic';
import Avatar from './Avatar';
import MalaIcon from './MalaIcon';
import { NAV_GROUPS, ACCOUNT_ITEMS, ADMIN_EMAIL, NavItem, getPageMeta } from './navigation';
import { useSyncChatProfile } from '../hooks/useSyncChatProfile';

interface LayoutProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

type ResolvedNavItem = NavItem & { locked: boolean };

const COLLAPSE_KEY = 'ss_sidebar_collapsed';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { userSettings } = useUserData();
  const location = useLocation();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [accountOpen, setAccountOpen] = useState<null | 'sidebar' | 'drawer' | 'topbar'>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [canInstall, setCanInstall] = useState(false);
  const sidebarAccountRef = useRef<HTMLDivElement>(null);
  const drawerAccountRef = useRef<HTMLDivElement>(null);
  const topAccountRef = useRef<HTMLDivElement>(null);

  useSyncChatProfile();

  useEffect(() => {
    if (userSettings) setSettings(userSettings);
  }, [userSettings]);

  // Unread messages — live listener (no polling)
  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    return subscribeToUnreadCount(user.uid, setUnreadCount);
  }, [user]);

  // PWA install availability
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.deferredPrompt) setCanInstall(true);
    const handler = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Close overlays on navigation
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(null);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Close account menu on outside click
  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if ([sidebarAccountRef, drawerAccountRef, topAccountRef].some((r) => r.current?.contains(t))) return;
      setAccountOpen(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  // Lock body scroll when the drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });

  const handleInstall = async () => {
    setAccountOpen(null);
    if (!window.deferredPrompt) {
      alert('To install this app:\n\niOS: Tap Share, then "Add to Home Screen"\n\nAndroid: Tap menu (⋮), then "Install app"');
      return;
    }
    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    if (outcome === 'accepted') setCanInstall(false);
    window.deferredPrompt = null;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isGuest = user?.uid === 'guest';
  const isAdmin = user?.email === ADMIN_EMAIL;

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        title: g.title,
        items: g.items
          .filter((i) => !i.adminOnly || isAdmin)
          .map((i) => ({ ...i, locked: isGuest && !i.guestAllowed })) as ResolvedNavItem[],
      })).filter((g) => g.items.some((i) => !i.hidden)),
    [isGuest, isAdmin]
  );

  if (!user) return <>{children}</>;

  const plainName = settings?.userName || user.displayName || 'Devotee';
  const displayName = plainName;
  const subtitle = isGuest ? 'Guest mode' : settings?.iskconCenter || user.email || '';
  const { title: pageTitle, section: pageSection } = getPageMeta(location.pathname);
  const isChatRoute = location.pathname.startsWith('/chat/');

  /* ------------------------------------------------------------------ */
  /* Account menu (sidebar footer, drawer footer, mobile top bar)       */
  /* ------------------------------------------------------------------ */
  const renderAccountMenu = (placement: 'up' | 'down') => (
    <div
      className={`absolute z-50 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(67,27,17,0.35)] ring-1 ring-sandal-300/70 animate-scale-in ${
        placement === 'up' ? 'inset-x-0 bottom-full mb-2' : 'right-0 top-full mt-2 w-64'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-sandal-200 px-4 py-3.5">
        <Avatar gender={settings?.gender} name={plainName} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-maroon-900">{displayName}</p>
          <p className="truncate text-xs text-maroon-900/50">{isGuest ? 'Guest mode' : user.email}</p>
        </div>
      </div>
      <div className="p-1.5">
        {ACCOUNT_ITEMS.map((item) => (
          <button key={item.to} onClick={() => navigate(item.to)} className="menu-row lg:hidden">
            <item.icon size={16} className="text-maroon-900/40" /> {item.label}
          </button>
        ))}
        <button
          onClick={() => {
            setAccountOpen(null);
            setMobileOpen(false);
            setShowFeedback(true);
          }}
          className="menu-row"
        >
          <MessageSquare size={16} className="text-maroon-900/40" /> Send feedback
        </button>
        {canInstall && (
          <button onClick={handleInstall} className="menu-row">
            <Download size={16} className="text-maroon-900/40" /> Install app
          </button>
        )}
      </div>
      <div className="border-t border-sandal-200 p-1.5">
        <button onClick={handleLogout} className="menu-row text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <LogOut size={16} /> {isGuest ? 'Exit guest mode' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* Sidebar                                                             */
  /* ------------------------------------------------------------------ */
  const renderNavItem = (item: ResolvedNavItem, compact: boolean) => {
    const badge = item.to === '/chats' && unreadCount > 0 ? unreadCount : 0;

    if (item.locked) {
      return (
        <div
          key={item.to}
          title={`${item.label} — sign in to unlock`}
          className={`flex h-10 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-maroon-900/30 ${compact ? 'justify-center' : ''}`}
        >
          <item.icon size={18} className="shrink-0" />
          {!compact && (
            <>
              <span className="truncate">{item.label}</span>
              <Lock size={12} className="ml-auto shrink-0" />
            </>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        title={compact ? item.label : undefined}
        className={({ isActive }) =>
          `group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-all duration-200 ${
            compact ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-gradient-to-r from-amber-100 to-amber-50 font-semibold text-brand-800'
              : 'text-maroon-900/60 hover:bg-sandal-200/50 hover:text-maroon-900'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <item.icon
              size={18}
              className={`shrink-0 transition-colors ${isActive ? 'text-brand-700' : 'text-maroon-900/40 group-hover:text-maroon-900/70'}`}
            />
            {!compact && <span className="truncate">{item.label}</span>}
            {badge > 0 ? (
              compact ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-sandal-50" />
              ) : (
                <span className="count-badge ml-auto">{badge > 99 ? '99+' : badge}</span>
              )
            ) : null}
          </>
        )}
      </NavLink>
    );
  };

  const renderSidebar = (compact: boolean, isMobile: boolean) => {
    const menuKey = isMobile ? 'drawer' : 'sidebar';
    return (
      <div className="flex h-full flex-col">
        {/* Brand — aligned with the top bar */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-sandal-200/70 sm:h-[72px] ${
            compact ? 'justify-center px-2' : 'justify-between pl-6 pr-3'
          }`}
        >
          <NavLink
            to="/"
            title="Home"
            className="group flex items-center gap-2.5"
            style={{ minHeight: 0 }}
          >
            {compact ? (
              <span className="text-[15px] font-semibold tracking-tight text-maroon-900">SS</span>
            ) : (
              <span className="text-[19px] font-semibold tracking-tight text-maroon-900 transition-colors group-hover:text-brand-700">
                Sadhana Sang
              </span>
            )}
          </NavLink>
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="sidebar-icon-btn" aria-label="Close menu">
              <X size={19} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2 scrollbar-none" aria-label="Main">
          {groups.map((group, gi) => {
            const visible = group.items.filter((i) => !i.hidden);
            return (
              <div key={group.title || gi} className={gi === 0 ? 'mt-3' : 'mt-6'}>
                {group.title &&
                  (compact ? (
                    <div className="mx-auto mb-2 h-px w-6 bg-sandal-300" />
                  ) : (
                    <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-maroon-900/35">{group.title}</p>
                  ))}
                <div className="space-y-0.5">{visible.map((item) => renderNavItem(item, compact))}</div>
              </div>
            );
          })}
        </nav>

        {/* Pinned: Settings & About */}
        <div className={`shrink-0 space-y-0.5 border-t border-sandal-200/70 px-3 py-2`}>
          {ACCOUNT_ITEMS.map((item) => renderNavItem({ ...item, locked: false }, compact))}
        </div>

        {/* Footer — profile card with account menu */}
        <div className={`shrink-0 border-t border-sandal-200/80 p-3 ${compact ? 'space-y-2' : 'flex items-center gap-1.5'}`}>
          <div className={`relative ${compact ? '' : 'min-w-0 flex-1'}`} ref={isMobile ? drawerAccountRef : sidebarAccountRef}>
            <button
              onClick={() => setAccountOpen((o) => (o === menuKey ? null : menuKey))}
              className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/80 hover:shadow-[0_1px_3px_rgba(67,27,17,0.08)] ${
                accountOpen === menuKey ? 'bg-white shadow-[0_1px_3px_rgba(67,27,17,0.08)]' : ''
              } ${compact ? 'justify-center' : ''}`}
              aria-label="Account menu"
              title={compact ? displayName : undefined}
            >
              <Avatar gender={settings?.gender} name={plainName} className="h-9 w-9" />
              {!compact && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-maroon-900">{displayName}</span>
                    <span className="block truncate text-[11px] text-maroon-900/45">{subtitle}</span>
                  </span>
                  <ChevronsUpDown size={15} className="shrink-0 text-maroon-900/35" />
                </>
              )}
            </button>
            {accountOpen === menuKey && renderAccountMenu('up')}
          </div>
          {!isMobile && (
            <button
              onClick={toggleCollapsed}
              className={`sidebar-icon-btn h-9 w-9 ${compact ? 'mx-auto flex' : ''}`}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Mobile bottom bar                                                   */
  /* ------------------------------------------------------------------ */
  const isTabActive = (to: string, match?: string[]) =>
    match ? match.some((m) => location.pathname.startsWith(m)) : to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const renderBottomTab = (to: string, label: string, Icon: React.ComponentType<any>, match?: string[], dot?: boolean) => {
    const active = isTabActive(to, match);
    return (
      <button
        key={to}
        onClick={() => navigate(to)}
        className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
          active ? 'text-brand-700' : 'text-maroon-900/45'
        }`}
        style={{ minHeight: 0 }}
        aria-current={active ? 'page' : undefined}
      >
        <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ${active ? 'bg-brand-100/70' : ''}`}>
          <Icon size={20} strokeWidth={active ? 2.3 : 2} />
        </span>
        {label}
        {dot && <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-sandal-50" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-sandal-100/70">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-sandal-200/80 bg-sandal-50 transition-[width] duration-200 lg:block ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {renderSidebar(collapsed, false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-maroon-900/30 backdrop-blur-[2px] animate-fadeIn" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[84%] max-w-[300px] bg-sandal-50 shadow-2xl animate-slide-in-left">
            {renderSidebar(false, true)}
          </aside>
        </div>
      )}

      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <header className={`sticky top-0 z-30 border-b border-sandal-200/70 bg-sandal-100/80 backdrop-blur-xl ${isChatRoute ? 'hidden' : ''}`}>
          <div className="flex h-16 items-center gap-2 px-3 sm:h-[72px] sm:px-6 lg:px-8">
            <button onClick={() => setMobileOpen(true)} className="header-icon-btn lg:hidden" aria-label="Open menu">
              <Menu size={20} />
            </button>

            <div className="min-w-0 flex-1 pl-1 lg:pl-0">
              {pageSection && (
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700/70 sm:block">{pageSection}</p>
              )}
              <h1 className="truncate text-lg font-semibold leading-tight text-maroon-900 sm:text-xl">{pageTitle}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 rounded-2xl bg-sandal-50/80 p-1 ring-1 ring-sandal-200/80">
              <BackgroundMusic />
              {!isGuest && (
                <>
                  <span className="mx-0.5 hidden h-5 w-px bg-sandal-300/80 sm:block" />
                  <ConnectionRequestsIcon />
                  <NotificationBell />
                  <button
                    onClick={() => navigate('/chats')}
                    className="header-icon-btn hidden lg:inline-flex"
                    aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : 'Messages'}
                    title="Messages"
                  >
                    <MessageCircle size={19} />
                    {unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-sandal-50">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {/* Avatar → account menu on mobile/tablet (desktop uses the sidebar footer) */}
              <div className="relative lg:hidden" ref={topAccountRef}>
                <button
                  onClick={() => setAccountOpen((o) => (o === 'topbar' ? null : 'topbar'))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white"
                  aria-label="Account menu"
                  style={{ minHeight: 0 }}
                >
                  <Avatar gender={settings?.gender} name={plainName} className="h-8 w-8" textClassName="text-xs" />
                </button>
                {accountOpen === 'topbar' && renderAccountMenu('down')}
              </div>
            </div>
          </div>

          {isGuest && (
            <div className="flex items-center gap-3 border-t border-brand-100 bg-brand-50/70 px-4 py-2 text-sm sm:px-6">
              <Lock size={14} className="shrink-0 text-brand-700" />
              <p className="flex-1 text-maroon-800">
                <span className="font-semibold">Guest mode</span>
                <span className="hidden sm:inline"> · Sign in to unlock Journal and Sangha.</span>
              </p>
              <button onClick={handleLogout} className="btn-primary btn-sm">
                Sign in
              </button>
            </div>
          )}
        </header>

        <NamaskarGreeting />

        <main className={`flex-1 ${isChatRoute ? '' : 'pb-28 lg:pb-10'}`}>
          <div key={location.pathname} className={`mx-auto w-full max-w-7xl animate-fadeIn ${isChatRoute ? 'p-0 sm:p-4' : 'px-4 py-5 sm:px-6 sm:py-8'}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom bar */}
      {!isChatRoute && (
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sandal-200 bg-sandal-50/95 shadow-[0_-8px_24px_-12px_rgba(67,27,17,0.18)] backdrop-blur-xl lg:hidden"
          aria-label="Quick navigation"
        >
          <div className="grid h-16 grid-cols-5">
            {renderBottomTab('/', 'Home', Home)}
            {renderBottomTab('/planner', 'Planner', PenTool)}
            {renderBottomTab('/chanting', 'Japa', MalaIcon)}
            {renderBottomTab('/slokas', 'Mantras', BookHeart, isGuest ? ['/slokas'] : ['/slokas', '/festivals', '/festival/', '/ekadashi/'])}
            {isGuest
              ? renderBottomTab('/festivals', 'Calendar', CalendarDays, ['/festivals', '/festival/', '/ekadashi/'])
              : renderBottomTab('/chats', 'Messages', MessageCircle, ['/chats', '/chat/'], unreadCount > 0)}
          </div>
        </nav>
      )}


      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
};

export default Layout;
