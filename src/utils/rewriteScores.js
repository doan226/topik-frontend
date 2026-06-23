const STORAGE_PREFIX = 'topik_rewrite_scores_';

/**
 * @typedef {{ questionId: string, questionType: number, version: number, score: number, maxScore: number, gradedAt: string }} RewriteScoreEntry
 */

export function loadRewriteScores(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRewriteScore(userId, entry) {
  if (!userId || !entry?.questionId) return;
  const list = loadRewriteScores(userId).filter(
    (e) => !(e.questionId === entry.questionId && e.version === entry.version)
  );
  list.push({
    ...entry,
    gradedAt: entry.gradedAt || new Date().toISOString(),
  });
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(list.slice(-200)));
}

/** Returns { v1, v2, delta } when both versions exist for same question. */
export function getRewriteComparison(userId, questionId) {
  const entries = loadRewriteScores(userId).filter((e) => e.questionId === questionId);
  const v1 = entries.find((e) => e.version === 1);
  const v2 = entries.find((e) => e.version === 2);
  if (!v1 || !v2) return null;
  return {
    v1,
    v2,
    delta: v2.score - v1.score,
  };
}

export function listRewriteComparisons(userId, questionType = null) {
  const entries = loadRewriteScores(userId);
  const byQuestion = new Map();
  for (const e of entries) {
    if (questionType != null && e.questionType !== questionType) continue;
    if (!byQuestion.has(e.questionId)) byQuestion.set(e.questionId, []);
    byQuestion.get(e.questionId).push(e);
  }
  const results = [];
  for (const [questionId, versions] of byQuestion) {
    const cmp = getRewriteComparison(userId, questionId);
    if (cmp) results.push({ questionId, ...cmp });
  }
  return results.sort((a, b) => (b.v2.gradedAt || '').localeCompare(a.v2.gradedAt || ''));
}

export default loadRewriteScores;
