import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, CalendarDays, Music2, UserPlus, Megaphone, X, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserNotification,
} from '../services/notifications';

const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const iconFor = (n: UserNotification) => {
  if (n.type === 'connection_request') return { Icon: UserPlus, tone: 'bg-sky-50 text-sky-600' };
  if (n.type === 'broadcast') return { Icon: Megaphone, tone: 'bg-brand-50 text-brand-600' };
  if (n.type.endsWith('approved')) return { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' };
  if (n.type.endsWith('rejected')) return { Icon: XCircle, tone: 'bg-rose-50 text-rose-600' };
  if (n.type.includes('festival')) return { Icon: CalendarDays, tone: 'bg-indigo-50 text-indigo-600' };
  return { Icon: Music2, tone: 'bg-violet-50 text-violet-600' };
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    const unsubscribe = getUserNotifications(user.uid, (notifs) => setNotifications(notifs));
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user || user.uid === 'guest') return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const list = tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const handleClick = async (n: UserNotification) => {
    if (!n.read) await markNotificationAsRead(user.uid, n.id);
    if (n.type === 'connection_request') {
      setOpen(false);
      navigate('/connection-requests');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`header-icon-btn ${open ? 'bg-white text-maroon-900 shadow-sm ring-1 ring-sandal-300/70' : ''}`}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-sandal-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[68px] z-50 flex max-h-[calc(100dvh-90px)] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(67,27,17,0.4)] ring-1 ring-sandal-300/70 animate-scale-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(560px,calc(100dvh-100px))] sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
            <div>
              <h3 className="text-base font-semibold text-maroon-900">Notifications</h3>
              <p className="text-xs text-maroon-900/50">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead(user.uid)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                  style={{ minHeight: 0 }}
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-maroon-900/40 transition hover:bg-sandal-100 hover:text-maroon-900 sm:hidden"
                aria-label="Close"
                style={{ minHeight: 0 }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-5 pb-3">
            <div className="inline-flex rounded-xl bg-sandal-100 p-1">
              {(['all', 'unread'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                    tab === t ? 'bg-white text-maroon-900 shadow-sm' : 'text-maroon-900/50 hover:text-maroon-900'
                  }`}
                  style={{ minHeight: 0 }}
                >
                  {t}
                  {t === 'unread' && unreadCount > 0 && <span className="ml-1 text-brand-600">{unreadCount}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto border-t border-sandal-200/70">
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sandal-100 text-maroon-900/35">
                  <Bell size={22} />
                </span>
                <p className="text-sm font-medium text-maroon-900">{tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
                <p className="text-xs text-maroon-900/45">Updates from the community will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-sandal-200/60">
                {list.map((n) => {
                  const { Icon, tone } = iconFor(n);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-sandal-50 ${!n.read ? 'bg-brand-50/40' : ''}`}
                        style={{ minHeight: 0 }}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={`text-sm leading-snug ${n.read ? 'font-medium text-maroon-900/75' : 'font-semibold text-maroon-900'}`}>
                              {n.title}
                            </span>
                            <span className="shrink-0 pt-0.5 text-[11px] text-maroon-900/40">{timeAgo(n.timestamp)}</span>
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-relaxed text-maroon-900/60">{n.message}</span>
                          {n.adminComment && (
                            <span className="mt-2 block rounded-xl bg-sandal-100 px-3 py-2 text-xs text-maroon-900/70">
                              <span className="font-semibold text-maroon-800">Note: </span>
                              {n.adminComment}
                            </span>
                          )}
                        </span>
                        {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
