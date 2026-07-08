import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(root, 'src/expansionQuestionBank.js');
const pub = path.join(root, 'public');
const text = fs.readFileSync(bankPath, 'utf8');
const urls = [...text.matchAll(/"(\/topik_images\/expansion\/q53_page_\d+\.png)"/g)].map((m) => m[1]);

const missing = [];
const badSize = [];
for (const u of urls) {
  const f = path.join(pub, ...u.slice(1).split('/'));
  if (!fs.existsSync(f)) missing.push(u);
  else if (fs.statSync(f).size < 1000) badSize.push(u);
}

console.log(`Q53 imageUrl entries: ${urls.length}`);
console.log(`Missing files: ${missing.length ? missing.join(', ') : 'none'}`);
console.log(`Too small: ${badSize.length ? badSize.join(', ') : 'none'}`);
console.log(`Disk check: ${missing.length === 0 && badSize.length === 0 && urls.length === 23 ? 'PASS' : 'FAIL'}`);

const base = process.argv[2] || 'http://127.0.0.1:5173';
let httpFail = 0;
for (const u of urls) {
  const res = await fetch(`${base}${u}`);
  if (!res.ok) {
    console.log(`HTTP ${res.status}: ${u}`);
    httpFail++;
  }
}
console.log(`HTTP check (${base}): ${httpFail === 0 ? 'PASS' : `FAIL (${httpFail}/${urls.length})`}`);
