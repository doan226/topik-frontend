type BankRow = {
  examId?: string;
  section?: string;
  questionNo?: string;
  question_no?: string;
  tier?: string;
  correct_ans?: string;
  explanationVi?: string;
  distractorNotes?: Record<string, string>;
  content_json?: Record<string, unknown>;
};

export type InteractiveQuestion = {
  id: number | string;
  exam_id?: string;
  section?: string;
  question_no?: string;
  tier?: string;
  correct_ans?: string;
  explanationVi?: string;
  distractorNotes?: Record<string, string>;
  content_json?: Record<string, unknown>;
};

function normalizeQuestionNo(row: BankRow, index: number): string {
  const raw = row.questionNo ?? row.question_no;
  if (raw != null && String(raw).trim()) return String(raw).trim();
  return String(index + 1);
}

function bankRowToQuestion(row: BankRow, index: number, examId: string): InteractiveQuestion {
  const questionNo = normalizeQuestionNo(row, index);
  return {
    id: `bank-${examId}-${row.section ?? 'listening'}-${questionNo}`,
    exam_id: row.examId ?? examId,
    section: row.section,
    question_no: questionNo,
    tier: row.tier ?? 'free',
    correct_ans: row.correct_ans ?? '',
    explanationVi: row.explanationVi,
    distractorNotes: row.distractorNotes,
    content_json: row.content_json ?? {},
  };
}

export async function loadExamBankQuestions(
  examId: string,
  section: string
): Promise<InteractiveQuestion[]> {
  try {
    const res = await fetch(`/data/${examId}-bank.json`);
    if (!res.ok) return [];
    const rows = (await res.json()) as BankRow[];
    return rows
      .filter((r) => (r.section ?? 'listening') === section)
      .map((row, index) => bankRowToQuestion(row, index, examId));
  } catch {
    return [];
  }
}

export function isValidMcqAnswer(value: unknown): value is string {
  return typeof value === 'string' && /^[1-4]$/.test(value.trim());
}

export function resolveCorrectAnswer(bankAnswer?: string, apiAnswer?: string): string {
  if (isValidMcqAnswer(bankAnswer)) return bankAnswer.trim();
  if (isValidMcqAnswer(apiAnswer)) return apiAnswer.trim();
  return (bankAnswer ?? apiAnswer ?? '').trim();
}

export function isPlaceholderContent(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t) return false;
  return (
    /ảnh quét/i.test(t) ||
    /Xem PDF/i.test(t) ||
    /^\[Nghe câu/i.test(t) ||
    /^\[Lựa chọn/i.test(t) ||
    /^\[Đoạn văn/i.test(t)
  );
}

export function isMissingOrPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const t = value.trim();
  if (!t) return true;
  return isPlaceholderContent(t);
}

function preferBankText(bankVal: unknown, apiVal: unknown): unknown {
  const bankStr = typeof bankVal === 'string' ? bankVal.trim() : '';
  const apiStr = typeof apiVal === 'string' ? apiVal.trim() : '';
  if (bankStr && !isPlaceholderContent(bankStr)) return bankVal;
  if (apiStr && !isPlaceholderContent(apiStr)) return apiVal;
  return bankStr || apiStr || (bankVal as string) || (apiVal as string);
}

function mergeContentJson(
  bankContent: Record<string, unknown>,
  apiContent: Record<string, unknown>
) {
  const merged = { ...bankContent, ...apiContent };
  const bankOffset = bankContent.exam_offset_ms;
  const apiOffset = apiContent.exam_offset_ms;
  if (bankOffset != null && (apiOffset == null || apiOffset === 0)) {
    merged.exam_offset_ms = bankOffset;
  }
  if (bankContent.audio_url && !apiContent.audio_url) {
    merged.audio_url = bankContent.audio_url;
  }
  if (bankContent.image_url && !apiContent.image_url) {
    merged.image_url = bankContent.image_url;
  }
  // Bank JSON tĩnh là nguồn transcript chuẩn (đã có mốc thời gian thật từ ASR).
  // Ưu tiên transcript của bank hơn DB để tránh bản DB cũ (lineMs=0/placeholder) ghi đè.
  if (Array.isArray(bankContent.transcript) && bankContent.transcript.length > 0) {
    merged.transcript = bankContent.transcript;
  } else if (bankContent.transcript && !apiContent.transcript) {
    merged.transcript = bankContent.transcript;
  }

  merged.passage = preferBankText(bankContent.passage, apiContent.passage);
  merged.question = preferBankText(bankContent.question, apiContent.question);

  const bankOpts = Array.isArray(bankContent.options) ? bankContent.options : [];
  const apiOpts = Array.isArray(apiContent.options) ? apiContent.options : [];
  if (bankOpts.length >= 4) {
    const bankHasReal = bankOpts.some((o) => typeof o === 'string' && !isPlaceholderContent(o));
    const apiHasReal = apiOpts.some((o) => typeof o === 'string' && !isPlaceholderContent(o));
    if (bankHasReal || !apiHasReal) {
      merged.options = bankOpts;
    }
  }

  return merged;
}

/** Ưu tiên bank JSON tĩnh (Vercel); gộp id DB từ API khi có để nộp bài chấm điểm. */
export function mergeExamQuestions(
  bankQuestions: InteractiveQuestion[],
  apiQuestions: InteractiveQuestion[],
  section: string
): InteractiveQuestion[] {
  if (bankQuestions.length === 0) return apiQuestions;
  if (apiQuestions.length === 0) return bankQuestions;

  const apiByNo = new Map(apiQuestions.map((q) => [String(q.question_no), q]));

  const merged = bankQuestions.map((bankQ) => {
    const apiQ = apiByNo.get(String(bankQ.question_no));
    if (!apiQ) return bankQ;
    return {
      ...bankQ,
      ...apiQ,
      id: typeof apiQ.id === 'number' ? apiQ.id : bankQ.id,
      correct_ans: resolveCorrectAnswer(bankQ.correct_ans, apiQ.correct_ans),
      explanationVi: bankQ.explanationVi || apiQ.explanationVi,
      distractorNotes: bankQ.distractorNotes || apiQ.distractorNotes,
      content_json: mergeContentJson(
        (bankQ.content_json || {}) as Record<string, unknown>,
        (apiQ.content_json || {}) as Record<string, unknown>
      ),
    };
  });

  if (section === 'reading' && apiQuestions.length > merged.length) {
    const mergedNos = new Set(merged.map((q) => String(q.question_no)));
    for (const apiQ of apiQuestions) {
      if (!mergedNos.has(String(apiQ.question_no))) {
        merged.push(apiQ);
      }
    }
    merged.sort((a, b) => {
      const na = Number(String(a.question_no).split('_')[0]);
      const nb = Number(String(b.question_no).split('_')[0]);
      return (Number.isNaN(na) ? 0 : na) - (Number.isNaN(nb) ? 0 : nb);
    });
  }

  return merged;
}

export async function resolveInteractiveQuestions(
  examId: string,
  section: string,
  apiQuestions: InteractiveQuestion[]
): Promise<InteractiveQuestion[]> {
  const bankQuestions = await loadExamBankQuestions(examId, section);
  if (bankQuestions.length === 0) return apiQuestions;
  if (apiQuestions.length >= bankQuestions.length) {
    return mergeExamQuestions(bankQuestions, apiQuestions, section);
  }
  return mergeExamQuestions(bankQuestions, apiQuestions, section);
}
