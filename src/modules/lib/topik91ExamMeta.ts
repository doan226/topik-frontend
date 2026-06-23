export const TOPIK91_EXAM_META = {
  examId: 'topik2-91',
  title: 'TOPIK II — Kỳ 91',
  fullAudioUrl: '/audio/topik2-91-listen-full.mp3',
  /** 50 câu trắc nghiệm nghe (câu 21–50 theo cặp, 2 câu/đoạn audio) */
  listeningMcqCount: 50,
  /** 35 file MP3: 20 đoạn đơn (câu 1–20) + 15 đoạn cặp (câu 21–50) */
  listeningAudioSegmentCount: 35,
} as const;

/** "21_22" → "21–22", "1" → "1" */
export function formatListenQuestionNo(questionNo: string): string {
  return questionNo.replace('_', '–');
}
