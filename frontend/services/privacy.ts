/**
 * Privacy layer.
 *
 * Other devotees never read `users/{uid}` (journal, entries, email, settings live there).
 * Each user publishes a small, privacy-filtered card instead:
 *   - `publicProfiles/{uid}`            when visible to everyone
 *   - `circleProfiles/{gender}/{uid}`   when visible only to Matajis (female) / Prabhujis (male)
 * Database rules enforce who can read each node. Blocks live at `blocks/{uid}/{blockedUid}`.
 */
import { ref, get, set, update, remove, onValue, push } from 'firebase/database';
import { database } from './firebase';
import type { UserSettings } from '../types';
import type { UserProfile } from '../types/chat';

type Gender = 'male' | 'female';

let presencePath: string | null = null;
/** Where this user's online status should also be mirrored (null when they hide it). */
export const getPresencePath = () => presencePath;

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as T;

/** Publish (or move) this user's public card according to their privacy settings. */
export const publishProfile = async (uid: string, s: UserSettings, extra: { photoURL?: string | null; createdAt?: number } = {}) => {
  if (!s.userName || !s.gender) return;
  const visibility = s.profileVisibility || 'everyone';
  const showLastSeen = s.showLastSeen ?? s.gender !== 'female';
  const card = clean({
    uid,
    userName: s.userName,
    gender: s.gender,
    photoURL: extra.photoURL || undefined,
    guruName: s.showGuruName === false ? undefined : s.guruName,
    iskconCenter: s.showIskconCenter === false ? undefined : s.iskconCenter,
    showGuruName: s.showGuruName ?? true,
    showIskconCenter: s.showIskconCenter ?? true,
    showLastSeen,
    messagingPrivacy: s.messagingPrivacy || (s.gender === 'female' ? 'connections-only' : 'everyone'),
    requestsFrom: s.requestsFrom || 'everyone',
    profileVisibility: visibility,
    joinedDate: extra.createdAt || undefined,
    isOnline: showLastSeen ? true : undefined,
    lastSeen: showLastSeen ? Date.now() : undefined,
  });

  const publicPath = `publicProfiles/${uid}`;
  const circlePath = (g: Gender) => `circleProfiles/${g}/${uid}`;
  const target = visibility === 'same-gender' ? circlePath(s.gender) : publicPath;
  const stale = [publicPath, circlePath('male'), circlePath('female')].filter((p) => p !== target);

  await set(ref(database, target), card);
  await Promise.all(stale.map((p) => remove(ref(database, p)).catch(() => undefined)));
  presencePath = showLastSeen ? target : null;
};

export const unpublishProfile = async (uid: string) => {
  await Promise.all(
    [`publicProfiles/${uid}`, `circleProfiles/male/${uid}`, `circleProfiles/female/${uid}`].map((p) => remove(ref(database, p)).catch(() => undefined))
  );
  presencePath = null;
};

const toProfile = (uid: string, d: any): UserProfile => ({
  uid,
  userName: d.userName,
  guruName: d.guruName || '',
  iskconCenter: d.iskconCenter || '',
  photoURL: d.photoURL,
  gender: d.gender,
  showGuruName: d.showGuruName,
  showIskconCenter: d.showIskconCenter,
  showLastSeen: d.showLastSeen,
  messagingPrivacy: d.messagingPrivacy || 'everyone',
  requestsFrom: d.requestsFrom || 'everyone',
  profileVisibility: d.profileVisibility || 'everyone',
  isOnline: d.showLastSeen === false ? false : !!d.isOnline,
  lastSeen: d.lastSeen || 0,
  joinedDate: d.joinedDate || 0,
});

/** Read one devotee's public card (public first, then the viewer's own circle). */
export const getPublicProfile = async (uid: string, viewerGender?: Gender): Promise<UserProfile | null> => {
  const paths = [`publicProfiles/${uid}`, ...(viewerGender ? [`circleProfiles/${viewerGender}/${uid}`] : [])];
  for (const p of paths) {
    try {
      const snap = await get(ref(database, p));
      if (snap.exists() && snap.val()?.userName) return toProfile(uid, snap.val());
    } catch {
      /* not allowed to read — keep looking */
    }
  }
  return null;
};

/** Live directory of devotees this viewer is allowed to see. */
export const subscribeDirectory = (viewerGender: Gender | undefined, cb: (users: UserProfile[]) => void) => {
  let pub: Record<string, any> = {};
  let circle: Record<string, any> = {};
  const emit = () => cb(Object.entries({ ...pub, ...circle }).filter(([, d]) => d?.userName).map(([uid, d]) => toProfile(uid, d)));
  const offs = [
    onValue(ref(database, 'publicProfiles'), (s) => ((pub = s.val() || {}), emit()), () => ((pub = {}), emit())),
  ];
  if (viewerGender) {
    offs.push(onValue(ref(database, `circleProfiles/${viewerGender}`), (s) => ((circle = s.val() || {}), emit()), () => ((circle = {}), emit())));
  }
  return () => offs.forEach((off) => off());
};

/* ---------------------------- rules for contact ---------------------------- */

export const canSendRequestTo = (target: UserProfile, viewerGender?: Gender) => {
  const r = target.requestsFrom || 'everyone';
  return r === 'everyone' || (r === 'same-gender' && !!viewerGender && viewerGender === target.gender);
};

/* --------------------------------- blocks --------------------------------- */

export const blockUser = (me: string, other: string) => set(ref(database, `blocks/${me}/${other}`), Date.now());
export const unblockUser = (me: string, other: string) => remove(ref(database, `blocks/${me}/${other}`));
export const listenBlocked = (me: string, cb: (ids: string[]) => void) =>
  onValue(ref(database, `blocks/${me}`), (s) => cb(Object.keys(s.val() || {})), () => cb([]));
export const isBlockedBy = async (blocker: string, other: string) => {
  try {
    return (await get(ref(database, `blocks/${blocker}/${other}`))).exists();
  } catch {
    return false;
  }
};

export const reportUser = (me: string, other: string, otherName: string, reason: string) =>
  set(push(ref(database, 'flaggedContent')), {
    contentType: 'user',
    reportedUserId: other,
    reportedUserName: otherName,
    reporterId: me,
    reason,
    status: 'pending',
    timestamp: Date.now(),
  });

/** Update a few fields of the user's own card without republishing everything. */
export const patchOwnCard = async (uid: string, patch: Record<string, unknown>) => {
  for (const p of [`publicProfiles/${uid}`, `circleProfiles/male/${uid}`, `circleProfiles/female/${uid}`]) {
    try {
      if ((await get(ref(database, `${p}/uid`))).exists()) await update(ref(database, p), patch);
    } catch {
      /* ignore */
    }
  }
};
