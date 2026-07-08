/**
 * Sync writing-question-bank.json master → backend question-bank.json + validate FE↔BE
 * Run: node scripts/sync-question-bank.mjs [--from-fe]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { officialQuestionBank } from '../src/officialQuestionBank.js';
import { expansionQuestionBank } from '../src/expansionQuestionBank.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const MASTER = path.join(DATA, 'writing-question-bank.json');
const BACKEND_QB = path.join(
  ROOT,
  '..',
  'topik-backend',
  'topikai',
  'src',
  'main',
  'resources',
  'question-bank.json'
);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function hashPrompt(s) {
  return createHash('md5').update(s || '').digest('hex').slice(0, 8);
}

function flatten(bank) {
  return [...bank.official, ...bank.expansion];
}

function buildFromFe() {
  return {
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    sourceNote: 'Master ngân hàng đề viết TOPIK 51–54. Sync FE .js + BE question-bank.json',
    official: officialQuestionBank,
    expansion: expansionQuestionBank,
  };
}

function validate(bank, backendFlat) {
  const masterFlat = flatten(bank);
  const issues = [];
  if (masterFlat.length !== backendFlat.length) {
    issues.push(`count: master=${masterFlat.length} backend=${backendFlat.length}`);
  }
  const byId = new Map(backendFlat.map((q) => [q.id, q]));
  masterFlat.forEach((q) => {
    const b = byId.get(q.id);
    if (!b) issues.push(`missing backend id=${q.id}`);
    else if (hashPrompt(b.prompt) !== hashPrompt(q.prompt)) {
      issues.push(`prompt hash mismatch id=${q.id}`);
    }
  });
  return { ok: issues.length === 0, issues, count: masterFlat.length };
}

const fromFe = process.argv.includes('--from-fe');
let bank = fromFe || !fs.existsSync(MASTER) ? buildFromFe() : readJson(MASTER);

if (fromFe || !fs.existsSync(MASTER)) {
  writeJson(MASTER, bank);
  console.log('✓ Created/updated', MASTER);
}

const flat = flatten(bank);
writeJson(BACKEND_QB, flat);
console.log('✓ Synced backend question-bank.json —', flat.length, 'questions');

const result = validate(bank, flat);
if (result.ok) {
  console.log('✓ Validate OK —', result.count, 'questions, IDs and prompt hashes match');
} else {
  console.error('✗ Validation issues:', result.issues);
  process.exit(1);
}

console.log('\nNote: DB chỉ seed lần đầu (QuestionDataInitializer khi repository.count()==0).');
console.log('Nếu DB đã có data cũ, cần migration hoặc admin upsert — xem data/sources.md');
