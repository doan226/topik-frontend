/**
 * Bổ sung exam_offset_ms vào bank JSON từ file MP3 đoạn nghe local.
 *
 *   node scripts/enrich-exam-offsets.mjs 91
 *   node scripts/enrich-exam-offsets.mjs 60
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const EXAM = process.argv[2];
if (!EXAM || !/^\d+$/.test(EXAM)) {
  console.error('Usage: node scripts/enrich-exam-offsets.mjs <ky>   (vd: 91, 60)');
  process.exit(1);
}

const EXAM_ID = `topik2-${EXAM}`;
const AUDIO_DIR = path.join(FRONTEND_ROOT, 'public', 'audio');
const DATA_BANK = path.join(FRONTEND_ROOT, 'data', `${EXAM_ID}-bank.json`);
const PUBLIC_BANK = path.join(FRONTEND_ROOT, 'public', 'data', `${EXAM_ID}-bank.json`);

const QUESTION_ORDER = [
  ...Array.from({ length: 20 }, (_, i) => String(i + 1)),
  ...Array.from({ length: 15 }, (_, i) => `${21 + i * 2}_${22 + i * 2}`),
];

function estimateDurationMs(filePath) {
  const { size } = fs.statSync(filePath);
  return Math.round(((size * 8) / 128000) * 1000);
}

function audioFileForQuestionNo(questionNo) {
  return `${EXAM_ID}-listen-q${questionNo}.mp3`;
}

function buildOffsetMap() {
  const offsets = new Map();
  let offsetMs = 0;
  for (const questionNo of QUESTION_ORDER) {
    const fileName = audioFileForQuestionNo(questionNo);
    const audioPath = path.join(AUDIO_DIR, fileName);
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Không tìm thấy audio: ${audioPath}`);
    }
    offsets.set(questionNo, offsetMs);
    offsetMs += estimateDurationMs(audioPath);
    console.log(`  ${questionNo}: ${offsets.get(questionNo)} ms (+${estimateDurationMs(audioPath)} ms)`);
  }
  return offsets;
}

function segmentLabelForMcqNo(mcqNo) {
  const n = Number(mcqNo);
  if (!Number.isFinite(n)) return String(mcqNo);
  if (n <= 20) return String(n);
  const base = 21 + 2 * Math.floor((n - 21) / 2);
  return `${base}_${base + 1}`;
}

function main() {
  if (!fs.existsSync(DATA_BANK)) {
    throw new Error(`Không tìm thấy bank: ${DATA_BANK}`);
  }

  console.log(`[enrich-exam-offsets] Kỳ ${EXAM} — tính offset từ ${AUDIO_DIR}`);
  const offsetBySegment = buildOffsetMap();

  const bank = JSON.parse(fs.readFileSync(DATA_BANK, 'utf8'));
  if (!Array.isArray(bank)) {
    throw new Error('Bank JSON phải là mảng');
  }

  let enriched = 0;
  for (const row of bank) {
    if ((row.section ?? 'listening') !== 'listening') continue;
    const mcqNo = String(row.questionNo ?? row.question_no ?? '');
    const segLabel = segmentLabelForMcqNo(mcqNo);
    const offsetMs = offsetBySegment.get(segLabel);
    if (offsetMs == null) continue;

    const content = { ...(row.content_json || {}) };
    content.exam_offset_ms = offsetMs;
    const audioFile = audioFileForQuestionNo(segLabel);
    content.audio_url = `/audio/${audioFile}`;
    row.content_json = content;
    enriched++;
  }

  const json = `${JSON.stringify(bank, null, 2)}\n`;
  fs.writeFileSync(DATA_BANK, json, 'utf8');
  fs.mkdirSync(path.dirname(PUBLIC_BANK), { recursive: true });
  fs.writeFileSync(PUBLIC_BANK, json, 'utf8');

  console.log(`[enrich-exam-offsets] Đã cập nhật ${enriched} câu nghe → ${DATA_BANK}`);
  console.log(`[enrich-exam-offsets] Đã cập nhật ${enriched} câu nghe → ${PUBLIC_BANK}`);
}

main();
