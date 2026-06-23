import { getTopik1ExamMeta, isTopik1ExamId } from './topik1ExamMeta';

export type ExamTier = 'free' | 'paid';

export interface ExamMeta {
  examId: string;
  title: string;
  fullAudioUrl: string;
  /** Tổng số câu trắc nghiệm nghe (câu 21–50 theo cặp, 2 câu/đoạn audio) */
  listeningMcqCount: number;
  /** Số file MP3 đoạn nghe (20 đoạn đơn + 15 đoạn cặp) */
  listeningAudioSegmentCount: number;
  tier: ExamTier;
}

/** Danh sách đề tương tác TOPIK II (Nghe + Đọc). */
export const EXAMS: ExamMeta[] = [
  {
    examId: 'topik2-35',
    title: 'TOPIK II — Kỳ 35',
    fullAudioUrl: '/audio/topik2-35-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-36',
    title: 'TOPIK II — Kỳ 36',
    fullAudioUrl: '/audio/topik2-36-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-37',
    title: 'TOPIK II — Kỳ 37',
    fullAudioUrl: '/audio/topik2-37-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-41',
    title: 'TOPIK II — Kỳ 41',
    fullAudioUrl: '/audio/topik2-41-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-47',
    title: 'TOPIK II — Kỳ 47',
    fullAudioUrl: '/audio/topik2-47-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-52',
    title: 'TOPIK II — Kỳ 52',
    fullAudioUrl: '/audio/topik2-52-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-60',
    title: 'TOPIK II — Kỳ 60',
    fullAudioUrl: '/audio/topik2-60-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'free',
  },
  {
    examId: 'topik2-64',
    title: 'TOPIK II — Kỳ 64',
    fullAudioUrl: '/audio/topik2-64-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-83',
    title: 'TOPIK II — Kỳ 83',
    fullAudioUrl: '/audio/topik2-83-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-91',
    title: 'TOPIK II — Kỳ 91',
    fullAudioUrl: '/audio/topik2-91-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'free',
  },
  {
    examId: 'topik2-96',
    title: 'TOPIK II — Kỳ 96',
    fullAudioUrl: '/audio/topik2-96-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
  {
    examId: 'topik2-102',
    title: 'TOPIK II — Kỳ 102',
    fullAudioUrl: '/audio/topik2-102-listen-full.mp3',
    listeningMcqCount: 50,
    listeningAudioSegmentCount: 35,
    tier: 'paid',
  },
];

export const DEFAULT_EXAM = EXAMS.find((e) => e.examId === 'topik2-60') ?? EXAMS[0];

export function getExamMeta(examId: string): ExamMeta {
  if (isTopik1ExamId(examId)) {
    const t1 = getTopik1ExamMeta(examId);
    return {
      examId: t1.examId,
      title: t1.title,
      fullAudioUrl: t1.fullAudioUrl,
      listeningMcqCount: t1.listeningMcqCount,
      listeningAudioSegmentCount: t1.listeningAudioSegmentCount,
      tier: t1.tier,
    };
  }
  return EXAMS.find((e) => e.examId === examId) ?? DEFAULT_EXAM;
}

export function canAccessExam(exam: Pick<ExamMeta, 'tier'>, hasWriting: boolean): boolean {
  if (exam.tier === 'free') return true;
  return hasWriting;
}

/** "21_22" → "21–22", "1" → "1" */
export function formatListenQuestionNo(questionNo: string): string {
  return questionNo.replace('_', '–');
}
