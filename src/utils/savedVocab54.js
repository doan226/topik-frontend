const STORAGE_PREFIX = 'topik_vocab54_saved_';

export function loadSavedVocab54(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSavedVocab54(userId, items) {
  if (!userId) return;
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(items));
}

export function isVocab54Saved(userId, itemId) {
  return loadSavedVocab54(userId).some((i) => i.id === itemId);
}

export function toggleSavedVocab54(userId, item, { maxItems = -1 } = {}) {
  if (!userId || !item?.id) return { saved: false, items: [], blocked: false };
  const existing = loadSavedVocab54(userId);
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
        ko: item.ko,
        vi: item.vi,
        type: item.type,
        topicId: item.topicId || null,
        topicKo: item.topicKo || null,
        labelVi: item.labelVi || null,
        savedAt: new Date().toISOString(),
      },
      ...existing,
    ];
    saved = true;
  }
  saveSavedVocab54(userId, next);
  return { saved, items: next, blocked: false };
}

export function removeSavedVocab54(userId, itemId) {
  const next = loadSavedVocab54(userId).filter((i) => i.id !== itemId);
  saveSavedVocab54(userId, next);
  return next;
}

export function filterBySavedIds(cards, savedItems) {
  const ids = new Set(savedItems.map((i) => i.id));
  return cards.filter((c) => ids.has(c.id));
}
