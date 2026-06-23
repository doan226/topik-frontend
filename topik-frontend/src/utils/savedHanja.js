const STORAGE_PREFIX = 'topik_hanja_saved_';

export function loadSavedHanja(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSavedHanja(userId, items) {
  if (!userId) return;
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(items));
}

export function isHanjaSaved(userId, charId) {
  return loadSavedHanja(userId).some((i) => i.id === charId);
}

export function toggleSavedHanja(userId, character, { maxItems = -1 } = {}) {
  if (!userId || !character?.id) return { saved: false, items: [], blocked: false };
  const existing = loadSavedHanja(userId);
  const found = existing.find((i) => i.id === character.id);
  let next;
  let saved;
  if (found) {
    next = existing.filter((i) => i.id !== character.id);
    saved = false;
  } else {
    if (maxItems >= 0 && existing.length >= maxItems) {
      return { saved: false, items: existing, blocked: true };
    }
    next = [
      {
        id: character.id,
        char: character.char,
        reading: character.reading,
        meaningVi: character.meaningVi,
        savedAt: new Date().toISOString(),
      },
      ...existing,
    ];
    saved = true;
  }
  saveSavedHanja(userId, next);
  return { saved, items: next, blocked: false };
}

export function removeSavedHanja(userId, charId) {
  const next = loadSavedHanja(userId).filter((i) => i.id !== charId);
  saveSavedHanja(userId, next);
  return next;
}

export function filterSavedCharacters(characters, savedItems) {
  const ids = new Set(savedItems.map((i) => i.id));
  return characters.filter((c) => ids.has(c.id));
}
