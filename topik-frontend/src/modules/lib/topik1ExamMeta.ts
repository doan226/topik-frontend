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
    // 24 câu nghe riêng + 3 đoạn nghe chung (25–26, 27–28, 29–30) = 27 đoạn audio.
    listeningAudioSegmentCount: 27,
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

/** Thời gian làm bài TOPIK I theo chuẩn: Nghe 40 phút, Đọc 60 phút (tổng 100 phút). */
export const TOPIK1_LISTENING_TIME_SEC = 40 * 60;
export const TOPIK1_READING_TIME_SEC = 60 * 60;
export const TOPIK1_TOTAL_TIME_SEC = TOPIK1_LISTENING_TIME_SEC + TOPIK1_READING_TIME_SEC;

// Điểm theo chuẩn TOPIK I: Nghe (1–30) tổng 100đ, Đọc (31–70) tổng 100đ.
// Nghe: 10 câu 4 điểm + 20 câu 3 điểm = 100. Đọc: 20 câu 3 điểm + 20 câu 2 điểm = 100.
const LISTENING_4PT = new Set([3, 4, 7, 8, 13, 14, 21, 22, 27, 28]);
const READING_3PT = new Set([
  // câu đọc (1–40 nội bộ) được 3 điểm; còn lại 2 điểm
  4, 8, 12, 16, 19, 20, 22, 24, 26, 28, 30, 32, 33, 35, 36, 37, 38, 39, 40, 21,
]);

/** Điểm của một câu theo số câu toàn đề (1–70). 1–30 = Nghe, 31–70 = Đọc. */
export function topik1QuestionPoints(globalNo: number): number {
  if (globalNo <= 30) return LISTENING_4PT.has(globalNo) ? 4 : 3;
  const readingNo = globalNo - 30; // 1–40
  return READING_3PT.has(readingNo) ? 3 : 2;
}
