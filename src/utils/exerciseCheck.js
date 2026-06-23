/** Chuẩn hóa chuỗi tiếng Hàn để so khớp đáp án */
export function normalizeKo(text) {
  return (text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?。！？]+$/g, '');
}

/** Parse "㉠ ...\n㉡ ..." từ đề official */
export function parseOfficialAnswerLines(answerStr) {
  if (!answerStr) return [];
  const out = [];
  const re = /(㉠|㉡|ㄱ|ㄴ)\s*(.+)/g;
  let m;
  const lines = answerStr.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(㉠|㉡|ㄱ|ㄴ)\s*(.+)$/);
    if (match) {
      out.push({ blank: match[1], text: match[2].trim() });
    }
  }
  if (!out.length && answerStr.trim()) {
    out.push({ blank: '㉠', text: answerStr.trim() });
  }
  return out;
}

export function getAcceptedForBlank(exercise, blank) {
  const fromExercise = (exercise.answers || []).filter((a) => a.blank === blank);
  if (fromExercise.length) return fromExercise;
  return (exercise.answers || []).filter((a) => a.blank === '㉠' && blank === '㉠');
}

export function checkBlankAnswer(userInput, acceptedList) {
  const norm = normalizeKo(userInput);
  if (!norm) return { ok: false, reason: 'empty' };
  for (const a of acceptedList) {
    const target = normalizeKo(a.text);
    if (norm === target) return { ok: true, matched: a.text, verified: a.verified };
    if (target.length >= 4 && norm.includes(target)) return { ok: true, matched: a.text, verified: a.verified };
  }
  return { ok: false, reason: 'mismatch' };
}

export function detectBlanksInPrompt(prompt) {
  const blanks = [];
  if (!prompt) return blanks;
  if (prompt.includes('㉠')) blanks.push('㉠');
  if (prompt.includes('㉡')) blanks.push('㉡');
  if (!blanks.length) blanks.push('㉠');
  return [...new Set(blanks)];
}
