import { apiFetch } from '../api/client';

const LOCAL_PREFIX = 'topik_hanja_pack_unlock_';

export function loadLocalUnlockedPacks(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUnlockedPacks(userId, packIds) {
  if (!userId) return;
  localStorage.setItem(`${LOCAL_PREFIX}${userId}`, JSON.stringify([...new Set(packIds)]));
}

export function addLocalUnlockedPack(userId, packId) {
  const existing = loadLocalUnlockedPacks(userId);
  if (!existing.includes(packId)) {
    saveLocalUnlockedPacks(userId, [...existing, packId]);
  }
}

export async function fetchUnlockedPacks(userId) {
  const local = loadLocalUnlockedPacks(userId);
  if (!userId) return local;
  try {
    const res = await apiFetch(`/api/v1/hanja/unlocks/${userId}`);
    if (res.ok) {
      const data = await res.json();
      const server = data.packIds || [];
      const merged = [...new Set([...local, ...server])];
      saveLocalUnlockedPacks(userId, merged);
      return merged;
    }
  } catch {
    /* offline */
  }
  return local;
}

export const HANJA_PACK_SKUS = [];

export function getPackSkuInfo(sku) {
  return HANJA_PACK_SKUS.find((p) => p.sku === sku) || null;
}

export function isPackUnlocked(packId, { isPremium, unlockedPackIds = [] } = {}) {
  if (isPremium) return true;
  return unlockedPackIds.includes(packId);
}
