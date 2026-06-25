export type Topik1ExamTier = 'free' | 'paid';

export interface Topik1ExamMeta {
  examId: string;
  title: string;
  fullAudioUrl: string;
  listeningMcqCount: number;
  listeningAudioSegmentCount: number;
  readingMcqCount: number;
  tier: Topik1ExamTier;
}

const SESSIONS: { ky: number; tier: Topik1ExamTier }[] = [
  { ky: 35, tier: 'paid' },
  { ky: 36, tier: 'paid' },
  { ky: 37, tier: 'paid' },
  { ky: 41, tier: 'paid' },
  { ky: 47, tier: 'paid' },
  { ky: 52, tier: 'paid' },
  { ky: 60, tier: 'free' },
  { ky: 64, tier: 'paid' },
  { ky: 83, tier: 'paid' },
  { ky: 91, tier: 'free' },
];

function buildExamMeta(ky: number, tier: Topik1ExamTier): Topik1ExamMeta {
  return {
    examId: `topik1-${ky}`,
    title: `TOPIK I — Kỳ ${ky}`,
    fullAudioUrl: `/audio/topik1-${ky}-listen-full.mp3`,
    listeningMcqCount: 30,
    listeningAudioSegmentCount: 30,
    readingMcqCount: 40,
    tier,
  };
}

/** Đề TOPIK I — nghe + đọc, giải thích tiếng Việt (10 kỳ công bố). */
export const TOPIK1_EXAMS: Topik1ExamMeta[] = SESSIONS.map(({ ky, tier }) =>
  buildExamMeta(ky, tier)
);

export const DEFAULT_TOPIK1_EXAM = TOPIK1_EXAMS.find((e) => e.examId === 'topik1-60') ?? TOPIK1_EXAMS[0];

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
