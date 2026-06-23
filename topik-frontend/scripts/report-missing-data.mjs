/**
 * Quét data/ → báo cáo phần thiếu so với PDF Quyển Viết.
 * Chạy: node scripts/report-missing-data.mjs
 * Hoặc tự chạy cuối pipeline: npm run data:build
 *
 * Output: data/MISSING-DATA-REPORT.md + in console
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const REPORT_PATH = path.join(DATA, 'MISSING-DATA-REPORT.md');

/** PDF gốc user (1 file = 1 part) — trang = số trang in trên sách */
export const PDF_SOURCES = {
  downloads: {
    part1: 'C:\\Users\\01666\\Downloads\\Quyển Viết hoàn chỉnh.pdf',
    part2: 'C:\\Users\\01666\\Downloads\\Quyển Viết hoàn chỉnh (1).pdf',
    part3: 'C:\\Users\\01666\\Downloads\\Quyển Viết hoàn chỉnh (2).pdf',
  },
  combined: 'C:\\Users\\01666\\Downloads\\Quyển Viết hoàn chỉnh (1).pdf',
  parts: {
    part1: 'data/quyen-viet-part1.pdf',
    part2: 'data/quyen-viet-part2.pdf',
    part3: 'data/quyen-viet-part3.pdf',
    part2copy: 'data/quyen-viet-full-v2.pdf',
    part3copy: 'data/quyen-viet-full-v3.pdf',
    supplement3: 'data/quyen-viet-supplement-3.pdf',
  },
  supplement: {
    downloads: 'Quyển Viết hoàn chỉnh (3).pdf',
    repo: 'data/quyen-viet-supplement-3.pdf',
    pages: 28,
    bookPages: '88, 102–115, 122–123, 134–151 (ảnh + text)',
    imported: '2026-05-25',
  },
  status: 'complete',
  note: 'Downloads: .pdf=Part1, (1)=Part2, (2)=Part3, (3)=supplement biểu đồ 53 + mẫu luận 54.',
};

/** Đáp án: PDF sách trống — team tạo sau khi hoàn thiện DB */
export const ANSWER_KEY_POLICY = {
  source: 'internal',
  status: 'deferred',
  note: 'Không chờ đáp án từ PDF. Giữ verified:suggested; team review → verified:true sau.',
};

/** Bài luyện chưa có trong JSON — tra part + trang PDF */
const KNOWN_GAP_EXERCISES = [
  { id: 'ex51-012', q: 51, num: 12, part: 'part1', pdfPage: null, note: 'Chưa tạo slot trong JSON — kiểm tra sách có bài #12 câu 51 không' },
  { id: 'ex51-016', q: 51, num: 16, part: 'part1', pdfPage: 62, exam: '36회', note: 'PDF trống prompt' },
  { id: 'ex51-017', q: 51, num: 17, part: 'part1', pdfPage: 63, exam: null, note: 'Thiếu đề' },
  { id: 'ex51-018', q: 51, num: 18, part: 'part1', pdfPage: 28, exam: null, note: 'Đã import đề từ part1' },
  { id: 'ex51-019', q: 51, num: 19, part: 'part1', pdfPage: 29, exam: null, note: 'Đã import đề từ part1' },
  { id: 'ex51-020', q: 51, num: 20, part: 'part1', pdfPage: 65, exam: null, note: 'Thiếu đề' },
  { id: 'ex51-021', q: 51, num: 21, part: 'part1', pdfPage: null, exam: '52회', note: 'Thiếu đề' },
  { id: 'ex51-022', q: 51, num: 22, part: 'part1', pdfPage: null, exam: '47회', note: 'Thiếu đề' },
  { id: 'ex51-025', q: 51, num: 25, part: 'part1', pdfPage: null, exam: null, note: 'Thiếu đề' },
  { id: 'ex52-007', q: 52, num: 7, part: 'part2', pdfPage: 55, exam: '52회', note: 'PDF trống prompt (file 1)' },
  { id: 'ex52-009', q: 52, num: 9, part: 'part2', pdfPage: 57, exam: '47회', note: 'PDF trống prompt (file 1)' },
  { id: 'ex52-016', q: 52, num: 16, part: 'part2', pdfPage: 62, exam: null, note: 'PDF trống prompt' },
  { id: 'ex52-019', q: 52, num: 19, part: 'part2', pdfPage: 64, exam: null, note: 'PDF trống prompt' },
];

