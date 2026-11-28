/**
 * Web push (Firebase Cloud Messaging) + local notifications.
 *
 * Data written:
 *   users/{uid}/fcmTokens/{key} = { token, createdAt, ua }   key = short hash of the token
 *   pushSubscribers/{uid}       = true                       index used by the daily reminder job
 *
 * Uses the app's existing service worker (/sw.js, registered from index.html);
 * public/sw.js handles `push` and `notificationclick`. See docs/PUSH_NOTIFICATIONS.md.
 */
import { ref, set, remove, get } from 'firebase/database';
import type { Messaging } from 'firebase/messaging';
import { app, db } from './firebase';

export type PushState = 'unsupported' | 'ios-needs-install' | 'default' | 'granted' | 'denied';

export const PUSH_PREF_KEYS = {
  messages: 'notifyMessages',
  requests: 'notifyRequests',
  festivals: 'notifyFestivals',
} as const;

const VAPID_KEY: string = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) || 'BG7vnLY5z8HHQ8nD-h0AVsMUq5wBpSsVHAlg4_nOH9CkyBn-poV2hXROlJig8ysVc4eR-BxqhkuauBxjiYxEHqo'; // public web-push key (safe to ship)
const LS_TOKEN = 'ss_push_token';
const LS_REMINDER = 'ss_push_reminder_day';

/* ---------------------------------------------------------------- utils */

const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
};
const lsDel = (k: string) => {
  try {
    localStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
};

/** Two FNV-1a 32-bit hashes → 16 hex chars; safe as an RTDB key. */
function tokenKey(token: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ token.length;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) ^ (h2 >>> 15);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports as Mac with touch
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && (navigator as Navigator).maxTouchPoints > 1);
};

const isStandalone = (): boolean => {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
};

const hasBasics = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

async function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing?.active) return existing;
    // index.html registers /sw.js; wait for it (bounded so we never hang the UI)
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
  } catch {
    return null;
  }
}

let messagingPromise: Promise<Messaging | null> | null = null;
function getMessagingSafe(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = import('firebase/messaging')
      .then(async (m) => ((await m.isSupported()) ? m.getMessaging(app) : null))
      .catch(() => null);
  }
  return messagingPromise;
}

/* ------------------------------------------------------------ state API */

/** Synchronous best guess of the current state (does not check FCM support). */
export function getPushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIOS() && !isStandalone()) return 'ios-needs-install';
  if (!hasBasics()) return 'unsupported';
  const p = Notification.permission;
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'default';
}

/** True when FCM web push works in this browser (async, uses firebase isSupported()). */
export async function pushSupported(): Promise<boolean> {
  if (!hasBasics()) return false;
  return (await getMessagingSafe()) !== null;
}

/* ----------------------------------------------------------- token flow */

async function fetchToken(): Promise<string | null> {
  if (!VAPID_KEY) return null;
  const messaging = await getMessagingSafe();
  const reg = await swRegistration();
  if (!messaging || !reg) return null;
  const { getToken } = await import('firebase/messaging');
  return (await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })) || null;
}

async function saveToken(uid: string, token: string): Promise<void> {
  const key = tokenKey(token);
  const prev = lsGet(LS_TOKEN);
  if (prev && prev !== token) {
    await remove(ref(db, `users/${uid}/fcmTokens/${tokenKey(prev)}`)).catch(() => undefined);
  }
  await set(ref(db, `users/${uid}/fcmTokens/${key}`), {
    token,
    createdAt: Date.now(),
    ua: (navigator.userAgent || '').slice(0, 200),
  });
  await set(ref(db, `pushSubscribers/${uid}`), true);
  lsSet(LS_TOKEN, token);
}

/**
 * Ask for permission and register this device for push. Call from a user gesture.
 * Returns ok:true with reason 'no-vapid' or 'no-fcm' when only local notifications are possible.
 */
export async function enablePush(uid: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const state = getPushState();
    if (state === 'ios-needs-install')
      return { ok: false, reason: 'On iPhone/iPad, first add Sadhana Sang to your Home Screen (Share → Add to Home Screen), then open it from there.' };
    if (state === 'unsupported') return { ok: false, reason: 'This browser does not support notifications.' };
    if (state === 'denied')
      return { ok: false, reason: 'Notifications are blocked. Please allow them in your browser or phone settings for this site.' };

    const permission = state === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        reason: permission === 'denied' ? 'Notifications were blocked. You can allow them later in your browser settings.' : 'Permission was not granted.',
      };
    }

    if (!uid || uid === 'guest') return { ok: true, reason: 'guest' };
    if (!VAPID_KEY) return { ok: true, reason: 'no-vapid' };
    if (!(await pushSupported())) return { ok: true, reason: 'no-fcm' };

    const token = await fetchToken();
    if (!token) return { ok: false, reason: 'Could not register this device for notifications. Please try again.' };
    await saveToken(uid, token);
    return { ok: true };
  } catch (err) {
    console.warn('[push] enablePush failed', err);
    return { ok: false, reason: 'Could not turn on notifications. Please check your connection and try again.' };
  }
}

