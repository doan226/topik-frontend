export interface TargetRange {
  min: number;
  max: number;
  label: string;
}

export interface LengthProgress {
  count: number;
  min: number;
  max: number;
  pct: number;
  status: 'empty' | 'under' | 'ok' | 'over';
  label: string;
}

/** Count Korean syllables (Hangul + jamo), excluding whitespace — matches backend logic. */
export function countKoreanChars(text: string | null | undefined): number {
  if (!text) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c <= 32) continue;
    if ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x3130 && c <= 0x318f) || (c >= 0x1100 && c <= 0x11ff)) {
      count++;
    }
  }
  return count;
}

export function getTargetRange(questionType: number): TargetRange | null {
  switch (questionType) {
    case 53:
      return { min: 200, max: 300, label: '200–300 ký tự Hàn' };
    case 54:
      return { min: 600, max: 700, label: '600–700 ký tự Hàn' };
    default:
      return null;
  }
}

export function getLengthProgress(questionType: number, count: number): LengthProgress | null {
  const range = getTargetRange(questionType);
  if (!range) return null;

  const { min, max, label } = range;
  let status: LengthProgress['status'] = 'empty';
  if (count === 0) status = 'empty';
  else if (count < min) status = 'under';
  else if (count > max) status = 'over';
  else status = 'ok';

  const pct = count <= 0 ? 0 : Math.min(100, Math.round((count / max) * 100));

  return { count, min, max, pct, status, label };
}

export function parseQ51Q52Blanks(text: string | null | undefined): { gieok: string; nieun: string } {
  if (!text) return { gieok: '', nieun: '' };
  const gieok = text.match(/\(ㄱ\):\s*([^\n]*)/)?.[1]?.trim() ?? '';
  const nieun = text.match(/\(ㄴ\):\s*([^\n]*)/)?.[1]?.trim() ?? '';
  return { gieok, nieun };
}

export function buildQ51Q52Text(gieok: string, nieun: string): string {
  return `Đáp án của học viên:\n(ㄱ): ${gieok.trim()}\n(ㄴ): ${nieun.trim()}`;
}

export function parseQ54SubPrompts(prompt: string | null | undefined): string[] {
  if (!prompt) return [];
  const lines = prompt.split('\n');
  const subs: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\.\s*(.+)/);
    if (m) subs.push(m[2].trim());
  }
  return subs.slice(0, 3);
}

export interface ChecklistItem {
  id: string;
  label: string;
  ok: boolean;
  warn?: boolean;
}

export function buildPreSubmitChecklist(
  questionType: number,
  answer: string,
  questionPrompt?: string
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const trimmed = (answer || '').trim();
  const koreanCount = countKoreanChars(answer);

  items.push({
    id: 'has-content',
    label: 'Đã nhập bài làm',
    ok: trimmed.length > 0,
  });

  if (questionType === 51 || questionType === 52) {
    const { gieok, nieun } = parseQ51Q52Blanks(answer);
    items.push({ id: 'gieok', label: 'Đã điền ô (ㄱ)', ok: Boolean(gieok) });
    items.push({ id: 'nieun', label: 'Đã điền ô (ㄴ)', ok: Boolean(nieun) });
  }

  const range = getTargetRange(questionType);
  if (range) {
    const inRange = koreanCount >= range.min && koreanCount <= range.max;
    items.push({
      id: 'char-count',
      label: `Độ dài ${range.label} (hiện: ${koreanCount})`,
      ok: inRange,
      warn: koreanCount > 0 && !inRange,
    });
  }

  if (questionType === 51) {
    const haeyo = /(해요|했어요|할 거예요|이에요|예요|거예요)/.test(answer);
    items.push({
      id: 'speech-51',
      label: 'Thể trang trọng (습니다체), tránh 해요체',
      ok: !haeyo || koreanCount === 0,
      warn: haeyo && koreanCount > 0,
    });
  }

  if (questionType === 54) {
    const subs = parseQ54SubPrompts(questionPrompt);
    subs.forEach((sub, i) => {
      const keywords = sub.replace(/[?？.]/g, '').split(/\s+/).filter((w) => w.length >= 2);
      const covered = keywords.length === 0 || keywords.some((kw) => answer.includes(kw.slice(0, 2)));
      items.push({
        id: `q54-point-${i + 1}`,
        label: `Ý ${i + 1}: ${sub.length > 40 ? `${sub.slice(0, 40)}…` : sub}`,
        ok: covered && koreanCount > 50,
        warn: koreanCount > 50 && !covered,
      });
    });
  }

  return items;
}
