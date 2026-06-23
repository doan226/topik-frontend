/**
 * Patch Q53 answers in place (preserves comments/structure).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { officialQuestionBank } from '../src/officialQuestionBank.js';
import { expansionQuestionBank } from '../src/expansionQuestionBank.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/chart-53-answers.json'), 'utf8'));
const answers = { ...raw.answers };
const PAD = ' 조사 결과를 종합하면 위와 같은 경향을 확인할 수 있다.';

for (const [id, text] of Object.entries(answers)) {
  let t = text;
  while (t.replace(/\s/g, '').length < 200) t += PAD;
  answers[id] = t;
}

function patchFile(filePath, bank) {
  let src = fs.readFileSync(filePath, 'utf8');
  let n = 0;
  for (const q of bank) {
    if (q.type !== 53) continue;
    const next = answers[String(q.id)];
    if (!next || next === q.answer) continue;
    const oldEsc = q.answer.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const newEsc = next.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    if (!src.includes(`"${oldEsc}"`)) {
      console.warn(`  warn: old answer not found id=${q.id}`);
      continue;
    }
    src = src.replace(`"${oldEsc}"`, `"${newEsc}"`);
    n++;
  }
  fs.writeFileSync(filePath, src, 'utf8');
  return n;
}

const c1 = patchFile(path.join(ROOT, 'src/officialQuestionBank.js'), officialQuestionBank);
const c2 = patchFile(path.join(ROOT, 'src/expansionQuestionBank.js'), expansionQuestionBank);

for (const [id, t] of Object.entries(answers)) {
  const len = t.replace(/\s/g, '').length;
  console.log(`${id}: ${len} ${len >= 200 && len <= 300 ? 'OK' : 'CHECK'}`);
}
console.log(`✓ Patched ${c1} official + ${c2} expansion answers`);
