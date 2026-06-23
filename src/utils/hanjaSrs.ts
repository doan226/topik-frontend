const SRS_PREFIX = 'topik_hanja_srs_';
const STREAK_PREFIX = 'topik_hanja_streak_';
const MIGRATED_PREFIX = 'topik_fsrs_migrated_';

import {
  ensureHanjaSrsCard,
  getSrsCards,
  migrateLocalSrs,
  submitSrsReview,
} from '../modules/lib/apiClient';

export interface SrsCardState {
  cardId?: number;
  stability?: number;
  difficulty?: number;
  due?: number;
  state?: number;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  nextReview?: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Legacy local cache (fallback / migration source) */
export function loadLocalSrsState(userId: string | number) {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`${SRS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const cardCache: Record<string, Record<string, SrsCardState>> = {};

export function loadSrsState(userId: string | number): Record<string, SrsCardState> {
  if (!userId) return {};
  return cardCache[String(userId)] || {};
}

export function saveSrsState(userId: string | number, state: Record<string, SrsCardState>) {
  if (!userId) return;
  cardCache[String(userId)] = state;
}

export async function syncSrsFromServer(userId: string | number) {
  const cards = await getSrsCards(userId, 'all');
  const map: Record<string, SrsCardState> = {};
  for (const c of cards) {
    const ref = c.externalRef || c.word;
    if (!ref) continue;
    map[ref] = {
      cardId: c.id,
      stability: c.stability,
      difficulty: c.difficulty,
      due: c.due,
    };
  }
  saveSrsState(userId, map);
  return map;
}

export async function runMigrationIfNeeded(
  userId: string | number,
  charMeta: Record<string, { word: string; meaning: string }>
) {
  if (!userId) return;
  const flag = localStorage.getItem(`${MIGRATED_PREFIX}${userId}`);
  if (flag === '1') return;

  const local = loadLocalSrsState(userId);
  const entries = Object.entries(local).map(([charId, card]) => ({
    charId,
    word: charMeta[charId]?.word || charId,
    meaning: charMeta[charId]?.meaning || 'Hán Hàn',
    repetitions: card.repetitions ?? 0,
    interval: card.interval ?? 0,
    easeFactor: card.easeFactor ?? 2.5,
    nextReview: card.nextReview,
  }));

  if (entries.length > 0) {
    await migrateLocalSrs(userId, entries);
  }
  localStorage.setItem(`${MIGRATED_PREFIX}${userId}`, '1');
  await syncSrsFromServer(userId);
}

export function getDueCards(charIds: string[], srsState: Record<string, SrsCardState>, { limit = 50 } = {}) {
  const now = Date.now();
  const due = charIds.filter((id) => {
    const s = srsState[id];
    if (!s) return true;
    if (s.due != null) return s.due <= now;
    if (s.nextReview) return s.nextReview <= todayStr();
    return true;
  });
  return due.slice(0, limit);
}

export function getDueCount(charIds: string[], srsState: Record<string, SrsCardState>) {
  return getDueCards(charIds, srsState, { limit: 9999 }).length;
}

export function isLearnedCard(s: SrsCardState | undefined) {
  if (!s) return false;
  if (s.state === 2 && (s.stability ?? 0) >= 2.5) return true;
  return (s.repetitions ?? 0) >= 3;
}

export async function recordReview(
  userId: string | number,
  charId: string,
  rating: number,
  meta?: { word: string; meaning: string }
) {
  let state = loadSrsState(userId);
  let entry = state[charId];

  if (!entry?.cardId) {
    const ensured = await ensureHanjaSrsCard(
      userId,
      charId,
      meta?.word || charId,
      meta?.meaning || 'Hán Hàn'
    );
    if (!ensured.ok) throw new Error(ensured.data?.message || 'Không tạo được thẻ FSRS');
    entry = {
      cardId: ensured.data.card?.id,
      due: ensured.data.card?.due,
      stability: ensured.data.card?.stability,
      difficulty: ensured.data.card?.difficulty,
    };
  }

  const result = await submitSrsReview(userId, entry.cardId!, rating);
  if (!result.ok) throw new Error(result.data?.message || 'Lỗi ghi nhận ôn tập');

  entry = {
    ...entry,
    stability: result.data.stability,
    difficulty: result.data.difficulty,
    due: result.data.next_review_at ? Date.parse(result.data.next_review_at) : Date.now(),
    state: result.data.state,
  };
  state = { ...state, [charId]: entry };
  saveSrsState(userId, state);
  touchStreak(userId);
  return entry;
}

export function loadStreak(userId: string | number) {
  if (!userId) return { count: 0, lastDate: null as string | null };
  try {
    const raw = localStorage.getItem(`${STREAK_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : { count: 0, lastDate: null };
  } catch {
    return { count: 0, lastDate: null };
  }
}

export function saveStreak(userId: string | number, streak: { count: number; lastDate: string | null }) {
  if (!userId) return;
  localStorage.setItem(`${STREAK_PREFIX}${userId}`, JSON.stringify(streak));
}

export function touchStreak(userId: string | number) {
  if (!userId) return loadStreak(userId);
  const today = todayStr();
  const streak = loadStreak(userId);
  if (streak.lastDate === today) return streak;
  if (streak.lastDate === yesterdayStr()) streak.count += 1;
  else streak.count = 1;
  streak.lastDate = today;
  saveStreak(userId, streak);
  return streak;
}

export function getSrsSummary(userId: string | number, charIds: string[]) {
  const state = loadSrsState(userId);
  const due = getDueCount(charIds, state);
  const learned = charIds.filter((id) => isLearnedCard(state[id])).length;
  const streak = loadStreak(userId);
  return { due, learned, total: charIds.length, streak: streak.count };
}

export function initCard(charId: string) {
  return { easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: todayStr(), charId };
}

/** @deprecated SM-2 compat shim */
export function reviewCard(existing: SrsCardState | undefined, quality: number) {
  return existing || initCard('');
}
