import { TOPIK91_EXAM_META } from './topik91ExamMeta';

const BANK_URL = '/data/topik2-91-bank.json';

type BankRow = {
  examId?: string;
  section?: string;
  questionNo?: string;
  question_no?: string;
  tier?: string;
  correct_ans?: string;
  content_json?: Record<string, unknown>;
};

function normalizeQuestionNo(row: BankRow): string {
  return String(row.questionNo ?? row.question_no ?? '').trim();
}

function bankRowToQuestion(row: BankRow, index: number) {
  return {
    id: `bank-${normalizeQuestionNo(row) || index}`,
    exam_id: row.examId ?? TOPIK91_EXAM_META.examId,
    section: row.section ?? 'listening',
    question_no: normalizeQuestionNo(row),
    tier: row.tier ?? 'pro',
    correct_ans: row.correct_ans ?? '',
    content_json: row.content_json ?? {},
  };
}

async function loadBankQuestions(): Promise<any[]> {
  const res = await fetch(BANK_URL);
  if (!res.ok) return [];
  const rows = (await res.json()) as BankRow[];
  return rows
    .filter((r) => (r.section ?? 'listening') === 'listening')
    .map(bankRowToQuestion);
}

function mergeContentJson(bankContent: Record<string, unknown>, apiContent: Record<string, unknown>) {
  const merged = { ...bankContent, ...apiContent };
  const bankOffset = bankContent.exam_offset_ms;
  const apiOffset = apiContent.exam_offset_ms;
  if (bankOffset != null && (apiOffset == null || apiOffset === 0)) {
    merged.exam_offset_ms = bankOffset;
  }
  if (bankContent.audio_url && !apiContent.audio_url) {
    merged.audio_url = bankContent.audio_url;
  }
  return merged;
}

/** Merge API + bank JSON: đủ 35 đoạn và luôn có exam_offset_ms từ bank khi API thiếu. */
export async function ensureFullListeningQuestions(apiQuestions: any[]): Promise<any[]> {
  const bankQuestions = await loadBankQuestions();
  if (bankQuestions.length === 0) return apiQuestions;

  const apiByNo = new Map(apiQuestions.map((q) => [String(q.question_no), q]));

  const merged = bankQuestions.map((bankQ) => {
    const apiQ = apiByNo.get(String(bankQ.question_no));
    if (!apiQ) return bankQ;
    return {
      ...bankQ,
      ...apiQ,
      content_json: mergeContentJson(
        (bankQ.content_json || {}) as Record<string, unknown>,
        (apiQ.content_json || {}) as Record<string, unknown>
      ),
    };
  });

  return merged.length > 0 ? merged : apiQuestions;
}
