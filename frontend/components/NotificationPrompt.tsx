import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, MessageCircle, UserPlus, CalendarDays, Share } from 'lucide-react';
import { ref, get, onChildAdded, query, orderByChild, startAt } from 'firebase/database';
import { getUserChats } from '../services/chat';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getPushState, enablePush, refreshPushToken, onForegroundMessage, checkTomorrowReminders, showLocalNotification } from '../services/push';

const ASKED_KEY = 'ss_push_asked';

const wasAsked = () => {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return false;
  }
};
const markAsked = () => {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
};

/** Soft, in-app ask before the browser's permission dialog. */
const NotificationPrompt: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { showSuccess, showInfo } = useToast();
  const [busy, setBusy] = useState(false);
  const state = getPushState();

  useEffect(() => {
    // Nothing to ask if already decided or unsupported
    if (open && (state === 'granted' || state === 'denied' || state === 'unsupported')) onClose();
  }, [open, state, onClose]);

  if (!open || !user || user.uid === 'guest' || state === 'granted' || state === 'denied' || state === 'unsupported') return null;

  const later = () => {
    markAsked();
    onClose();
  };
  const allow = async () => {
    setBusy(true);
    const res = await enablePush(user.uid);
    markAsked();
    setBusy(false);
    if (res.ok) showSuccess('Notifications are on', 'We will gently let you know what matters.');
    else showInfo('Notifications are off', res.reason || 'You can turn them on any time in Settings.');
    onClose();
  };

  const iosInstall = state === 'ios-needs-install';
  const rows = [
    { Icon: MessageCircle, text: 'When a devotee messages you' },
    { Icon: UserPlus, text: 'When someone wants to connect' },
    { Icon: CalendarDays, text: 'A day before festivals and Ekadashi' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Turn on notifications">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/30 backdrop-blur-[2px]" onClick={later} />
      <div
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="relative w-full animate-rise-in rounded-t-[28px] bg-white px-6 pt-6 shadow-lift sm:max-w-sm sm:rounded-[28px]"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-marigold-400 to-brand-500 text-white shadow-glow">
          <Bell size={26} />
        </div>
        <h3 className="mt-4 text-center text-xl font-semibold text-maroon-900">Stay close to your sangha</h3>
        <p className="mt-1 text-center text-sm text-maroon-900/60">Allow notifications so you never miss:</p>
        <ul className="mt-4 space-y-2.5">
          {rows.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-sandal-50 px-3.5 py-2.5 text-sm font-medium text-maroon-900/80 ring-1 ring-sandal-200">
              <Icon size={17} className="shrink-0 text-brand-600" /> {text}
            </li>
          ))}
        </ul>
        {iosInstall ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-maroon-900/70 ring-1 ring-amber-200">
            <Share size={15} className="mt-0.5 shrink-0 text-brand-600" />
            On iPhone, first add Sadhana Sang to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications.
          </p>
        ) : (
          <button type="button" onClick={allow} disabled={busy} className="btn-primary mt-5 h-12 w-full rounded-2xl text-[15px]">
            {busy ? 'Turning on…' : 'Allow notifications'}
          </button>
        )}
        <button type="button" onClick={later} className="mt-2 w-full py-2 text-sm font-medium text-maroon-900/55 hover:text-maroon-900">
          {iosInstall ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default NotificationPrompt;

/**
 * Keeps push working in the background of the app: refreshes the device token, shows
 * foreground messages as toasts, runs the local "festival tomorrow" reminder, and asks
 * existing users once (gently) if they have never been asked.
 */
export const PushBridge: React.FC<{ suppressAsk: boolean }> = ({ suppressAsk }) => {
  const { user } = useAuth();
  const { showInfo } = useToast();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    const uid = user.uid;
    if (getPushState() === 'granted') {
      refreshPushToken(uid).catch(() => undefined);
      get(ref(db, 'festivals'))
        .then((s) => {
          const list = Object.entries((s.val() || {}) as Record<string, any>).map(([id, v]) => ({ id, name: v.name, date: v.date }));
          return checkTomorrowReminders(uid, list);
        })
        .catch(() => undefined);
    }
    // While the app is open, show pushes as a toast (skip if already looking at that chat)
    return onForegroundMessage((p) => {
      const route = p.link?.split('#')[1];
      if (route && window.location.hash === `#${route}`) return;
      showInfo(p.title, p.body);
    });
  }, [user, showInfo]);

  /*
   * Fallback that does not depend on the server: while the app is open or in the background,
   * new messages and requests raise a system notification. Tags match the server's
   * (chat-<id>, request-<id>) so a device that also gets the server push shows only one.
   */
  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    const uid = user.uid;
    const seen = new Map<string, number>();
    let first = true;
    const offChats = getUserChats(uid, (chats) => {
      chats.forEach((c) => {
        const n = c.unreadCount?.[uid] || 0;
        const prev = seen.get(c.id) ?? n;
        seen.set(c.id, n);
        if (first || n <= prev || getPushState() !== 'granted') return;
        if (!document.hidden && window.location.hash === `#/chat/${c.id}`) return;
        if (!document.hidden) return; // visible app: the in-app badge is enough
        const other = c.participants.find((p) => p !== uid) || '';
        const name = c.participantDetails?.[other]?.userName || 'A devotee';
        showLocalNotification(name, 'Sent you a message 🙏', `/#/chat/${c.id}`, `chat-${c.id}`).catch(() => undefined);
      });
      first = false;
    });
    const since = Date.now();
    const offReq = onChildAdded(query(ref(db, `userNotifications/${uid}`), orderByChild('timestamp'), startAt(since)), (snap) => {
      const n = snap.val();
      if (!n || n.type !== 'connection_request' || getPushState() !== 'granted' || !document.hidden) return;
      showLocalNotification('New connection request', `${n.fromUserName || 'A devotee'} wants to connect with you`, '/#/connection-requests', `request-${n.requestId || snap.key}`).catch(() => undefined);
    });
    return () => {
      offChats();
      offReq();
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.uid === 'guest' || suppressAsk || wasAsked() || getPushState() !== 'default') return;
    const t = window.setTimeout(() => setAsk(true), 25000);
    return () => window.clearTimeout(t);
  }, [user, suppressAsk]);

  return <NotificationPrompt open={ask && !suppressAsk} onClose={() => setAsk(false)} />;
};
