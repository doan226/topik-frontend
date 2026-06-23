/**
 * Data optimization pipeline — run: node scripts/run-data-optimization.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { officialQuestionBank } from '../src/officialQuestionBank.js';
import { expansionQuestionBank } from '../src/expansionQuestionBank.js';
import { printMissingReport } from './report-missing-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BACKEND_QB = path.join('C:', 'Users', '01666', 'Downloads', 'topikai', 'topikai', 'src', 'main', 'resources', 'question-bank.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function hashPrompt(s) {
  return createHash('md5').update(s || '').digest('hex').slice(0, 8);
}

// --- Phase 1: Refactor patterns ---
function refactorPatterns() {
  const src = readJson(path.join(DATA, 'patterns-51-52.json'));
  const items = src.items.map((item) => {
    if (item.type !== 'exercise') return item;
    const out = { ...item };
    delete out.suggestedCorrect;
    delete out.suggestedCorrect2;
    const answers = [];
    if (item.suggestedCorrect) {
      item.suggestedCorrect.forEach((text) =>
        answers.push({ blank: '㉠', text, verified: 'suggested' })
      );
    }
    if (item.suggestedCorrect2) {
      item.suggestedCorrect2.forEach((text) =>
        answers.push({ blank: '㉡', text, verified: 'suggested' })
      );
    }
    if (answers.length) out.answers = answers;
    if (item.patternHints) {
      out.patternIds = [...item.patternHints];
      delete out.patternHints;
    }
    return out;
  });

  // Remove duplicate connector c52-waeimyeon (keep p52-waeimyeon)
  const filtered = items.filter((i) => i.id !== 'c52-waeimyeon');
  filtered.forEach((i) => {
    if (i.patternIds?.includes('c52-waeimyeon')) {
      i.patternIds = i.patternIds.map((id) => (id === 'c52-waeimyeon' ? 'p52-waeimyeon' : id));
    }
  });

  const stats = {
    patterns: filtered.filter((i) => i.type === 'pattern').length,
    vocabGroups: filtered.filter((i) => i.type === 'vocab-group').length,
    connectors: filtered.filter((i) => i.type === 'connector').length,
    exercises: filtered.filter((i) => i.type === 'exercise').length,
  };

  return {
    version: 2,
    updated: new Date().toISOString().slice(0, 10),
    sourceNote: src.sourceNote,
    stats,
    items: filtered,
  };
}

// --- Phase 4: Link exercises to official questions ---
function linkOfficialQuestions(patternsData, writingBank) {
  const official = writingBank.official;
  const bySessionType = new Map();
  official.forEach((q) => {
    if (q.topik) bySessionType.set(`${q.topik}-${q.type}`, q.id);
  });

  patternsData.items.forEach((item) => {
    if (item.type !== 'exercise' || !item.examSession) return;
    const key = `${item.examSession}-${item.questionType}`;
    const oid = bySessionType.get(key);
    if (oid) item.officialQuestionId = oid;
  });
  return patternsData;
}

// --- Placeholder exercises needing source ---
function addMissingExercisePlaceholders(items) {
  const placeholders = [
    { id: 'ex51-016', questionType: 51, examSession: 36, topic: 'announcement', source: 'quyen-viet-part1 Luyện tập 16' },
    { id: 'ex51-017', questionType: 51, num: 17 },
    { id: 'ex51-018', questionType: 51, num: 18 },
    { id: 'ex51-019', questionType: 51, num: 19 },
    { id: 'ex51-020', questionType: 51, num: 20 },
    { id: 'ex51-021', questionType: 51, examSession: 52, num: 21 },
    { id: 'ex51-022', questionType: 51, examSession: 47, num: 22 },
    { id: 'ex51-025', questionType: 51, num: 25 },
    { id: 'ex52-007', questionType: 52, examSession: 52, num: 7 },
    { id: 'ex52-009', questionType: 52, examSession: 47, num: 9 },
    { id: 'ex52-016', questionType: 52, num: 16 },
    { id: 'ex52-019', questionType: 52, num: 19 },
  ];
  const existing = new Set(items.map((i) => i.id));
  placeholders.forEach((p) => {
    if (existing.has(p.id)) return;
    items.push({
      id: p.id,
      type: 'exercise',
      questionType: p.questionType,
      topic: p.topic || 'unknown',
      prompt: null,
      blankCount: p.questionType === 51 ? 1 : 1,
      needsSource: true,
      examSession: p.examSession || null,
      source: p.source || `quyen-viet-part PDF Luyện tập ${p.num || ''}`.trim(),
      answers: [],
    });
  });
  return items;
}

// --- Phase 3: Writing question bank master ---
function buildWritingBank() {
  return {
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    sourceNote: 'Master ngân hàng đề viết TOPIK 51–54. Sync FE .js + BE question-bank.json',
    official: officialQuestionBank,
    expansion: expansionQuestionBank,
  };
}

function flattenForBackend(bank) {
  return [...bank.official, ...bank.expansion];
}

function validateWritingSync(bank, backendPath) {
  const flat = flattenForBackend(bank);
  let backend = [];
  if (fs.existsSync(backendPath)) backend = readJson(backendPath);
  const issues = [];
  if (flat.length !== backend.length) {
    issues.push(`count mismatch: master=${flat.length} backend=${backend.length}`);
  }
  const backendById = new Map(backend.map((q) => [q.id, q]));
  flat.forEach((q) => {
    const b = backendById.get(q.id);
    if (!b) issues.push(`missing in backend: id=${q.id}`);
    else if (hashPrompt(b.prompt) !== hashPrompt(q.prompt)) {
      issues.push(`prompt hash mismatch: id=${q.id}`);
    }
  });
  return { ok: issues.length === 0, issues, count: flat.length };
}

function buildManifest(files) {
  return {
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    backupPath: 'data/backups/2026-05-25',
    pdfMaster: ['quyen-viet-part1.pdf', 'quyen-viet-part2.pdf', 'quyen-viet-part3.pdf'],
    landingClaims: { vocab6000: false, note: '6000+ từ trên landing chưa có data — không tạo file giả' },
    files,
    userInputRequired: 'data/USER-INPUT-CHECKLIST.md',
  };
}

function countFileItems(filePath, key = 'items') {
  if (!fs.existsSync(filePath)) return 0;
  const j = readJson(filePath);
  if (Array.isArray(j)) return j.length;
  if (j[key]) return j[key].length;
  if (j.topics) return j.topics.length;
  if (j.charts) return j.charts.length;
  if (j.official) return j.official.length + (j.expansion?.length || 0);
  return 0;
}

// --- Main ---
console.log('=== TOPIK Data Optimization Pipeline ===\n');

// Phase 1 + 4 partial
let patterns = refactorPatterns();
const writingBank = buildWritingBank();
patterns.items = addMissingExercisePlaceholders(patterns.items);
patterns = linkOfficialQuestions(patterns, writingBank);
patterns.stats.exercises = patterns.items.filter((i) => i.type === 'exercise').length;
writeJson(path.join(DATA, 'patterns-51-52.json'), patterns);
console.log('✓ patterns-51-52.json v2 —', patterns.stats);

// Phase 3
writeJson(path.join(DATA, 'writing-question-bank.json'), writingBank);
const flat = flattenForBackend(writingBank);
if (fs.existsSync(path.dirname(BACKEND_QB))) {
  writeJson(BACKEND_QB, flat);
  console.log('✓ writing-question-bank.json + synced backend question-bank.json —', flat.length, 'questions');
} else {
  console.warn('⚠ Backend path not found, skipped BE sync:', BACKEND_QB);
}

const validation = validateWritingSync(writingBank, BACKEND_QB);
console.log(validation.ok ? '✓ validate FE master vs backend OK' : '⚠ validation:', validation.issues);

// Manifest
const manifestFiles = [
  { path: 'patterns-51-52.json', items: patterns.items.length, status: 'ready-review' },
  { path: 'vocab-54-topics.json', items: countFileItems(path.join(DATA, 'vocab-54-topics.json'), 'topics'), status: 'imported' },
  { path: 'essay-54-templates.json', items: countFileItems(path.join(DATA, 'essay-54-templates.json'), 'items'), status: 'imported' },
  { path: 'chart-53-bank.json', items: countFileItems(path.join(DATA, 'chart-53-bank.json'), 'charts'), status: 'partial' },
  { path: 'antonyms-52.json', items: countFileItems(path.join(DATA, 'antonyms-52.json'), 'pairs'), status: 'needs-user' },
  { path: 'pattern-mappings.json', items: countFileItems(path.join(DATA, 'pattern-mappings.json'), 'mappings'), status: 'ready' },
  { path: 'listen-read-bank.json', items: countFileItems(path.join(DATA, 'listen-read-bank.json'), 'items'), status: 'placeholder' },
  { path: 'writing-question-bank.json', items: flat.length, status: 'synced' },
];
writeJson(path.join(DATA, 'manifest.json'), buildManifest(manifestFiles));
console.log('✓ manifest.json');

printMissingReport();

/*
 * ═══════════════════════════════════════════════════════════════════
 *  PHẦN THIẾU SO VỚI PDF — KHÔNG CẦN ĐỌC CODE TRÊN
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Mỗi lần chạy pipeline → in console + ghi data/MISSING-DATA-REPORT.md
 *
 *  PDF: C:\Users\01666\Downloads\Quyển Viết hoàn chỉnh.pdf
 *       (bản tách: data/quyen-viet-part1/2/3.pdf)
 *
 *  Logic quét: scripts/report-missing-data.mjs
 *  Format gửi:  data/USER-INPUT-CHECKLIST.md
 *
 * ═══════════════════════════════════════════════════════════════════
 */
