import { ref, get, set } from 'firebase/database';
import { db } from './firebase';
import { getEntry, saveEntry } from './storage';
import { normalizeEntry } from '../components/planner/weekCard';
import { localDateKey } from '../utils/date';

/** Same shape the app has always stored under users/{uid}/chantingSessions */
export interface ChantingSession {
  id: string;
  beads: number;
  rounds: number;
  date: string; // dd/mm (legacy display)
  startTime: string; // HH:MM
  completeTime: string; // HH:MM
  timestamp: number;
  duration: number; // seconds
  completed: boolean;
  laps?: number[]; // seconds per round
}

export interface ChantingStats {
  totalRounds: number;
  totalBeads: number;
  totalTime: number;
  sessions?: ChantingSession[];
}

const isGuest = (uid: string) => uid === 'guest';
const GUEST_KEY = 'sl_guest_japa_sessions';

export const loadSessions = async (uid: string): Promise<ChantingSession[]> => {
  if (isGuest(uid)) {
    try {
      return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    } catch {
      return [];
    }
  }
  try {
    const snap = await get(ref(db, `users/${uid}/chantingSessions`));
    if (!snap.exists()) return [];
    return (Object.values(snap.val()) as ChantingSession[]).filter((s) => s?.timestamp).sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('Error loading japa sessions:', e);
    return [];
  }
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Saves a finished session, updates lifetime stats and writes today's total
 * rounds into the planner, so the dashboard and weekly card stay in step.
 */
export const saveSession = async (
  uid: string,
  data: { rounds: number; beads: number; beadsPerRound: number; startedAt: number; durationSec: number; laps: number[] },
  todayRoundsBefore: number
): Promise<ChantingSession> => {
  const now = new Date();
  const session: ChantingSession = {
    id: String(now.getTime()),
    beads: data.beads,
    rounds: data.rounds,
    date: now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
    startTime: hhmm(new Date(data.startedAt)),
    completeTime: hhmm(now),
    timestamp: now.getTime(),
    duration: Math.round(data.durationSec),
    completed: data.rounds > 0 && data.beads === 0,
    laps: data.laps.map((l) => Math.round(l)),
  };

  if (isGuest(uid)) {
    const list = await loadSessions(uid);
    localStorage.setItem(GUEST_KEY, JSON.stringify([session, ...list].slice(0, 200)));
  } else {
    await set(ref(db, `users/${uid}/chantingSessions/${session.id}`), session);
    try {
      const statsSnap = await get(ref(db, `users/${uid}/chantingStats`));
      const prev: ChantingStats = statsSnap.exists() ? statsSnap.val() : { totalRounds: 0, totalBeads: 0, totalTime: 0 };
      await set(ref(db, `users/${uid}/chantingStats`), {
        totalRounds: (prev.totalRounds || 0) + data.rounds,
        totalBeads: (prev.totalBeads || 0) + data.rounds * data.beadsPerRound + data.beads,
        totalTime: (prev.totalTime || 0) + session.duration,
        sessions: [...(prev.sessions || []), session].slice(-30),
      });
    } catch (e) {
      console.error('Error updating japa stats:', e);
    }
  }

  // Keep the planner in step: today's rounds = the larger of what is logged and what was counted
  if (data.rounds > 0) {
    try {
      const key = localDateKey(now);
      const entry = normalizeEntry(await getEntry(uid, key), key);
      const total = todayRoundsBefore + data.rounds;
      const current = Number(entry.metrics.chantingRounds) || 0;
      if (total >= current) {
        await saveEntry(uid, {
          ...entry,
          metrics: { ...entry.metrics, chantingRounds: total, chantingTime: hhmm(now) },
          lastUpdated: Date.now(),
        });
      }
    } catch (e) {
      console.error('Error syncing japa to planner:', e);
    }
  }

  window.dispatchEvent(new Event('userDataUpdated'));
  return session;
};
