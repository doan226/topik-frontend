import { grammarMappings } from './contentData';
import { apiFetch } from '../api/client';

const STORAGE_PREFIX = 'topik_mistake_cards_';
const SRS_INTERVALS = [1, 3, 7, 14, 30];

export function findPatternId(wrongText) {
  if (!wrongText) return null;
  for (const m of grammarMappings) {
    if (wrongText.includes(m.match)) return m.patternId;
  }
  return null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function scheduleNextReview(card, remembered = true) {
  const prevCount = card.reviewCount || 0;
  const reviewCount = remembered ? prevCount + 1 : 0;
  const intervalIdx = Math.min(reviewCount, SRS_INTERVALS.length - 1);
  const days = remembered ? SRS_INTERVALS[intervalIdx] : SRS_INTERVALS[0];
  return {
    reviewCount,
    nextReviewDate: addDays(todayStr(), days),
    lastReviewedAt: new Date().toISOString(),
  };
}

export function getDueCards(cards, asOfDate = todayStr()) {
  return (cards || []).filter((c) => {
    if (!c.nextReviewDate) return true;
    return c.nextReviewDate <= asOfDate;
  });
}

export function markCardReviewed(card, remembered = true) {
  return { ...card, ...scheduleNextReview(card, remembered) };
}

export function extractMistakesFromHistory(historyRows) {
  const seen = new Set();
  const cards = [];
  for (const row of historyRows || []) {
    let ai = {};
    try {
      ai = JSON.parse(row.ai_feedback_json || row.aiFeedbackJson || '{}');
    } catch {
      ai = {};
    }
    const qType = row.question_number || row.questionNumber || 51;
    for (const err of ai.grammar_errors || []) {
      if (!err.sai || !err.đúng) continue;
      const key = `${err.sai}→${err.đúng}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        id: key,
        wrong: err.sai,
        correct: err.đúng,
        reasonVi: err.lý_do || '',
        patternId: findPatternId(err.sai),
        questionType: Number(qType),
        source: 'ai-grading',
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        nextReviewDate: null,
        reviewCount: 0,
      });
    }
  }
  return cards;
}

export function loadMistakeCards(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMistakeCards(userId, cards) {
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(cards));
}

export async function fetchMistakeCardsFromServer(userId) {
  if (!userId) return [];
  try {
    const res = await apiFetch(`/api/v1/learner/mistakes/${userId}`, { skipAuthRedirect: true });
    if (!res.ok) return loadMistakeCards(userId);
    const data = await res.json();
    const cards = (data.cards || []).map((c) => ({
      id: c.externalRef || `${c.wrong}→${c.correct}`,
      wrong: c.wrong,
      correct: c.correct,
      reasonVi: c.reasonVi || '',
      patternId: c.patternId || null,
      questionType: c.questionType || 51,
      source: 'ai-grading',
      cardId: c.id,
      nextReviewDate: c.due ? new Date(c.due).toISOString().slice(0, 10) : null,
      reviewCount: 0,
      isDue: c.isDue,
    }));
    if (cards.length) saveMistakeCards(userId, cards);
    return cards.length ? cards : loadMistakeCards(userId);
  } catch {
    return loadMistakeCards(userId);
  }
}

export async function syncMistakesToServer(userId, cards) {
  if (!userId || !cards?.length) return;
  try {
    await apiFetch('/api/v1/learner/mistakes/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cards),
      skipAuthRedirect: true,
    });
  } catch {
    /* offline */
  }
}

export async function reviewMistakeCardRemote(userId, card, remembered = true) {
  if (card?.cardId) {
    try {
      const res = await apiFetch(`/api/v1/learner/mistakes/${card.cardId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remembered, rating: remembered ? 3 : 1 }),
        skipAuthRedirect: true,
      });
      if (res.ok) {
        return fetchMistakeCardsFromServer(userId);
      }
    } catch {
      /* fallback local */
    }
  }
  return reviewMistakeCard(userId, card.id, remembered);
}

export function mergeMistakeCards(userId, newCards) {
  const existing = loadMistakeCards(userId);
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const c of newCards) {
    if (!byId.has(c.id)) {
      byId.set(c.id, {
        ...c,
        nextReviewDate: c.nextReviewDate ?? addDays(todayStr(), SRS_INTERVALS[0]),
        reviewCount: c.reviewCount ?? 0,
      });
    }
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  saveMistakeCards(userId, merged);
  return merged;
}

export function addMistakesFromGrading(userId, grammarErrors, questionType = 51) {
  if (!grammarErrors?.length) return loadMistakeCards(userId);
  const cards = grammarErrors
    .filter((e) => e.sai && e.đúng)
    .map((err) => ({
      id: `${err.sai}→${err.đúng}`,
      wrong: err.sai,
      correct: err.đúng,
      reasonVi: err.lý_do || '',
      patternId: findPatternId(err.sai),
      questionType: Number(questionType),
      source: 'ai-grading',
      createdAt: new Date().toISOString(),
      nextReviewDate: addDays(todayStr(), SRS_INTERVALS[0]),
      reviewCount: 0,
    }));
  return mergeMistakeCards(userId, cards);
}

export function reviewMistakeCard(userId, cardId, remembered = true) {
  const cards = loadMistakeCards(userId);
  const updated = cards.map((c) =>
    c.id === cardId ? markCardReviewed(c, remembered) : c
  );
  saveMistakeCards(userId, updated);
  return updated;
}
