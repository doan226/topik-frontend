export interface TranscriptLine {
  lineMs: number;
  lineText: string;
}

/** Resolve a line's start time in ms, accepting either `lineMs` (ms) or `startTime` (seconds). */
function resolveLineMs(item: { lineMs?: unknown; startTime?: unknown } | null | undefined): number {
  if (item == null) return 0;
  if (item.lineMs != null) return Number(item.lineMs);
  if (item.startTime != null) return Math.round(Number(item.startTime) * 1000);
  return 0;
}

export interface MergedTranscriptLine extends TranscriptLine {
  questionNo: string;
  globalMs: number;
}

export interface TimedTranscriptSection {
  questionNo: string;
  lines: GlobalTimedLine[];
}

export interface GlobalTimedLine extends TranscriptLine {
  questionNo: string;
  globalMs: number;
  sectionIndex: number;
  lineIndex: number;
}

const PLACEHOLDER_RE =
  /^\[(?:Dán tiếng Hàn vào đây sau|Dán Transcript tiếng Hàn vào đây)\]$/i;

export function normalizeTranscript(raw: unknown): TranscriptLine[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => ({
        lineMs: resolveLineMs(item as { lineMs?: unknown; startTime?: unknown }),
        lineText: String((item as TranscriptLine)?.lineText ?? '').trim(),
      }))
      .filter((l) => l.lineText.length > 0);
  }
  if (typeof raw === 'object') {
    const one = raw as { lineMs?: unknown; startTime?: unknown; lineText?: unknown };
    const lineText = String(one.lineText ?? '').trim();
    return lineText ? [{ lineMs: resolveLineMs(one), lineText }] : [];
  }
  return [];
}

export function isPlaceholderTranscript(lines: TranscriptLine[]): boolean {
  return lines.length === 1 && PLACEHOLDER_RE.test(lines[0].lineText);
}

export function getPrimaryTranscriptText(contentJson: unknown): string | null {
  const c = contentJson as { transcript?: { lineText?: string }[] } | null | undefined;
  const raw = c?.transcript?.[0]?.lineText;
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text || isPlaceholderTranscript([{ lineMs: 0, lineText: text }])) return null;
  return text;
}

export function pickActiveLine(lines: TranscriptLine[], currentTimeMs: number): string {
  if (lines.length === 0) return '';
  let active = lines[0].lineText;
  for (const line of lines) {
    if (line.lineMs <= currentTimeMs) active = line.lineText;
  }
  return active;
}

export function buildFullExamTranscript(questions: any[]): MergedTranscriptLine[] {
  const merged: MergedTranscriptLine[] = [];
  for (const q of questions) {
    const content = q?.content_json || {};
    const offset = Number(content.exam_offset_ms ?? 0);
    const questionNo = String(q?.question_no ?? '');
    for (const line of normalizeTranscript(content.transcript)) {
      merged.push({
        questionNo,
        lineMs: line.lineMs,
        lineText: line.lineText,
        globalMs: offset + line.lineMs,
      });
    }
  }
  return merged.sort((a, b) => a.globalMs - b.globalMs);
}

export function pickActiveMergedLine(lines: MergedTranscriptLine[], currentTimeMs: number): MergedTranscriptLine | null {
  if (lines.length === 0) return null;
  let active: MergedTranscriptLine = lines[0];
  for (const line of lines) {
    if (line.globalMs <= currentTimeMs) active = line;
  }
  return active;
}

export function splitDialogueLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function hasExplicitTimings(lines: TranscriptLine[]): boolean {
  if (lines.length <= 1) return false;
  const distinctMs = new Set(lines.map((l) => l.lineMs));
  return distinctMs.size > 1;
}

export function estimateLineTimings(lines: string[], durationMs: number): TranscriptLine[] {
  if (lines.length === 0) return [];
  const safeDuration = Math.max(durationMs, 1);
  const weights = lines.map((line) => Math.max(line.length, 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let cursor = 0;
  return lines.map((lineText, idx) => {
    const lineMs = cursor;
    if (idx === lines.length - 1) {
      return { lineMs, lineText };
    }
    const slice = Math.round((weights[idx] / totalWeight) * safeDuration);
    cursor += Math.max(slice, 1);
    return { lineMs, lineText };
  });
}

export function resolveTimedLines(rawTranscript: unknown, durationMs: number): TranscriptLine[] {
  const normalized = normalizeTranscript(rawTranscript);
  if (normalized.length === 0) return [];

  if (hasExplicitTimings(normalized)) {
    return [...normalized].sort((a, b) => a.lineMs - b.lineMs);
  }

  const blob = normalized.map((l) => l.lineText).join('\n');
  const dialogueLines = splitDialogueLines(blob);
  if (dialogueLines.length === 0) return [];
  if (durationMs <= 0) {
    return dialogueLines.map((lineText, idx) => ({ lineMs: idx * 1000, lineText }));
  }
  return estimateLineTimings(dialogueLines, durationMs);
}

export function pickActiveLineIndex(lines: TranscriptLine[], currentTimeMs: number): number {
  if (lines.length === 0) return -1;
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].lineMs <= currentTimeMs) idx = i;
  }
  return idx;
}