const CHART_PDF_PAGES = {
  part2: '67–104',
  part3: '100–104',
  combined: '67–104 (part2), 100–104 (part3)',
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseExerciseNum(source) {
  const m = source?.match(/Luyện tập (\d+)/);
  return m ? Number(m[1]) : null;
}

function scanPatterns(patterns) {
  const exercises = patterns.items.filter((i) => i.type === 'exercise');
  const missingPrompt = exercises.filter((i) => i.needsSource || !i.prompt);
  const missingAnswers = exercises.filter(
    (i) => i.prompt && (!i.answers?.length || i.answers.every((a) => a.verified !== 'true'))
  );
  const suggestedOnly = exercises.filter(
    (i) => i.prompt && i.answers?.length && i.answers.every((a) => a.verified !== 'true')
  );
  return { exercises, missingPrompt, missingAnswers, suggestedOnly };
}

function scanVocab(vocab) {
  return (vocab.topics || []).filter((t) => t.needsSource || !t.terms?.length);
}

function scanCharts(charts) {
  const bank = charts.charts || [];
  return {
    needManual: bank.filter((c) => c.needsManualEntry),
    haveData: bank.filter((c) => c.type === 'chart' && !c.needsManualEntry && c.dataPoints?.length),
  };
}

function formatExerciseRow(ex) {
  const num = parseExerciseNum(ex.source);
  const exam = ex.examSession ? `${ex.examSession}회` : ex.source?.match(/\((\d+회)\)/)?.[1] || '—';
  return `| ${ex.id} | Câu ${ex.questionType} #${num ?? '?'} | ${exam} | ${ex.source || '—'} | ${ex.note || (ex.needsSource ? 'needsSource' : '—')} |`;
}

export function buildMissingReport() {
  const today = new Date().toISOString().slice(0, 10);
  const patterns = readJson(path.join(DATA, 'patterns-51-52.json'));
  const vocab = fs.existsSync(path.join(DATA, 'vocab-54-topics.json'))
    ? readJson(path.join(DATA, 'vocab-54-topics.json'))
    : { topics: [] };
  const charts = fs.existsSync(path.join(DATA, 'chart-53-bank.json'))
    ? readJson(path.join(DATA, 'chart-53-bank.json'))
    : { charts: [] };
  const antonyms = fs.existsSync(path.join(DATA, 'antonyms-52.json'))
    ? readJson(path.join(DATA, 'antonyms-52.json'))
    : { needsUserInput: true, pairs: [] };

  const { exercises, missingPrompt, suggestedOnly } = scanPatterns(patterns);
  const vocabMissing = scanVocab(vocab);
  const chartScan = scanCharts(charts);

  const stillMissingPrompt = missingPrompt.map((ex) => {
    const known = KNOWN_GAP_EXERCISES.find((k) => k.id === ex.id);
    return { ...ex, pdfPage: known?.pdfPage, note: known?.note };
  });

  const notInJson = KNOWN_GAP_EXERCISES.filter(
    (k) => k.id === 'ex51-012' || !exercises.some((e) => e.id === k.id)
  );

  const lines = [];
  lines.push('# BÁO CÁO PHẦN THIẾU — Quyển Viết');
  lines.push('');
  lines.push(`> **Tự sinh:** \`${today}\` — chạy \`npm run data:report\` hoặc \`npm run data:build\``);
  lines.push(`> **PDF Downloads:**`);
  lines.push(`> - Part 1: \`${PDF_SOURCES.downloads.part1}\``);
  lines.push(`> - Part 3: \`${PDF_SOURCES.downloads.part3}\` ← file (2) — **đủ bộ 3 part**`);
  lines.push(`> **Trạng thái PDF:** ✅ \`${PDF_SOURCES.status}\` — không cần gửi thêm file`);
  lines.push(`> **Đáp án chuẩn:** ⏳ \`${ANSWER_KEY_POLICY.status}\` — ${ANSWER_KEY_POLICY.note}`);
  lines.push(`> **PDF trong repo:** \`${PDF_SOURCES.parts.part1}\`, \`part2\`, \`part3\`, \`supplement-3\``);
  lines.push(`> **PDF bổ sung (3):** \`${PDF_SOURCES.supplement.repo}\` — import ${PDF_SOURCES.supplement.imported}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## TÓM TẮT NHANH (đọc phần này trước)');
  lines.push('');
  lines.push('| Loại | Mục | Số lượng | Ai xử lý |');
  lines.push('|------|-----|----------|----------|');
  lines.push(`| 🔴 PDF trống | Bài luyện **thiếu đề** | **${stillMissingPrompt.length}** | Lấy từ đề official / team sau |`);
  lines.push(`| ⏳ DEFERRED | **Đáp án chuẩn** (suggested) | **${suggestedOnly.length}** | **Team** — sau khi hoàn thiện DB |`);
  lines.push(`| 🟡 Tùy phase | Biểu đồ 53 (ảnh) | **${chartScan.needManual.length}** skeleton | Team nhập số liệu thủ công |`);
  lines.push(`| 🟡 Tùy phase | Từ đối nghĩa tr.42 | **${antonyms.pairs?.length || 0}** cặp | Team biên soạn sau |`);
  lines.push(`| ✅ Done | Vocab 54 chủ đề 10–16 | **${vocabMissing.length}** thiếu / **${(vocab.topics || []).length}** tổng | OCR PDF (3) 2026-05-25 |`);
  lines.push('');
  lines.push('Chi tiết: `data/USER-INPUT-CHECKLIST.md`');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. Bài luyện THIẾU ĐỀ (gửi prompt + đáp án ㉠/㉡)');
  lines.push('');
  lines.push('| ID | Câu | Kỳ thi | PDF (part + trang) | Ghi chú |');
  lines.push('|----|-----|--------|-------------------|---------|');
  for (const k of KNOWN_GAP_EXERCISES.filter((x) => x.id !== 'ex51-012')) {
    const ex = stillMissingPrompt.find((e) => e.id === k.id);
    const status = ex ? '❌ thiếu' : '✅ đã có';
    const page = k.pdfPage ? `${k.part} tr.${k.pdfPage}` : k.part;
    lines.push(`| ${k.id} | ${k.q} #${k.num} | ${k.exam || '—'} | ${page} | ${status} — ${k.note} |`);
  }
  if (notInJson.some((x) => x.id === 'ex51-012')) {
    lines.push('| ex51-012 | 51 #12 | — | part1 (?) | ⚠️ chưa có trong JSON |');
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. ĐÁP ÁN CHUẨN — DEFERRED (team, không block import PDF)');
  lines.push('');
  lines.push(`Tổng **${suggestedOnly.length}** bài — \`verified: "suggested"\`. PDF sách **trống đáp án**.`);
  lines.push('');
  lines.push('**Chính sách:** Team tạo đáp án chuẩn **sau khi hoàn thiện kho database** → đổi `verified: true`.');
  lines.push('');
  lines.push('<details><summary>Danh sách bài (click mở)</summary>');
  lines.push('');
  lines.push('| ID | Câu | #LT | Kỳ thi |');
  lines.push('|----|-----|-----|--------|');
  suggestedOnly
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((ex) => {
      const num = parseExerciseNum(ex.source);
      const exam = ex.examSession ? `${ex.examSession}회` : '—';
      lines.push(`| ${ex.id} | ${ex.questionType} | ${num ?? '?'} | ${exam} |`);
    });
  lines.push('');
  lines.push('</details>');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 3. Biểu đồ câu 53 — THIẾU SỐ LIỆU');
  lines.push('');
  lines.push(`PDF **ảnh** — combined tr. **${CHART_PDF_PAGES.combined}**`);
  lines.push('');
  lines.push(`- Skeleton trong JSON: **${chartScan.needManual.length}** (needsManualEntry)`);
  lines.push(`- Đã nhập số liệu: **${chartScan.haveData.length}**`);
  lines.push('- Sample essay: 반려동물, 스트레스 (tr.146) + outline: 게임 중독, 주차 (supplement-3 tr.142)');
  lines.push(`- PDF supplement-3: trang sách **88, 102–115, 122–123** (ảnh — cần nhập số liệu thủ công)`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. Từ đối nghĩa câu 52');
  lines.push('');
  if (antonyms.needsUserInput || !antonyms.pairs?.length) {
    lines.push('- ❌ **Chưa có** — Part1 / combined PDF **trang 42** (ảnh, không extract được)');
    lines.push('- File: `data/antonyms-52.json`');
  } else {
    lines.push(`- ✅ Đã có **${antonyms.pairs.length}** cặp`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 5. Vocab câu 54 — chủ đề thiếu từ');
  lines.push('');
  if (vocabMissing.length === 0) {
    lines.push(`- ✅ **Đủ ${(vocab.topics || []).length}/${(vocab.topics || []).length} chủ đề** — 7 chủ đề p.157–163 đã import OCR từ PDF (3) ngày 2026-05-25`);
    lines.push('- ⚠️ Nên **review thủ công** các mục `importMethod: ocr` (có thể sai chính tả Hàn do scan)');
  } else {
    lines.push('| topicId | Chủ đề | PDF |');
    lines.push('|---------|--------|-----|');
    vocabMissing.forEach((t) => {
      lines.push(`| ${t.topicId} | ${t.topicKo} | ${t.source || 'part3'} |`);
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 6. GHI CHÚ BỔ SUNG — cần làm tiếp (2026-05-25)');
  lines.push('');
  lines.push('### Đã import từ `Quyển Viết hoàn chỉnh (3).pdf` → `data/quyen-viet-supplement-3.pdf`');
  lines.push('');
  lines.push('| Nội dung | Trạng thái | Ghi chú |');
  lines.push('|----------|------------|---------|');
  lines.push('| Vocab 54 chủ đề 10–16 (p.157–163) | ✅ OCR → `vocab-54-topics.json` | Review chính tả Hàn |');
  lines.push('| Mẫu mở/thân/kết câu 54 (p.134–151) | ✅ → `essay-54-templates.json` | Thêm connector + ví dụ môi trường |');
  lines.push('| Bài mẫu/outline câu 53 (p.142, 146) | ✅ → `chart-53-bank.json` | 2 essay + 2 situation-outline |');
  lines.push('| Biểu đồ câu 53 (p.88, 102–115, 122–123) | ❌ Chỉ có ảnh | **Cần nhập thủ công** labels + dataPoints |');
  lines.push('| Trang p.135, 139, 141, 143, 147 (supplement) | ❌ Ảnh | Có thể bổ sung thêm mẫu câu 54 nếu cần |');
  lines.push('');
  lines.push('### Vẫn thiếu — không có trong PDF (3)');
  lines.push('');
  lines.push('1. **~10 bài luyện 51–52 thiếu đề** — PDF gốc trống prompt → lấy từ `writing-question-bank.json` (kỳ 36, 47, 52회…) hoặc team nhập.');
  lines.push('2. **37 đáp án chuẩn bài 51–52** — deferred, team review sau.');
  lines.push('3. **Từ đối nghĩa câu 52 tr.42** — ảnh, chưa extract được → `antonyms-52.json` trống.');
  lines.push('4. **Số liệu biểu đồ 53** — mở PDF supplement-3, đọc từng biểu đồ, điền vào `chart-53-bank.json`.');
  lines.push('5. **UI ôn câu 53** — data skeleton đủ metadata; chưa wire tab luyện như Ôn 51–52.');
  lines.push('6. **Review OCR vocab** — so khớp với ảnh gốc part3 p.157–163, sửa lỗi Hàn nếu có.');
  lines.push('');
  lines.push('Chi tiết checklist: `data/USER-INPUT-CHECKLIST.md`');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sau khi cập nhật data');
  lines.push('');
  lines.push('1. Sửa JSON tương ứng (hoặc script import)');
  lines.push('2. Chạy `npm run data:build`');
  lines.push('3. Mở lại **file này** — số DEFERRED/BLOCKER phải giảm');
  lines.push('');

  const summary = {
    date: today,
    missingPromptCount: stillMissingPrompt.length,
    suggestedOnlyCount: suggestedOnly.length,
    chartSkeletonCount: chartScan.needManual.length,
    antonymsEmpty: antonyms.needsUserInput || !antonyms.pairs?.length,
    vocabTopicGaps: vocabMissing.length,
    reportPath: 'data/MISSING-DATA-REPORT.md',
  };

  return { markdown: lines.join('\n'), summary };
}

export function writeMissingReport() {
  const { markdown, summary } = buildMissingReport();
  fs.writeFileSync(REPORT_PATH, markdown, 'utf8');
  return { path: REPORT_PATH, summary };
}

export function printMissingReport() {
  const { path: reportPath, summary } = writeMissingReport();
  console.log('\n' + '='.repeat(60));
  console.log('📋 BÁO CÁO PHẦN THIẾU — xem chi tiết: data/MISSING-DATA-REPORT.md');
  console.log('='.repeat(60));
  console.log(`  PDF: ✅ đủ 3 part (Part3 = file (2))`);
  console.log(`  🔴 Thiếu đề (PDF trống):  ${summary.missingPromptCount} bài`);
  console.log(`  ⏳ Đáp án (team sau):     ${summary.suggestedOnlyCount} bài [DEFERRED]`);
  console.log(`  🟡 Biểu đồ 53:           ${summary.chartSkeletonCount} skeleton`);
  console.log(`  🟡 Từ đối nghĩa tr.42:   ${summary.antonymsEmpty ? 'team sau' : 'OK'}`);
  console.log(`  🟡 Vocab 54 (ảnh PDF):   ${summary.vocabTopicGaps} chủ đề`);
  console.log('='.repeat(60));
  console.log(`  → ${reportPath}\n`);
  return summary;
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  printMissingReport();
}

/*
 * ═══════════════════════════════════════════════════════════════════
 *  TRA CỨU NHANH — không cần đọc code phía trên
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Chạy:  npm run data:report   hoặc   npm run data:build
 *  File:  data/MISSING-DATA-REPORT.md  (tự cập nhật mỗi lần chạy)
 *  PDF:   C:\Users\01666\Downloads\Quyển Viết hoàn chỉnh.pdf
 *
 *  PDF:  Part1=.pdf  Part2=(1).pdf  Part3=(2).pdf  — ĐỦ 3 FILE
 *  Đáp án: DEFERRED — team tạo sau khi hoàn thiện DB (PDF trống 답안)
 *
 * ═══════════════════════════════════════════════════════════════════
 */
