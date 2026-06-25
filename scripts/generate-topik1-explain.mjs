/**
 * generate-topik1-explain.mjs — Sinh explanationVi + distractorNotes cho bank TOPIK I.
 * Run: node scripts/generate-topik1-explain.mjs [ky...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
const PUBLIC = path.join(__dirname, '..', 'public', 'data');

const DEFAULT_KYS = ['35', '36', '37', '41', '47', '52', '60', '64', '83', '91'];
const kys = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
const targets = kys.length ? kys : DEFAULT_KYS;

function isPlaceholderExplain(v) {
  if (typeof v !== 'string') return true;
  const t = v.trim();
  return !t || /placeholder/i.test(t);
}

function buildExplain(row) {
  const section = row.section || 'listening';
  const qno = row.questionNo ?? '?';
  const cj = row.content_json || {};
  const ans = String(row.correct_ans || '').trim();
  const opts = Array.isArray(cj.options) ? cj.options : [];
  const ansIdx = Number(ans) - 1;
  const correctText = ansIdx >= 0 && ansIdx < opts.length ? opts[ansIdx] : '';

  const distractorNotes = {};
  for (let i = 1; i <= 4; i++) {
    const key = String(i);
    if (key === ans) {
      distractorNotes[key] = correctText
        ? `Đáp án đúng: ${correctText}`
        : 'Đáp án đúng theo đề công bố TOPIK I.';
    } else {
      const wrong = opts[Number(key) - 1];
      distractorNotes[key] = wrong
        ? `Không phù hợp ngữ cảnh — "${wrong.slice(0, 40)}${wrong.length > 40 ? '…' : ''}"`
        : 'Không phải đáp án đúng.';
    }
  }

  let explanationVi = '';
  if (section === 'listening') {
    const tx = (cj.transcript || []).map((l) => l.lineText).filter(Boolean).slice(0, 2).join(' ');
    explanationVi = tx
      ? `Câu ${qno} (Nghe): dựa trên đoạn hội thoại "${tx.slice(0, 80)}${tx.length > 80 ? '…' : ''}", đáp án ${ans} là đúng.`
      : `Câu ${qno} (Nghe): đáp án đúng là lựa chọn ${ans}${correctText ? ` — "${correctText}"` : ''}.`;
  } else {
    const passage = String(cj.passage || '').slice(0, 100);
    explanationVi = passage
      ? `Câu ${qno} (Đọc): theo đoạn văn "${passage}${passage.length >= 100 ? '…' : ''}", đáp án ${ans} phù hợp nhất.`
      : `Câu ${qno} (Đọc): đáp án đúng là lựa chọn ${ans}${correctText ? ` — "${correctText}"` : ''}.`;
  }

  return { explanationVi, distractorNotes };
}

function enrichBank(rows) {
  return rows.map((row) => {
    if (!isPlaceholderExplain(row.explanationVi)) return row;
    const { explanationVi, distractorNotes } = buildExplain(row);
    return { ...row, explanationVi, distractorNotes };
  });
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const enriched = enrichBank(rows);
  fs.writeFileSync(filePath, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
  return true;
}

let count = 0;
for (const ky of targets) {
  const name = `topik1-${ky}-bank.json`;
  const dataPath = path.join(DATA, name);
  const pubPath = path.join(PUBLIC, name);
  if (processFile(dataPath)) {
    console.log(`[explain] ${name}`);
    count += 1;
    if (fs.existsSync(pubPath)) processFile(pubPath);
  }
}
console.log(`[explain] Done — ${count} banks updated.`);
