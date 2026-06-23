const STORAGE_PREFIX = 'topik_pattern5152_saved_';

export function loadSavedPatterns5152(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSavedPatterns5152(userId, items) {
  if (!userId) return;
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(items));
}

export function isPattern5152Saved(userId, itemId) {
  return loadSavedPatterns5152(userId).some((i) => i.id === itemId);
}

export function toggleSavedPattern5152(userId, item, { maxItems = -1 } = {}) {
  if (!userId || !item?.id) return { saved: false, items: [], blocked: false };
  const existing = loadSavedPatterns5152(userId);
  const found = existing.find((i) => i.id === item.id);
  let next;
  let saved;
  if (found) {
    next = existing.filter((i) => i.id !== item.id);
    saved = false;
  } else {
    if (maxItems >= 0 && existing.length >= maxItems) {
      return { saved: false, items: existing, blocked: true };
    }
    next = [
      {
        id: item.id,
        kind: item.kind,
        questionType: item.questionType,
        ko: item.ko,
        vi: item.vi,
        label: item.label || item.topicKo || null,
        savedAt: new Date().toISOString(),
      },
      ...existing,
    ];
    saved = true;
  }
  saveSavedPatterns5152(userId, next);
  return { saved, items: next, blocked: false };
}

export function removeSavedPattern5152(userId, itemId) {
  const next = loadSavedPatterns5152(userId).filter((i) => i.id !== itemId);
  saveSavedPatterns5152(userId, next);
  return next;
}

export function filterBySavedIds5152(cards, savedItems, questionType = null) {
  const ids = new Set(savedItems.map((i) => i.id));
  return cards.filter((c) => ids.has(c.id) && (questionType == null || c.questionType === questionType));
}

export function countSavedByType(savedItems, questionType) {
  return savedItems.filter((i) => i.questionType === questionType).length;
}
