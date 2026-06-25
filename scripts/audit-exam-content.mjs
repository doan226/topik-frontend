/**
 * audit-exam-content.mjs — Rà placeholder nội dung (Đọc + Nghe).
 * Run: node scripts/audit-exam-content.mjs [ky...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

const PLACEHOLDER_PATTERNS = [
  /ảnh quét/i,
  /Xem PDF/i,
  /\[Nghe câu/i,
  /\[Lựa chọn/i,
  /\[Đoạn văn/i,
];

function isEmptyPlaceholder(value, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') return allowEmpty;
  const t = value.trim();
  if (!t) return !allowEmpty;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(t));
}

function auditQuestion(row) {
  const issues = [];
  const section = row.section || 'listening';
  const qno = row.questionNo ?? '?';
  const cj = row.content_json || {};

  if (section === 'reading') {
    const passage = cj.passage ?? '';
    const question = cj.question ?? '';
    const options = Array.isArray(cj.options) ? cj.options : [];
    const hasOptions = options.filter((o) => String(o || '').trim()).length >= 4;

    if (!hasOptions && isEmptyPlaceholder(passage) && !cj.image_url && !String(question || '').trim()) {
      issues.push({ field: 'passage', value: passage });
    }
    if (isEmptyPlaceholder(question) && !hasOptions) {
      issues.push({ field: 'question', value: question });
    }
    for (let i = 0; i < 4; i++) {
      const opt = options[i] ?? '';
      if (isEmptyPlaceholder(opt)) {
        issues.push({ field: `option${i + 1}`, value: opt });
      }
    }
  } else {
    const passage = cj.passage ?? '';
    const options = Array.isArray(cj.options) ? cj.options : [];
    const qn = Number(qno);
    const isPictureListen = section === 'listening' && qn >= 15 && qn <= 16;

    if (isEmptyPlaceholder(passage)) {
      issues.push({ field: 'passage', value: passage });
    }
    if (qn >= 4 && !isPictureListen && !cj.image_url) {
      for (let i = 0; i < 4; i++) {
        const opt = options[i] ?? '';
        if (isEmptyPlaceholder(opt)) {
          issues.push({ field: `option${i + 1}`, value: opt });
        }
      }
    }
  }

  return issues.map((iss) => ({
    examId: row.examId,
    section,
    qno,
    ...iss,
  }));
}

function auditFile(filePath) {
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const examId = path.basename(filePath).replace('-bank.json', '');
  const issues = rows.flatMap(auditQuestion);
  return { examId, total: rows.length, issues };
}

function main() {
  const topik1Only = process.argv.includes('--topik1');
  const filePattern = topik1Only ? /^topik1-\d+-bank\.json$/ : /^topik2-\d+-bank\.json$/;
  const prefix = topik1Only ? 'topik1-' : 'topik2-';
  const filterKys = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
  const files = fs
    .readdirSync(DATA)
    .filter((f) => filePattern.test(f))
    .filter((f) => {
      if (filterKys.length === 0) return true;
      const ky = f.match(/topik[12]-(\d+)/)[1];
      return filterKys.includes(ky);
    })
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const perExam = topik1Only ? 70 : 100;
  console.log(`Rà soát nội dung ${files.length} đề\n`);
  console.log('Kỳ       | Câu | Placeholder');
  console.log('---------|-----|------------');

  let totalIssues = 0;
  const csvLines = ['examId,section,qno,field,value'];

  for (const file of files) {
    const { examId, issues } = auditFile(path.join(DATA, file));
    const ky = examId.replace(prefix, '');
    totalIssues += issues.length;
    console.log(`${ky.padEnd(8)} | ${String(perExam).padStart(3)} | ${issues.length === 0 ? 'OK' : `${issues.length} lỗi`}`);
    for (const i of issues) {
      csvLines.push(
        `${i.examId},${i.section},${i.qno},${i.field},"${String(i.value).replace(/"/g, '""')}"`
      );
    }
  }

  const csvPath = path.join(__dirname, '..', 'data', 'audit-content-issues.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
  console.log(`\nCSV: ${csvPath}`);
  console.log(`Tổng placeholder: ${totalIssues}`);

  if (totalIssues > 0) process.exitCode = 1;
}

main();
