import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '..');

const TOPIC_BY_SET = {
  1: '기부 형태의 변화',
  2: '대학 진학률의 변화',
  3: '종이책 판매량의 변화',
  4: '종이신문 정기 구독률의 변화',
  5: '아이를 꼭 낳아야 하는가',
};

const mkPrompt = (topic) =>
  `다음을 참고하여 '${topic}'에 대한 글을 200~300자로 쓰십시오. 단, 글의 제목을 쓰지 마십시오.`;

function fixNode(node, stats) {
  if (Array.isArray(node)) {
    node.forEach((n) => fixNode(n, stats));
    return;
  }
  if (node && typeof node === 'object') {
    if (node.source === 'expansion' && node.type === 53) {
      if (node.imageUrl) {
        node.imageUrl = null;
        stats.nulled += 1;
      }
      const topic = TOPIC_BY_SET[node.expansionSet];
      if (topic) {
        node.prompt = mkPrompt(topic);
        stats.prompts += 1;
      }
    }
    Object.values(node).forEach((v) => {
      if (v && typeof v === 'object') fixNode(v, stats);
    });
  }
}

const files = [
  path.join(root, 'data', 'writing-question-bank.json'),
  path.join(repo, 'topik-backend', 'topikai', 'src', 'main', 'resources', 'question-bank.json'),
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stats = { nulled: 0, prompts: 0 };
  fixNode(data, stats);
  const out = JSON.stringify(data, null, 2) + '\n';
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, out, 'utf8');
  fs.renameSync(tmp, file);
  console.log(`${path.relative(repo, file)} — nulled imageUrl: ${stats.nulled}, fixed prompts: ${stats.prompts}`);
}
