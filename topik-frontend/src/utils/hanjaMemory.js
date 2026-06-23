import memoryHooks from '../../data/hanja-memory-hooks.json';

export const BEGINNER_CORE_PACK_ID = 'beginner-core';
export const TOPIK_INTERMEDIATE_PACK_ID = 'topik-intermediate';

export const SHOWCASE_PACK_IDS = new Set([
  BEGINNER_CORE_PACK_ID,
  TOPIK_INTERMEDIATE_PACK_ID,
]);

export const PACK_VISUAL_THEMES = {
  [BEGINNER_CORE_PACK_ID]: {
    gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 45%, var(--app-surface-2) 100%)',
    border: '#10b981',
    accent: '#059669',
    accentSoft: '#d1fae5',
    icon: '🌱',
    tagline: '20 gốc âm theo vần — nền tảng đọc từ ghép TOPIK',
    tip: 'Học theo nhóm âm (가, 강, 교…) để nhớ chuỗi từ cùng âm gốc.',
  },
  [TOPIK_INTERMEDIATE_PACK_ID]: {
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, var(--app-surface-2) 100%)',
    border: '#f59e0b',
    accent: '#d97706',
    accentSoft: '#ffedd5',
    icon: '🔥',
    tagline: '27 gốc âm nâng cao — mở khóa từ học thuật & đề khó',
    tip: 'Mỗi chữ Hán là “mảnh ghép” — ghép vào từ Hàn bạn đã biết.',
  },
};

const hooksById = memoryHooks;

export function isShowcasePack(packId) {
  return SHOWCASE_PACK_IDS.has(packId);
}

export function getPackTheme(packId) {
  return PACK_VISUAL_THEMES[packId] || null;
}

/** Bỏ chữ Hán (CJK) — UI chỉ dùng Hán Việt + tiếng Hàn */
function withoutHanChars(text) {
  if (!text) return '';
  return text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '').replace(/\s+/g, ' ').trim();
}

export function getMemoryHook(character) {
  if (!character?.id) return null;
  const entry = hooksById[character.id];
  if (entry) {
    return {
      emoji: entry.emoji || '💡',
      hook: withoutHanChars(entry.hook || ''),
      mnemonicVi: withoutHanChars(entry.mnemonicVi || character.mnemonicVi || ''),
    };
  }
  if (character.mnemonicVi) {
    return { emoji: '💡', hook: '', mnemonicVi: withoutHanChars(character.mnemonicVi) };
  }
  const hv = character.hanViet || '';
  const word = character.compounds?.[0]?.ko || character.meaningKo || '';
  if (hv && word) {
    return {
      emoji: '🔗',
      hook: `${hv} → ${word}`,
      mnemonicVi: `Âm ${character.reading} (${hv}): gặp trong ${word} — ${character.meaningVi || ''}`.trim(),
    };
  }
  return null;
}

export function getQuickCompound(character) {
  return character?.compounds?.[0] || null;
}