export function pickActiveGlobalLine(
  flatLines: GlobalTimedLine[],
  currentTimeMs: number
): GlobalTimedLine | null {
  if (flatLines.length === 0) return null;
  let active = flatLines[0];
  for (const line of flatLines) {
    if (line.globalMs <= currentTimeMs) active = line;
  }
  return active;
}

export function getNextLineMs(lines: TranscriptLine[], currentTimeMs: number): number | null {
  if (lines.length === 0) return null;
  const threshold = currentTimeMs + 200;
  for (const line of lines) {
    if (line.lineMs > threshold) return line.lineMs;
  }
  return null;
}

export function getPrevLineMs(lines: TranscriptLine[], currentTimeMs: number): number | null {
  if (lines.length === 0) return null;
  const threshold = currentTimeMs - 200;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].lineMs < threshold) return lines[i].lineMs;
  }
  return null;
}

export function getNextGlobalLineMs(flatLines: GlobalTimedLine[], currentTimeMs: number): number | null {
  if (flatLines.length === 0) return null;
  const threshold = currentTimeMs + 200;
  for (const line of flatLines) {
    if (line.globalMs > threshold) return line.globalMs;
  }
  return null;
}

export function getPrevGlobalLineMs(flatLines: GlobalTimedLine[], currentTimeMs: number): number | null {
  if (flatLines.length === 0) return null;
  const threshold = currentTimeMs - 200;
  for (let i = flatLines.length - 1; i >= 0; i--) {
    if (flatLines[i].globalMs < threshold) return flatLines[i].globalMs;
  }
  return null;
}

export function buildTimedExamSections(
  questions: any[],
  fullDurationMs: number
): { sections: TimedTranscriptSection[]; flatLines: GlobalTimedLine[] } {
  const sections: TimedTranscriptSection[] = [];
  const flatLines: GlobalTimedLine[] = [];

  for (let sectionIndex = 0; sectionIndex < questions.length; sectionIndex++) {
    const q = questions[sectionIndex];
    const content = q?.content_json || {};
    const offset = Number(content.exam_offset_ms ?? 0);
    const nextOffset =
      sectionIndex < questions.length - 1
        ? Number(questions[sectionIndex + 1]?.content_json?.exam_offset_ms ?? fullDurationMs)
        : fullDurationMs;
    const segmentDuration = Math.max(nextOffset - offset, 1);
    const lines = resolveTimedLines(content.transcript, segmentDuration);
    const questionNo = String(q?.question_no ?? '');

    const sectionLines: GlobalTimedLine[] = lines.map((line, lineIndex) => ({
      ...line,
      globalMs: offset + line.lineMs,
      questionNo,
      sectionIndex,
      lineIndex,
    }));

    sections.push({ questionNo, lines: sectionLines });
    flatLines.push(...sectionLines);
  }

  flatLines.sort((a, b) => a.globalMs - b.globalMs);
  return { sections, flatLines };
}

/** Nhãn 35 đoạn MP3: 1–20 đơn + 15 cặp 21_22 … 49_50 */
export const LISTENING_SEGMENT_LABELS = [
  ...Array.from({ length: 20 }, (_, i) => String(i + 1)),
  ...Array.from({ length: 15 }, (_, i) => `${21 + i * 2}_${22 + i * 2}`),
];

export interface AudioSegment {
  questionNo: string;
  offsetMs: number;
  segmentIndex: number;
}

/** Gom câu hỏi theo exam_offset_ms duy nhất → 35 đoạn audio. */
export function buildAudioSegments(questions: any[]): AudioSegment[] {
  const seen = new Map<number, string>();
  for (const q of questions) {
    const offset = Number(q?.content_json?.exam_offset_ms);
    if (!Number.isFinite(offset)) continue;
    if (!seen.has(offset)) {
      seen.set(offset, String(q?.question_no ?? ''));
    }
  }
  const sorted = [...seen.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([offsetMs], segmentIndex) => ({
    questionNo: LISTENING_SEGMENT_LABELS[segmentIndex] ?? String(segmentIndex + 1),
    offsetMs,
    segmentIndex,
  }));
}

export function pickActiveSegmentIndex(segments: AudioSegment[], currentTimeMs: number): number {
  if (segments.length === 0) return -1;
  let idx = 0;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].offsetMs <= currentTimeMs) idx = i;
  }
  return idx;
}

export function getNextSegmentOffset(segments: AudioSegment[], currentTimeMs: number): number | null {
  if (segments.length === 0) return null;
  const threshold = currentTimeMs + 200;
  for (const seg of segments) {
    if (seg.offsetMs > threshold) return seg.offsetMs;
  }
  return null;
}

export function getPrevSegmentOffset(segments: AudioSegment[], currentTimeMs: number): number | null {
  if (segments.length === 0) return null;
  const threshold = currentTimeMs - 200;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].offsetMs < threshold) return segments[i].offsetMs;
  }
  return null;
}
