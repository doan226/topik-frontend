import { getSrsCards, submitSrsReview, type ensurePassageVocab } from '../modules/lib/apiClient';

export interface PassageCard {
  id: number;
  word: string;
  meaning: string;
  source: string;
  specialty?: string | null;
  externalRef?: string;
  stability?: number;
  difficulty?: number;
  due?: number;
}

export function parsePassageSpecialty(specialty?: string | null) {
  if (!specialty) return null;
  const [examId, section, questionNo] = specialty.split('|');
  if (!examId) return null;
  return { examId, section, questionNo };
}

export function formatPassageContext(specialty?: string | null): string {
  const ctx = parsePassageSpecialty(specialty);
  if (!ctx) return '';
  const ky = ctx.examId.replace('topik2-', 'Kỳ ');
  const sec = ctx.section === 'listening' ? 'Nghe' : ctx.section === 'reading' ? 'Đọc' : ctx.section;
  const q = ctx.questionNo ? ` · Câu ${ctx.questionNo}` : '';
  return `${ky} · ${sec}${q}`;
}

export async function syncPassageCards(userId: number | string): Promise<PassageCard[]> {
  const cards = await getSrsCards(userId, 'all');
  return (cards as PassageCard[]).filter((c) => c.source === 'passage');
}

export function getPassageDueCards(cards: PassageCard[], limit = 50): PassageCard[] {
  const now = Date.now();
  return cards.filter((c) => (c.due ?? 0) <= now).slice(0, limit);
}

const passageCache: Record<string, Record<number, PassageCard>> = {};

export function cachePassageCard(userId: number | string, card: PassageCard) {
  const key = String(userId);
  if (!passageCache[key]) passageCache[key] = {};
  passageCache[key][card.id] = card;
}

export function getCachedPassageCards(userId: number | string): PassageCard[] {
  return Object.values(passageCache[String(userId)] || {});
}

export async function recordPassageReview(userId: number | string, cardId: number, rating: number) {
  const result = await submitSrsReview(userId, cardId, rating);
  if (!result.ok) throw new Error(result.data?.message || 'Lỗi ghi nhận ôn tập');
  const key = String(userId);
  const existing = passageCache[key]?.[cardId];
  if (existing) {
    passageCache[key][cardId] = {
      ...existing,
      stability: result.data.stability,
      difficulty: result.data.difficulty,
      due: result.data.next_review_at ? Date.parse(result.data.next_review_at) : Date.now(),
    };
  }
  return result.data;
}
