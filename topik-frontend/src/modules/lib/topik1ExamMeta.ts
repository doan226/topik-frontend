import { TOPIK1_EXAMS, type Topik1ExamMeta } from './topik1ExamMeta';

const EXTRA_SESSIONS = [99, 100, 101, 102, 103, 104, 105];

function buildExamMeta(session: number, tier: 'free' | 'paid'): Topik1ExamMeta {
  return {
    examId: `topik1-${session}`,
    title: `TOPIK I — Kỳ ${session}`,
    fullAudioUrl: `/audio/topik1-${session}-listen-full.mp3`,
    listeningMcqCount: 30,
    listeningAudioSegmentCount: 30,
    readingMcqCount: 40,
    tier,
  };
}

/** Đề TOPIK I — nghe + đọc, giải thích tiếng Việt (10 kỳ MVP). */
export const TOPIK1_EXAMS: Topik1ExamMeta[] = [
  {
    examId: 'topik1-96',
    title: 'TOPIK I — Kỳ 96',
    fullAudioUrl: '/audio/topik1-96-listen-full.mp3',
    listeningMcqCount: 30,
    listeningAudioSegmentCount: 30,
    readingMcqCount: 40,
    tier: 'free',
  },
  {
    examId: 'topik1-97',
    title: 'TOPIK I — Kỳ 97',
    fullAudioUrl: '/audio/topik1-97-listen-full.mp3',
    listeningMcqCount: 30,
    listeningAudioSegmentCount: 30,
    readingMcqCount: 40,
    tier: 'paid',
  },
  {
    examId: 'topik1-98',
    title: 'TOPIK I — Kỳ 98',
    fullAudioUrl: '/audio/topik1-98-listen-full.mp3',
    listeningMcqCount: 30,
    listeningAudioSegmentCount: 30,
    readingMcqCount: 40,
    tier: 'paid',
  },
  ...EXTRA_SESSIONS.map((s) => buildExamMeta(s, 'paid')),
];

export const DEFAULT_TOPIK1_EXAM = TOPIK1_EXAMS[0];

export function isTopik1ExamId(examId: string): boolean {
  return examId.startsWith('topik1-');
}

export function getTopik1ExamMeta(examId: string): Topik1ExamMeta {
  return TOPIK1_EXAMS.find((e) => e.examId === examId) ?? DEFAULT_TOPIK1_EXAM;
}

/** "21_22" → "21–22", "1" → "1" */
export function formatTopik1ListenQuestionNo(questionNo: string): string {
  return questionNo.replace('_', '–');
}
