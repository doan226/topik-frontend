import { apiUrl, apiFetch } from '../../api/client';
import { resolveInteractiveQuestions } from './examBankLoader';

export async function srsFetch(path: string, options: RequestInit = {}) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const res = await apiFetch(normalized, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function getSrsCards(userId: number | string, filter = 'all') {
  const { res, data } = await srsFetch(`/api/v1/hanja/srs/cards?userId=${userId}&filter=${filter}`);
  if (!res.ok || !data.success) return [];
  return data.cards || [];
}

export async function submitSrsReview(userId: number | string, cardId: number, rating: number) {
  const { res, data } = await srsFetch(`/api/v1/hanja/srs/reviews?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId, rating }),
  });
  return { ok: res.ok && data.success !== false, data };
}

export async function ensureHanjaSrsCard(
  userId: number | string,
  externalRef: string,
  word: string,
  meaning: string
) {
  const { res, data } = await srsFetch(`/api/v1/hanja/srs/ensure-hanja?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify({ externalRef, word, meaning }),
  });
  return { ok: res.ok && data.success !== false, data };
}

export async function ensurePassageVocab(
  userId: number | string,
  body: {
    word: string;
    meaning: string;
    examId: string;
    section: string;
    questionNo: string;
  }
) {
  const { res, data } = await srsFetch(`/api/v1/hanja/srs/ensure-passage?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { ok: res.ok && data.success !== false, data };
}

export async function migrateLocalSrs(userId: number | string, entries: unknown[]) {
  const { res, data } = await srsFetch(`/api/v1/hanja/srs/migrate?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(entries),
  });
  return { ok: res.ok, data };
}

export async function createSpecializedCard(
  userId: number | string,
  body: { word: string; meaning: string; specialty: string }
) {
  const { res, data } = await srsFetch(`/api/v1/hanja/srs/cards?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify({ ...body, source: 'specialized' }),
  });
  return { ok: res.ok && data.success !== false, data };
}

export async function lookupDict(word: string) {
  const { res, data } = await srsFetch(`/api/v1/dict?word=${encodeURIComponent(word)}`);
  return res.ok && data.success ? data : null;
}

export async function fetchInteractiveQuestions(
  section: string,
  userId: number | string,
  examId = 'topik2-60'
) {
  let apiQuestions: Awaited<ReturnType<typeof resolveInteractiveQuestions>> = [];
  try {
    const { res, data } = await srsFetch(
      `/api/v1/exams/interactive/questions?section=${section}&userId=${userId}&examId=${encodeURIComponent(examId)}`
    );
    if (res.ok && data.success) {
      apiQuestions = data.questions || [];
    }
  } catch {
    apiQuestions = [];
  }
  return resolveInteractiveQuestions(examId, section, apiQuestions);
}

export async function submitInteractiveAnswer(
  userId: number | string,
  questionId: number,
  userAnswer: string
) {
  const { res, data } = await srsFetch(`/api/v1/exams/interactive/submit?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify({ questionId, userAnswer }),
  });
  return { ok: res.ok && data.success, data };
}

export async function fetchAiExplain(body: Record<string, string>) {
  const { res, data } = await srsFetch('/api/v1/exams/interactive/ai-explain', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data };
}

export interface SectionProgress {
  answered: number;
  correct: number;
  total: number;
  lastAt: string | null;
}

export interface ExamProgressRow {
  examId: string;
  listening: SectionProgress;
  reading: SectionProgress;
}

export interface RecentSession {
  examId: string;
  section: string;
  answered: number;
  correct: number;
  total: number;
  lastAt: string | null;
}

export async function fetchInteractiveProgress(userId: number | string, examId?: string) {
  const q = examId ? `&examId=${encodeURIComponent(examId)}` : '';
  const { res, data } = await srsFetch(`/api/v1/exams/interactive/progress?userId=${userId}${q}`);
  if (!res.ok || !data.success) {
    return { exams: [] as ExamProgressRow[], recentSessions: [] as RecentSession[] };
  }
  return {
    exams: (data.exams || []) as ExamProgressRow[],
    recentSessions: (data.recentSessions || []) as RecentSession[],
  };
}
