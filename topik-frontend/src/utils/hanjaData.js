import hanjaBank from '../../data/hanja-bank.json';
import { vocabTopics } from './contentData';
import { getDueCards, isLearnedCard } from './hanjaSrs';

export const hanjaMeta = hanjaBank.meta || {};
export const hanjaPacks = hanjaBank.packs || [];
export const hanjaCharacters = hanjaBank.characters || [];

/** 30 bộ thủ phổ biến — free tier giới hạn đến đây */
export const POPULAR_RADICALS = [
  '人', '口', '心', '手', '水', '火', '木', '金', '土', '日',
  '月', '女', '子', '大', '小', '山', '石', '田', '目', '耳',
  '足', '身', '言', '走', '車', '食', '衣', '竹', '米', '門',
];

const charById = new Map(hanjaCharacters.map((c) => [c.id, c]));

/** Từ tiếng Hàn hiển thị chính (không dùng chữ Hán trên UI) */
export function getDisplayWord(c) {
  if (!c) return '';
  return c.meaningKo || c.compounds?.[0]?.ko || c.reading || '';
}

export function getDisplayLabel(c) {
  if (!c) return '';
  const word = getDisplayWord(c);
  return c.reading && word !== c.reading ? `${word} · ${c.reading}` : word;
}

function normalize(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCharacterById(id) {
  return charById.get(id) || null;
}

export function getPackById(packId) {
  return hanjaPacks.find((p) => p.packId === packId) || null;
}

export function getPackIdsForCharacter(charId) {
  if (!charId) return [];
  return hanjaPacks.filter((p) => p.charIds?.includes(charId)).map((p) => p.packId);
}

export function getCharactersForPack(packId) {
  const pack = getPackById(packId);
  if (!pack) return [];
  return pack.charIds.map((id) => charById.get(id)).filter(Boolean);
}

export function isPackAccessFree(access) {
  return access === 'free';
}

export function isPackAccessPremium(access) {
  return access === 'premium';
}

export function isPackAccessSku(access) {
  return typeof access === 'string' && access.startsWith('pack:');
}

export function getSkuFromAccess(access) {
  if (!isPackAccessSku(access)) return null;
  return access.slice('pack:'.length);
}

export function canAccessPack(pack, { hasHanja, isPremium, unlockedPackIds = [] } = {}) {
  if (!pack) return false;
  if (isPackAccessFree(pack.access)) return true;
  const hanja = hasHanja ?? isPremium;
  if (isPackAccessPremium(pack.access)) {
    return Boolean(hanja);
  }
  if (isPackAccessSku(pack.access)) {
    const sku = getSkuFromAccess(pack.access);
    if (hanja) return true;
    return unlockedPackIds.includes(pack.packId) || unlockedPackIds.includes(sku);
  }
  return false;
}

export function getAccessiblePacks(ctx = {}) {
  return hanjaPacks.filter((p) => canAccessPack(p, ctx));
}

export function getAccessibleCharacters(ctx = {}) {
  const ids = new Set();
  for (const pack of getAccessiblePacks(ctx)) {
    for (const cid of pack.charIds) ids.add(cid);
  }
  return [...ids].map((id) => charById.get(id)).filter(Boolean);
}

export function searchCharacters(query, { packId = null, accessibleOnly = false, hasHanja, isPremium = false, unlockedPackIds = [] } = {}) {
  const q = normalize(query);
  let pool = hanjaCharacters;

  if (packId) {
    pool = getCharactersForPack(packId);
  } else if (accessibleOnly) {
    pool = getAccessibleCharacters({ hasHanja, isPremium, unlockedPackIds });
  }

  if (!q) return pool;

  return pool.filter((c) => {
    const hay = [
      c.char,
      c.reading,
      c.meaningKo,
      c.meaningVi,
      ...(c.compounds || []).flatMap((co) => [co.ko, co.vi]),
      ...(c.topics || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q) || normalize(c.reading).includes(q) || normalize(c.meaningVi).includes(q);
  });
}

export function groupByReading(characters = hanjaCharacters) {
  const groups = new Map();
  for (const c of characters) {
    const key = c.reading || '?';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
    .map(([reading, chars]) => ({ reading, characters: chars }));
}

export function groupByRadical(characters = hanjaCharacters) {
  const groups = new Map();
  for (const c of characters) {
    const rad = c.radical || '—';
    if (!groups.has(rad)) groups.set(rad, []);
    groups.get(rad).push(c);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([radical, chars]) => ({ radical, characters: chars }));
}

export function getRadicalGroups({ hasHanja, isPremium = false, unlockedPackIds = [] } = {}) {
  const accessible = getAccessibleCharacters({ hasHanja, isPremium, unlockedPackIds });
  const allGroups = groupByRadical(accessible.length ? accessible : hanjaCharacters);
  if (hasHanja || isPremium) return allGroups;
  const popular = new Set(POPULAR_RADICALS);
  return allGroups.filter((g) => popular.has(g.radical));
}

export function getPackProgress(packId, srsState = {}) {
  const chars = getCharactersForPack(packId);
  if (!chars.length) return { total: 0, learned: 0, percent: 0 };
  const learned = chars.filter((c) => isLearnedCard(srsState[c.id])).length;
  return {
    total: chars.length,
    learned,
    percent: Math.round((learned / chars.length) * 100),
  };
}

export const TOPIK100_PACK_ID = 'topik100-frequent';
export const TOPIK_PREMIUM_90_PACK_ID = 'topik-premium-90';

export function getTopik100Subgroups(packId = TOPIK100_PACK_ID) {
  const chars = getCharactersForPack(packId);
  return {
    action: chars.filter((c) => c.topics?.includes('action')),
    concept: chars.filter((c) => c.topics?.includes('concept')),
    all: chars,
  };
}

export function getTopik90Subgroups(packId = TOPIK_PREMIUM_90_PACK_ID) {
  const chars = getCharactersForPack(packId);
  return {
    action: chars.filter((c) => c.topics?.includes('action')),
    concept: chars.filter((c) => c.topics?.includes('concept')),
    academic: chars.filter((c) => c.topics?.includes('academic')),
    all: chars,
  };
}

export function getTodayStudySet(characters, srsState, { limit = 5 } = {}) {
  if (!characters?.length) return [];
  const charIds = characters.map((c) => c.id);
  const dueIds = new Set(getDueCards(charIds, srsState, { limit: 9999 }));
  return characters.filter((c) => dueIds.has(c.id)).slice(0, limit);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct, pool, count, keyFn) {
  const correctVal = keyFn(correct);
  const candidates = pool.filter((c) => c.id !== correct.id && keyFn(c) !== correctVal);
  return shuffle(candidates).slice(0, count);
}

const QUIZ_TYPES = ['compound', 'word', 'readingMean', 'mixed'];

export function generateQuizQuestion(characters, type = 'mixed') {
  if (!characters.length) return null;
  const pool = characters.filter((c) => c.meaningVi);
  if (!pool.length) return null;

  let quizType = type;
  if (type === 'mixed') {
    quizType = QUIZ_TYPES[Math.floor(Math.random() * (QUIZ_TYPES.length - 1))];
  }

  const target = pool[Math.floor(Math.random() * pool.length)];

  if (quizType === 'compound') {
    const withCompounds = pool.filter((c) => c.compounds?.some((co) => co.vi));
    const char = withCompounds.length
      ? withCompounds[Math.floor(Math.random() * withCompounds.length)]
      : target;
    const viable = char.compounds.filter((co) => co.vi);
    const compound = viable[Math.floor(Math.random() * viable.length)];
    const allVi = withCompounds.flatMap((c) =>
      (c.compounds || []).map((co) => co.vi).filter(Boolean)
    );
    const distractors = shuffle(allVi.filter((v) => v !== compound.vi)).slice(0, 3);
    const options = shuffle([compound.vi, ...distractors].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
    return {
      type: 'compound',
      charId: char.id,
      prompt: compound.ko,
      promptSub: 'Chọn nghĩa tiếng Việt',
      correctAnswer: compound.vi,
      options,
      explanation: `${compound.ko} — ${compound.vi}`,
    };
  }

  if (quizType === 'word') {
    const word = getDisplayWord(target);
    const distractors = pickDistractors(target, pool, 3, (c) => c.meaningVi);
    const options = shuffle([target.meaningVi, ...distractors.map((d) => d.meaningVi)]);
    return {
      type: 'word',
      charId: target.id,
      prompt: word,
      promptSub: 'Chọn nghĩa tiếng Việt',
      correctAnswer: target.meaningVi,
      options,
      explanation: `${word} — ${target.meaningVi}`,
    };
  }

  if (quizType === 'readingMean') {
    const distractors = pickDistractors(target, pool, 3, (c) => c.meaningVi);
    const options = shuffle([target.meaningVi, ...distractors.map((d) => d.meaningVi)]);
    return {
      type: 'readingMean',
      charId: target.id,
      prompt: target.reading,
      promptSub: `Từ tiêu biểu: ${getDisplayWord(target)}`,
      correctAnswer: target.meaningVi,
      options,
      explanation: `${target.reading} (${getDisplayWord(target)}) — ${target.meaningVi}`,
    };
  }

  const distractors = pickDistractors(target, pool, 3, (c) => c.meaningVi);
  const options = shuffle([target.meaningVi, ...distractors.map((d) => d.meaningVi)]);
  return {
    type: 'word',
    charId: target.id,
    prompt: getDisplayWord(target),
    promptSub: target.reading ? `Âm gốc: ${target.reading}` : 'Chọn nghĩa tiếng Việt',
    correctAnswer: target.meaningVi,
    options,
    explanation: `${getDisplayWord(target)} — ${target.meaningVi}`,
  };
}

export function generateQuizSession(characters, count = 5) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const q = generateQuizQuestion(characters, 'mixed');
    if (q) questions.push(q);
  }
  return questions;
}

/** Cross-link TOPIK vocab 54 — tìm chữ Hán qua từ Hàn hoặc compound */
export function getHanjaForKoreanWord(koWord) {
  if (!koWord) return [];
  const q = normalize(koWord);
  const results = [];

  for (const c of hanjaCharacters) {
    for (const comp of c.compounds || []) {
      if (normalize(comp.ko) === q || normalize(comp.ko).includes(q) || q.includes(normalize(comp.ko))) {
        results.push({
          charId: c.id,
          char: c.char,
          reading: c.reading,
          meaningVi: c.meaningVi,
          compound: comp,
        });
      }
    }
  }
  return results;
}

/** Gợi ý chữ Hán từ vocab câu 54 */
export function getHanjaSuggestionsForVocab54(limit = 20) {
  const seen = new Set();
  const out = [];
  for (const topic of vocabTopics) {
    for (const term of topic.terms || []) {
      const matches = getHanjaForKoreanWord(term.ko);
      for (const m of matches) {
        const key = `${m.charId}:${m.compound?.ko || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...m, topicId: topic.topicId, topicVi: topic.topicVi, vocabKo: term.ko, vocabVi: term.vi });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export function getHanjaStats() {
  return {
    packs: hanjaPacks.length,
    characters: hanjaCharacters.length,
    withRadical: hanjaCharacters.filter((c) => c.radical).length,
    withCompounds: hanjaCharacters.filter((c) => c.compounds?.length).length,
  };
}
