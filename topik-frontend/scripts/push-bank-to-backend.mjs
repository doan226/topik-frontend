import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'writing-question-bank.json'), 'utf8'));

const payload = [...(bank.official || []), ...(bank.expansion || [])];
const base = process.argv[2] || 'http://localhost:8080';
const key = process.env.ADMIN_API_KEY || 'dev-admin-key';

console.log(`Pushing ${payload.length} questions to ${base}/api/v1/admin/questions/upsert ...`);

const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 25000);
try {
  const res = await fetch(`${base}/api/v1/admin/questions/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
    body: JSON.stringify(payload),
    signal: ctrl.signal,
  });
  const text = await res.text();
  let j;
  try { j = JSON.parse(text); } catch { j = text; }
  console.log('HTTP', res.status);
  if (j && typeof j === 'object') {
    console.log('inserted:', j.inserted, 'updated:', j.updated, 'deleted:', j.deleted, 'total:', j.total);
    const exp53 = (j.questions || []).filter((q) => q.type === 53 && q.source === 'expansion');
    console.log('expansion Q53 in DB:', exp53.length);
    console.log('imageUrl null count:', exp53.filter((q) => q.imageUrl == null).length);
    console.log('sample:', exp53.slice(0, 2).map((q) => ({ id: q.id, imageUrl: q.imageUrl, prompt: (q.prompt || '').slice(0, 24) })));
  } else {
    console.log(String(j).slice(0, 400));
  }
} catch (e) {
  console.error('Request failed:', e.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
