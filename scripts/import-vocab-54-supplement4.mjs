/**
 * Import từ vựng câu 54 từ quyen-viet-supplement-4.pdf (text extract)
 * Chạy: node scripts/import-vocab-54-supplement4.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
const EXTRACT = path.join(DATA, '_pdf-supplement-4-extract.txt');
const OUT = path.join(DATA, 'vocab-54-topics.json');
const BANK_OUT = path.join(DATA, 'expressions-54-bank.json');

const TOPIC_HEADERS = [
  { n: 1, topicId: 'youth', topicKo: '청소년기', topicVi: 'Thời kì thanh thiếu niên', page: 151 },
  { n: 2, topicId: 'birth-rate', topicKo: '출산율 감소', topicVi: 'Giảm tỉ lệ sinh sản', page: 152 },
  { n: 3, topicId: 'smoking', topicKo: '흡연', topicVi: 'Hút thuốc lá', page: 152 },
  { n: 4, topicId: 'aging', topicKo: '고령화 현상', topicVi: 'Già hóa dân số', page: 153 },
  { n: 5, topicId: 'disability-facilities', topicKo: '장애인을 위한 편의 시설', topicVi: 'Trang thiết bị dành cho người khuyết tật', page: 153 },
  { n: 6, topicId: 'smart-device-addiction', topicKo: '스마트 기기 중독', topicVi: 'Nghiện thiết bị thông minh', page: 154 },
  { n: 7, topicId: 'plagiarism', topicKo: '표절 문제', topicVi: 'Vấn đề đạo văn', page: 155 },
  { n: 8, topicId: 'history-education', topicKo: '나라의 역사 교육', topicVi: 'Giáo dục lịch sử của đất nước', page: 156 },
  { n: 9, topicId: 'genetic-engineering', topicKo: '유전 공학 발달', topicVi: 'Phát triển công nghệ di truyền', page: 156 },
  { n: 10, topicId: 'debate-attitude', topicKo: '토론에 필요한 태도', topicVi: 'Thái độ cần thiết trong thảo luận', page: 157 },
  { n: 11, topicId: 'art-education', topicKo: '예술 교육의 필요성', topicVi: 'Tính cần thiết của giáo dục nghệ thuật', page: 158 },
  { n: 12, topicId: 'happy-life', topicKo: '행복한 삶의 조건', topicVi: 'Điều kiện của một cuộc sống hạnh phúc', page: 158 },
  { n: 13, topicId: 'success', topicKo: '내가 생각하는 성공의 기준', topicVi: 'Tiêu chuẩn về thành công', page: 159 },
  { n: 14, topicId: 'self-development', topicKo: '자기 계발의 개인적, 사회적 가치', topicVi: 'Giá trị cá nhân và xã hội của phát triển bản thân', page: 160 },
  { n: 15, topicId: 'newspaper', topicKo: '신문의 기능', topicVi: 'Chức năng của báo', page: 162 },
  { n: 16, topicId: 'cctv', topicKo: '감시 카메라 설치 확대', topicVi: 'Mở rộng lắp đặt camera giám sát', page: 163 },
  { n: 17, topicId: 'traditional-culture', topicKo: '나라의 전통문화', topicVi: 'Văn hóa truyền thống của đất nước', page: 164 },
  { n: 18, topicId: 'global-warming', topicKo: '지구 온난화', topicVi: 'Sự nóng lên của trái đất', page: 164 },
  { n: 19, topicId: 'praise', topicKo: '칭찬의 영향', topicVi: 'Ảnh hưởng của lời khen', page: 165 },
  { n: 20, topicId: 'early-education', topicKo: '조기 교육', topicVi: 'Giáo dục sớm', page: 166 },
];

const KO_FIXES = {
  '진료': '진로',
  '일달': '일탈',
  '인구 불규형': '인구 불균형',
  '스마토 기기 중독': '스마트 기기 중독',
  '모근 운동': '모금 운동',
  '예즉하다': '예측하다',
  '자긍심와 애국심을 가지다': '자긍심과 애국심을 가지다',
  '세계관을 넗히다': '세계관을 넓히다',
  '학무모': '학부모',
  '경제적, 사회적 발생하다': '경제적, 사회적 문제가 발생하다',
  '에 관심을 가지다': 'N에 관심을 가지다',
  'V 는 부담에서 벗어나다': 'N은/는 부담에서 벗어나다',
};

function fixKo(ko) {
  let s = ko.trim();
  for (const [bad, good] of Object.entries(KO_FIXES)) {
    if (s.includes(bad)) s = s.replace(bad, good);
  }
  return s.replace(/\s+/g, ' ');
}

function parseTermLine(line) {
  const cleaned = line.replace(/^-\s*/, '').trim();
  const sep = cleaned.search(/[:;]/);
  if (sep <= 0) return null;
  const ko = fixKo(cleaned.slice(0, sep));
  const vi = cleaned.slice(sep + 1).trim().replace(/\.$/, '');
  if (!ko || !vi) return null;
  return { ko, vi };
}

