const prefix = 'topik_practice_unlock_';

export function loadUnlockedIds(userId, featureKey, periodDate) {
  if (!userId || !featureKey) return new Set();
  try {
    const raw = localStorage.getItem(`${prefix}${userId}_${featureKey}_${periodDate}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveUnlockedIds(userId, featureKey, periodDate, ids) {
  if (!userId || !featureKey) return;
  localStorage.setItem(
    `${prefix}${userId}_${featureKey}_${periodDate}`,
    JSON.stringify([...ids])
  );
}

export function addUnlockedId(userId, featureKey, periodDate, id) {
  const set = loadUnlockedIds(userId, featureKey, periodDate);
  set.add(String(id));
  saveUnlockedIds(userId, featureKey, periodDate, set);
  return set;
}
