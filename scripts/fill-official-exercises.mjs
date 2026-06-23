/**
 * Gắn prompt + đáp án từ writing-question-bank official → patterns exercises
 * Run: node scripts/fill-official-exercises.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
const patterns = JSON.parse(fs.readFileSync(path.join(DATA, 'patterns-51-52.json'), 'utf8'));
const bank = JSON.parse(fs.readFileSync(path.join(DATA, 'writing-question-bank.json'), 'utf8'));

const LINKS = [
  { exId: 'ex51-016', topik: 36, type: 51 },
  { exId: 'ex51-021', topik: 52, type: 51 },
  { exId: 'ex51-022', topik: 47, type: 51 },
  { exId: 'ex52-007', topik: 52, type: 52 },
  { exId: 'ex52-009', topik: 47, type: 52 },
];

function parseAnswers(answerStr) {
  const answers = [];
  for (const line of (answerStr || '').split('\n')) {
    const m = line.trim().match(/^(㉠|㉡)\s*(.+)$/);
    if (m) answers.push({ blank: m[1], text: m[2].trim(), verified: 'true' });
  }
  return answers;
}

const official = bank.official || [];
let updated = 0;

patterns.items.forEach((item) => {
  const link = LINKS.find((l) => l.exId === item.id);
  if (!link) return;
  const q = official.find((o) => o.topik === link.topik && o.type === link.type);
  if (!q) return;
  item.prompt = q.prompt;
  item.needsSource = false;
  item.officialQuestionId = q.id;
  item.examSession = link.topik;
  item.source = `official-제${link.topik}회 + quyen-viet Luyện tập`;
  item.answers = parseAnswers(q.answer);
  item.blankCount = item.answers.length || detectBlanks(q.prompt);
  updated++;
});

function detectBlanks(prompt) {
  let n = 0;
  if (prompt?.includes('㉠')) n++;
  if (prompt?.includes('㉡')) n++;
  return n || 1;
}

patterns.stats.exercises = patterns.items.filter((i) => i.type === 'exercise').length;
fs.writeFileSync(path.join(DATA, 'patterns-51-52.json'), JSON.stringify(patterns, null, 2) + '\n');
console.log(`✓ Updated ${updated} exercises from official bank`);