function parseExtract(text) {
  const lines = text.split(/\r?\n/);
  const parsed = new Map();
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('===') || line.includes('TI') && line.includes('NG HÀN')) continue;
    if (/^Trang \d+/.test(line) || /^ĐT:/.test(line)) continue;

    const header = line.match(/^(\d+)[.,]\s*(.+?)(?:[:：]\s*(.+))?$/);
    if (header && !line.startsWith('-')) {
      const num = Number(header[1]);
      const meta = TOPIC_HEADERS.find((t) => t.n === num);
      if (meta) {
        current = meta.topicId;
        if (!parsed.has(current)) parsed.set(current, []);
      }
      continue;
    }

    if (line.startsWith('-') && current) {
      const term = parseTermLine(line);
      if (term) parsed.get(current).push(term);
    }
  }
  return parsed;
}

function dedupeTerms(terms) {
  const seen = new Set();
  return terms.filter((t) => {
    const key = t.ko;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const extractText = fs.readFileSync(EXTRACT, 'utf8');
const fromPdf = parseExtract(extractText);

const topics = TOPIC_HEADERS.map((meta) => {
  const prev = existing.topics.find((t) => t.topicId === meta.topicId) || {};
  const pdfTerms = fromPdf.get(meta.topicId) || [];
  const terms = pdfTerms.length > 0 ? dedupeTerms(pdfTerms) : (prev.terms || []);
  const importMethod = pdfTerms.length > 0 ? 'text-extract' : prev.importMethod || 'ocr';

  return {
    topicId: meta.topicId,
    topicKo: meta.topicKo,
    topicVi: meta.topicVi,
    source: `quyen-viet-supplement-4 p.${meta.page}${prev.source?.includes('supplement-3') ? ', quyen-viet-supplement-3' : ''}`,
    ...(importMethod === 'ocr' ? { importMethod } : {}),
    terms,
  };
});

const vocabOut = {
  version: 2,
  updated: new Date().toISOString().slice(0, 10),
  source: 'quyen-viet-supplement-4.pdf, quyen-viet-part3 p.151-166, quyen-viet-supplement-3',
  sourceNote: 'Từ vựng câu 54 — 13 chủ đề text từ supplement-4; 7 chủ đề p.157–163 OCR supplement-3.',
  topics,
};

fs.writeFileSync(OUT, JSON.stringify(vocabOut, null, 2) + '\n', 'utf8');

const essay = JSON.parse(fs.readFileSync(path.join(DATA, 'essay-54-templates.json'), 'utf8'));
const bankItems = [];

topics.forEach((topic) => {
  (topic.terms || []).forEach((term, i) => {
    bankItems.push({
      id: `v-${topic.topicId}-${i}`,
      type: 'vocab',
      topicId: topic.topicId,
      topicKo: topic.topicKo,
      ko: term.ko,
      vi: term.vi,
      questionType: 54,
      source: topic.source,
    });
  });
});

essay.items.forEach((item) => {
  if (item.type === 'question-type') {
    bankItems.push({
      id: `qt-${item.id}`,
      type: 'question-type',
      labelKo: item.labelKo,
      labelVi: item.labelVi,
      ko: item.labelKo,
      vi: item.labelVi,
      tasks: item.tasks,
      questionType: 54,
      source: essay.source,
    });
    return;
  }
  if (item.type === 'body-formula') {
    (item.connectors || []).forEach((ko, i) => {
      bankItems.push({
        id: `conn-${item.id}-${i}`,
        type: 'connector',
        ko,
        vi: 'Liên từ / mắc xích thân bài',
        questionType: 54,
        source: essay.source,
      });
    });
    return;
  }
  (item.templates || []).forEach((t, i) => {
    bankItems.push({
      id: `expr-${item.id}-${i}`,
      type: item.type,
      labelVi: item.labelVi,
      ko: t.ko,
      vi: t.vi,
      questionType: 54,
      source: essay.source,
    });
  });
});

const bankOut = {
  version: 1,
  updated: new Date().toISOString().slice(0, 10),
  source: 'vocab-54-topics.json + essay-54-templates.json',
  stats: {
    vocabCards: bankItems.filter((i) => i.type === 'vocab').length,
    expressionCards: bankItems.filter((i) => i.type !== 'vocab').length,
    topics: topics.length,
    total: bankItems.length,
  },
  items: bankItems,
};

fs.writeFileSync(BANK_OUT, JSON.stringify(bankOut, null, 2) + '\n', 'utf8');

console.log('✓ vocab-54-topics.json —', topics.length, 'chủ đề,', topics.reduce((n, t) => n + t.terms.length, 0), 'từ');
console.log('✓ expressions-54-bank.json —', bankOut.stats.total, 'thẻ luyện (', bankOut.stats.vocabCards, 'từ vựng +', bankOut.stats.expressionCards, 'biểu hiện)');
