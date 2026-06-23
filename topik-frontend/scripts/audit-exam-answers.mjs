/**
 * Rà soát đáp án trong tất cả file topik2-*-bank.json (Nghe + Đọc).
 * Run: node scripts/audit-exam-answers.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
const PUBLIC = path.join(__dirname, '..', 'public', 'data');

function isValidAnswer(value) {
  return typeof value === 'string' && /^[1-4]$/.test(value.trim());
}

function auditFile(filePath) {
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const examId = path.basename(filePath).replace('-bank.json', '');
  const issues = [];

  for (const row of rows) {
    const section = row.section || 'listening';
    const qno = row.questionNo ?? row.question_no ?? '?';
    const ca = row.correct_ans;
    if (!isValidAnswer(ca)) {
      issues.push({ examId, section, qno, correct_ans: ca ?? null });
    }
  }

  const listening = rows.filter((r) => (r.section || 'listening') === 'listening').length;
  const reading = rows.filter((r) => r.section === 'reading').length;
  return { examId, listening, reading, issues };
}

function main() {
  const files = fs
    .readdirSync(DATA)
    .filter((f) => /^topik2-\d+-bank\.json$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/topik2-(\d+)/)[1]);
      const nb = Number(b.match(/topik2-(\d+)/)[1]);
      return na - nb;
    });

  console.log(`Rà soát ${files.length} đề (data/ + public/data)\n`);
  console.log('Kỳ       | Nghe | Đọc | Lỗi đáp án');
  console.log('---------|------|-----|------------');

  let totalIssues = 0;
  const allIssues = [];

  for (const file of files) {
    const dataPath = path.join(DATA, file);
    const pubPath = path.join(PUBLIC, file);
    const dataAudit = auditFile(dataPath);
    const pubAudit = fs.existsSync(pubPath) ? auditFile(pubPath) : { issues: [{ examId: dataAudit.examId, section: 'sync', qno: '-', correct_ans: 'MISSING_PUBLIC' }] };

    const issues = [...dataAudit.issues, ...pubAudit.issues.map((i) => ({ ...i, source: 'public' }))];
    totalIssues += issues.length;
    allIssues.push(...issues);

    const ky = dataAudit.examId.replace('topik2-', '');
    const status = dataAudit.issues.length === 0 && pubAudit.issues.length === 0 ? 'OK' : `${dataAudit.issues.length + pubAudit.issues.length} lỗi`;
    console.log(
      `${ky.padEnd(8)} | ${String(dataAudit.listening).padStart(4)} | ${String(dataAudit.reading).padStart(3)} | ${status}`
    );
  }

  console.log(`\nTổng: ${files.length * 100} câu (${files.length} đề × 100), ${totalIssues} lỗi đáp án.`);

  if (allIssues.length > 0) {
    console.log('\nChi tiết lỗi:');
    for (const i of allIssues.slice(0, 50)) {
      console.log(`  ${i.examId} ${i.section} câu ${i.qno}: correct_ans=${JSON.stringify(i.correct_ans)}`);
    }
    if (allIssues.length > 50) console.log(`  ... và ${allIssues.length - 50} lỗi khác`);
    process.exitCode = 1;
  } else {
    console.log('\nTất cả đề đều có đáp án hợp lệ (1–4).');
  }
}

main();
