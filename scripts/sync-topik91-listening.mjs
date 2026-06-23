/**
 * Đồng bộ đề nghe TOPIK II kỳ 91 từ TopikData → topik-frontend.
 * - topik2-91-bank.json (+ exam_offset_ms cho chế độ nghe cả đề)
 * - public/audio/*.mp3 (35 câu + ghép full)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_ROOT = path.resolve(FRONTEND_ROOT, '..', '..', 'TopikData');

const SOURCE_ROOT = process.env.TOPIK91_SOURCE_ROOT || DEFAULT_SOURCE_ROOT;
const SOURCE_BANK = path.join(SOURCE_ROOT, 'data', 'topik2-91-bank.json');
const SOURCE_AUDIO_DIR = path.join(SOURCE_ROOT, 'public', 'audio');
const TARGET_BANK = path.join(FRONTEND_ROOT, 'data', 'topik2-91-bank.json');
const PUBLIC_BANK = path.join(FRONTEND_ROOT, 'public', 'data', 'topik2-91-bank.json');
const TARGET_AUDIO_DIR = path.join(FRONTEND_ROOT, 'public', 'audio');
const FULL_AUDIO_NAME = 'topik2-91-listen-full.mp3';

const QUESTION_ORDER = [
  ...Array.from({ length: 20 }, (_, i) => String(i + 1)),
  ...Array.from({ length: 15 }, (_, i) => `${21 + i * 2}_${22 + i * 2}`),
];

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy ${label}: ${filePath}`);
  }
}

/** Ước lượng thời lượng MP3 CBR ~128 kbps (đủ chính xác cho exam_offset_ms). */
function estimateDurationMs(filePath) {
  const { size } = fs.statSync(filePath);
  return Math.round((size * 8) / 128000 * 1000);
}

function audioFileForQuestionNo(questionNo) {
  return `topik2-91-listen-q${questionNo}.mp3`;
}

function enrichBankWithOffsets(bank) {
  let offsetMs = 0;
  return bank.map((row) => {
    const questionNo = String(row.questionNo);
    const audioFile = audioFileForQuestionNo(questionNo);
    const audioPath = path.join(SOURCE_AUDIO_DIR, audioFile);
    assertExists(audioPath, `audio câu ${questionNo}`);

    const durationMs = estimateDurationMs(audioPath);
    const content = { ...(row.content_json || {}) };
    content.exam_offset_ms = offsetMs;
    content.audio_url = `/audio/${audioFile}`;
    offsetMs += durationMs;

    return {
      ...row,
      content_json: content,
    };
  });
}

function copyAudioFiles() {
  fs.mkdirSync(TARGET_AUDIO_DIR, { recursive: true });

  const existing = fs.readdirSync(TARGET_AUDIO_DIR).filter((f) => f.endsWith('.mp3'));
  for (const file of existing) {
    if (file.startsWith('topik2-91-listen-')) {
      fs.unlinkSync(path.join(TARGET_AUDIO_DIR, file));
    }
  }

  const chunks = [];
  for (const questionNo of QUESTION_ORDER) {
    const fileName = audioFileForQuestionNo(questionNo);
    const src = path.join(SOURCE_AUDIO_DIR, fileName);
    assertExists(src, fileName);
    const buf = fs.readFileSync(src);
    fs.writeFileSync(path.join(TARGET_AUDIO_DIR, fileName), buf);
    chunks.push(buf);
    console.log(`  ✓ ${fileName} (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  const fullBuf = Buffer.concat(chunks);
  fs.writeFileSync(path.join(TARGET_AUDIO_DIR, FULL_AUDIO_NAME), fullBuf);
  console.log(`  ✓ ${FULL_AUDIO_NAME} (${(fullBuf.length / 1024 / 1024).toFixed(1)} MB, ghép từ 35 đoạn)`);
}

function main() {
  console.log('[sync-topik91-listening] Nguồn:', SOURCE_ROOT);
  assertExists(SOURCE_BANK, 'topik2-91-bank.json');

  const rawBank = JSON.parse(fs.readFileSync(SOURCE_BANK, 'utf8'));
  if (!Array.isArray(rawBank) || rawBank.length !== 35) {
    throw new Error(`Bank JSON phải có đúng 35 câu, hiện có ${rawBank?.length ?? 0}`);
  }

  console.log('[sync-topik91-listening] Sao chép audio...');
  copyAudioFiles();

  const enriched = enrichBankWithOffsets(rawBank);
  fs.writeFileSync(TARGET_BANK, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
  fs.mkdirSync(path.dirname(PUBLIC_BANK), { recursive: true });
  fs.writeFileSync(PUBLIC_BANK, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
  console.log(`[sync-topik91-listening] Đã ghi ${TARGET_BANK}`);
  console.log(`[sync-topik91-listening] Đã ghi ${PUBLIC_BANK}`);
  console.log('[sync-topik91-listening] Hoàn tất.');
}

main();