/** Unregister this device. Removes pushSubscribers/{uid} only when no tokens remain. */
export async function disablePush(uid: string): Promise<void> {
  try {
    const stored = lsGet(LS_TOKEN);
    let token = stored;
    try {
      const messaging = await getMessagingSafe();
      if (messaging) {
        const { deleteToken } = await import('firebase/messaging');
        if (!token && VAPID_KEY && Notification.permission === 'granted') token = await fetchToken().catch(() => null);
        await deleteToken(messaging).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
    lsDel(LS_TOKEN);
    if (!uid || uid === 'guest') return;
    if (token) await remove(ref(db, `users/${uid}/fcmTokens/${tokenKey(token)}`));
    const left = await get(ref(db, `users/${uid}/fcmTokens`));
    if (!left.exists()) await remove(ref(db, `pushSubscribers/${uid}`));
  } catch (err) {
    console.warn('[push] disablePush failed', err);
  }
}

/** Call on app start (after sign-in) when permission is already granted. */
export async function refreshPushToken(uid: string): Promise<void> {
  try {
    if (!uid || uid === 'guest' || !VAPID_KEY) return;
    if (getPushState() !== 'granted') return;
    if (!(await pushSupported())) return;
    const token = await fetchToken();
    if (token) await saveToken(uid, token);
  } catch (err) {
    console.warn('[push] refreshPushToken failed', err);
  }
}

/* ---------------------------------------------------------- foreground */

/** Messages that arrive while the app is open and focused. Returns an unsubscribe fn. */
export function onForegroundMessage(cb: (p: { title: string; body: string; link?: string }) => void): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;

  // public/sw.js forwards pushes to a focused, visible page instead of showing a system notification
  const swListener = (e: MessageEvent) => {
    const d = e.data as { type?: string; payload?: { title?: string; body?: string; link?: string } } | null;
    if (!d || d.type !== 'PUSH_RECEIVED' || !d.payload) return;
    try {
      cb({ title: d.payload.title || 'Sadhana Sang', body: d.payload.body || '', link: d.payload.link });
    } catch {
      /* ignore */
    }
  };
  try {
    navigator.serviceWorker?.addEventListener('message', swListener);
  } catch {
    /* ignore */
  }

  getMessagingSafe()
    .then(async (messaging) => {
      if (!messaging || cancelled) return;
      const { onMessage } = await import('firebase/messaging');
      if (cancelled) return;
      unsub = onMessage(messaging, (payload) => {
        try {
          const d = (payload.data || {}) as Record<string, string>;
          const n = payload.notification || {};
          cb({
            title: d.title || n.title || 'Sadhana Sang',
            body: d.body || n.body || '',
            link: d.link || payload.fcmOptions?.link,
          });
        } catch {
          /* ignore */
        }
      });
    })
    .catch(() => undefined);
  return () => {
    cancelled = true;
    try {
      navigator.serviceWorker?.removeEventListener('message', swListener);
      unsub?.();
    } catch {
      /* ignore */
    }
  };
}

/* --------------------------------------------------------------- local */

export async function showLocalNotification(title: string, body: string, link?: string, tag?: string): Promise<void> {
  try {
    if (!hasBasics() || Notification.permission !== 'granted') return;
    const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { link: link || '/' },
      vibrate: [80, 40, 80],
    };
    if (tag) {
      options.tag = tag;
      options.renotify = true;
    }
    const reg = await swRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch (err) {
    console.warn('[push] showLocalNotification failed', err);
  }
}

const localYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Local fallback (no Cloud Functions needed): once per day, if a festival is
 * tomorrow (device local date) and permission is granted, show a notification.
 */
export async function checkTomorrowReminders(
  uid: string,
  festivals: { id: string; name: string; date: string }[]
): Promise<void> {
  try {
    if (getPushState() !== 'granted' || !festivals?.length) return;
    const now = new Date();
    const today = localYmd(now);
    const dedupeKey = `${uid || 'guest'}:${today}`;
    if (lsGet(LS_REMINDER) === dedupeKey) return;

    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrow = localYmd(t);
    const due = festivals.filter((f) => f && f.date === tomorrow && f.name);
    if (!due.length) return;

    lsSet(LS_REMINDER, dedupeKey);
    const title = `Tomorrow: ${due.map((f) => f.name).join(' · ')}`;
    const link = due.length === 1 ? `/#/festival/${due[0].id}` : '/#/festivals';
    await showLocalNotification(title, 'May your sadhana be blessed 🙏', link, `reminder-${tomorrow}`);
  } catch (err) {
    console.warn('[push] checkTomorrowReminders failed', err);
  }
}

/* -------------------------------------------------------------------------- */
/* Server-sent pushes (backend/ — FastAPI on Render)                           */
/* -------------------------------------------------------------------------- */

const PUSH_SERVER = ((import.meta.env.VITE_PUSH_SERVER_URL as string | undefined) || 'https://sadhana-sang.onrender.com').replace(/\/$/, '');

/**
 * Ask the server to notify the other person. The item is written to `pushQueue`
 * (the server verifies it against the real chat/request before sending), then the
 * server is woken with /kick. If the kick fails, the server's listener or its
 * every-minute tick still sends it — so a push is never lost.
 */
export const queuePush = async (
  item: { type: 'message'; chatId: string } | { type: 'request'; requestId: string } | { type: 'accepted'; requester: string },
  from: string
): Promise<void> => {
  try {
    const { push } = await import('firebase/database');
    await set(push(ref(db, 'pushQueue')), { ...item, from, at: Date.now() });
    if (PUSH_SERVER) fetch(`${PUSH_SERVER}/kick`, { method: 'POST', keepalive: true }).catch(() => undefined);
  } catch (err) {
    console.warn('queuePush failed', err);
  }
};
