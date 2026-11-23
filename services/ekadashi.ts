/**
 * Ekadashi data in Firebase Realtime Database.
 *
 *   ekadashi/content/{slug}                      EkadashiContent (admin edits / verification)
 *   ekadashi/observances/{locationId}/{fastDate} ObservanceRecord (official, per city)
 *   users/{uid}/ekadashiLocation                 the devotee's chosen location
 *
 * The bundled seed (utils/ekadashi/content.ts) is the fallback whenever the
 * database is unreachable (e.g. guest mode), so the page always works.
 */

import { ref, get, set, update, remove } from 'firebase/database';
import { db, auth } from './firebase';
import { EKADASHI_CONTENT } from '../utils/ekadashi/content';
import type { EkadashiContent, ObservanceRecord } from '../utils/ekadashi/types';
import type { EkadashiLocation } from '../utils/ekadashi/calendar';
import { OFFICIAL_SEED } from '../utils/ekadashi/officialSeed';

const stripUndefined = <T extends object>(obj: T): T => JSON.parse(JSON.stringify(obj));

/* ------------------------------------------------------------ Content --- */

let contentCache: Record<string, EkadashiContent> | null = null;

/** Bundled content merged with any database overrides (database wins) */
export async function loadEkadashiContent(force = false): Promise<Record<string, EkadashiContent>> {
  if (contentCache && !force) return contentCache;
  const merged: Record<string, EkadashiContent> = {};
  for (const c of EKADASHI_CONTENT) merged[c.slug] = c;
  try {
    const snap = await get(ref(db, 'ekadashi/content'));
    if (snap.exists()) {
      const val = snap.val() as Record<string, Partial<EkadashiContent>>;
      for (const [slug, data] of Object.entries(val)) {
        merged[slug] = { ...(merged[slug] || ({} as EkadashiContent)), ...data, slug } as EkadashiContent;
      }
    }
  } catch (err) {
    console.warn('Ekadashi content: using bundled copy', err);
  }
  contentCache = merged;
  return merged;
}

export const bundledContent = (slug: string) => EKADASHI_CONTENT.find((c) => c.slug === slug);

export async function saveEkadashiContent(content: EkadashiContent): Promise<void> {
  const by = auth.currentUser?.email || auth.currentUser?.uid || 'admin';
  await set(ref(db, `ekadashi/content/${content.slug}`), stripUndefined({ ...content, updatedAt: Date.now(), updatedBy: by }));
  contentCache = null;
}

export async function setContentStatus(slug: string, status: EkadashiContent['status'], reviewNote?: string): Promise<void> {
  const current = (await loadEkadashiContent(true))[slug];
  if (!current) throw new Error('Unknown Ekadashi');
  const by = auth.currentUser?.email || 'admin';
  await saveEkadashiContent({
    ...current,
    status,
    reviewNote: reviewNote ?? current.reviewNote,
    verifiedBy: status === 'verified' ? by : undefined,
    verifiedAt: status === 'verified' ? Date.now() : undefined,
  });
}

/** Write every bundled entry that is not yet in the database */
export async function seedEkadashiContent(overwrite = false): Promise<number> {
  const snap = await get(ref(db, 'ekadashi/content'));
  const existing = snap.exists() ? (snap.val() as Record<string, unknown>) : {};
  const updates: Record<string, unknown> = {};
  for (const c of EKADASHI_CONTENT) {
    if (overwrite || !existing[c.slug]) updates[c.slug] = stripUndefined({ ...c, updatedAt: Date.now(), updatedBy: 'seed' });
  }
  if (Object.keys(updates).length) await update(ref(db, 'ekadashi/content'), updates);
  contentCache = null;
  return Object.keys(updates).length;
}

/* --------------------------------------------------- Observance records --- */

const obsCache = new Map<string, ObservanceRecord[]>();

const sameObservance = (a: ObservanceRecord, b: ObservanceRecord) =>
  a.slug === b.slug && Math.abs(Date.parse(a.fastDate) - Date.parse(b.fastDate)) <= 3 * 86_400_000;

/** Database records and bundled official seed for a city, kept separate (admin view) */
export async function loadObservanceSources(locationId: string): Promise<{ db: ObservanceRecord[]; seed: ObservanceRecord[]; dbError?: string }> {
  const seed = OFFICIAL_SEED.filter((r) => r.locationId === locationId);
  try {
    const snap = await get(ref(db, `ekadashi/observances/${locationId}`));
    const list = snap.exists() ? Object.values(snap.val() as Record<string, ObservanceRecord>) : [];
    return { db: list, seed };
  } catch (err) {
    return { db: [], seed, dbError: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Official records for a city: database records override bundled seed
 * records for the same Ekadashi; seed fills the rest.
 */
export async function loadObservances(locationId: string, force = false): Promise<ObservanceRecord[]> {
  if (!force && obsCache.has(locationId)) return obsCache.get(locationId)!;
  const { db: dbList, seed } = await loadObservanceSources(locationId);
  const list = [...dbList, ...seed.filter((s) => !dbList.some((d) => sameObservance(d, s)))];
  list.sort((a, b) => a.fastDate.localeCompare(b.fastDate));
  obsCache.set(locationId, list);
  return list;
}

export async function saveObservance(record: ObservanceRecord): Promise<void> {
  const by = auth.currentUser?.email || 'admin';
  const data: ObservanceRecord = {
    ...record,
    enteredBy: record.enteredBy || by,
    enteredAt: record.enteredAt || Date.now(),
    verifiedBy: record.status === 'verified' ? record.verifiedBy || by : undefined,
    verifiedAt: record.status === 'verified' ? record.verifiedAt || Date.now() : undefined,
  };
  await set(ref(db, `ekadashi/observances/${record.locationId}/${record.fastDate}`), stripUndefined(data));
  obsCache.delete(record.locationId);
}

export async function deleteObservance(locationId: string, fastDate: string): Promise<void> {
  await remove(ref(db, `ekadashi/observances/${locationId}/${fastDate}`));
  obsCache.delete(locationId);
}

/** Import the bundled official records (status stays `source_imported` until an admin verifies) */
export async function seedOfficialObservances(): Promise<number> {
  let n = 0;
  for (const r of OFFICIAL_SEED) {
    const path = `ekadashi/observances/${r.locationId}/${r.fastDate}`;
    const snap = await get(ref(db, path));
    if (!snap.exists()) {
      await set(ref(db, path), stripUndefined({ ...r, enteredBy: 'seed', enteredAt: Date.now() }));
      n++;
    }
  }
  obsCache.clear();
  return n;
}

/* ------------------------------------------------- Location preference --- */

const LS_KEY = 'ss_ekadashi_location';

export function getSavedLocationLocal(): EkadashiLocation | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as EkadashiLocation) : null;
  } catch {
    return null;
  }
}

export async function getSavedLocation(uid?: string): Promise<EkadashiLocation | null> {
  const local = getSavedLocationLocal();
  if (local) return local;
  if (uid && uid !== 'guest') {
    try {
      const snap = await get(ref(db, `users/${uid}/ekadashiLocation`));
      if (snap.exists()) return snap.val() as EkadashiLocation;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function saveLocation(loc: EkadashiLocation, uid?: string): Promise<void> {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
  } catch {
    /* storage unavailable */
  }
  if (uid && uid !== 'guest') {
    try {
      await set(ref(db, `users/${uid}/ekadashiLocation`), stripUndefined(loc));
    } catch (err) {
      console.warn('Could not save Ekadashi location to profile', err);
    }
  }
}
