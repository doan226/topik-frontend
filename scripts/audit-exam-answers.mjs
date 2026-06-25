/**
 * Rà soát đáp án trong file topik2-* / topik1-*-bank.json.
 * Run:
 *   node scripts/audit-exam-answers.mjs
 *   node scripts/audit-exam-answers.mjs --topik1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
const PUBLIC = path.join(__dirname, '..', 'public', 'data');

const topik1Only = process.argv.includes('--topik1');
const pattern = topik1Only ? /^topik1-\d+-bank\.json$/ : /^topik2-\d+-bank\.json$/;
const expectListen = topik1Only ? 30 : 50;
const expectRead = topik1Only ? 40 : 50;

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
  if (listening !== expectListen) {
    issues.push({ examId, section: 'count', qno: 'L', correct_ans: `${listening}/${expectListen}` });
  }
  if (reading !== expectRead) {
    issues.push({ examId, section: 'count', qno: 'R', correct_ans: `${reading}/${expectRead}` });
  }
  return { examId, listening, reading, issues };
}

function main() {
  const files = fs
    .readdirSync(DATA)
    .filter((f) => pattern.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/topik[12]-(\d+)/)[1]);
      const nb = Number(b.match(/topik[12]-(\d+)/)[1]);
      return na - nb;
    });

  const label = topik1Only ? 'TOPIK I' : 'TOPIK II';
  console.log(`Rà soát ${files.length} đề ${label} (data/ + public/data)\n`);
  console.log('Kỳ       | Nghe | Đọc | Lỗi');
  console.log('---------|------|-----|------------');

  let totalIssues = 0;
  const allIssues = [];

  for (const file of files) {
    const dataPath = path.join(DATA, file);
    const pubPath = path.join(PUBLIC, file);
    const dataAudit = auditFile(dataPath);
    const pubAudit = fs.existsSync(pubPath)
      ? auditFile(pubPath)
      : { issues: [{ examId: dataAudit.examId, section: 'sync', qno: '-', correct_ans: 'MISSING_PUBLIC' }] };

    const issues = [...dataAudit.issues, ...pubAudit.issues.map((i) => ({ ...i, source: 'public' }))];
    totalIssues += issues.length;
    allIssues.push(...issues);

    const ky = dataAudit.examId.replace(/^topik[12]-/, '');
    const status = issues.length === 0 ? 'OK' : `${issues.length} loi`;
    console.log(
      `${ky.padEnd(8)} | ${String(dataAudit.listening).padStart(4)} | ${String(dataAudit.reading).padStart(3)} | ${status}`
    );
  }

  const perExam = expectListen + expectRead;
  console.log(`\nTong: ${files.length * perExam} cau (${files.length} de x ${perExam}), ${totalIssues} loi.`);

  if (allIssues.length > 0) {
    console.log('\nChi tiet:');
    for (const i of allIssues.slice(0, 50)) {
      console.log(`  ${i.examId} ${i.section} cau ${i.qno}: correct_ans=${JSON.stringify(i.correct_ans)}`);
    }
    if (allIssues.length > 50) console.log(`  ... va ${allIssues.length - 50} loi khac`);
    process.exitCode = 1;
  } else {
    console.log('\nTat ca de OK.');
  }
}

main();
