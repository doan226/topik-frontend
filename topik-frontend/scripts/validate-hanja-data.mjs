import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bankPath = join(__dirname, '..', 'data', 'hanja-bank.json');

const VALID_ACCESS = new Set(['free', 'premium']);
const PACK_ACCESS_PREFIX = 'pack:';

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

let raw;
try {
  raw = readFileSync(bankPath, 'utf8');
} catch {
  fail(`Không đọc được ${bankPath}`);
}

let bank;
try {
  bank = JSON.parse(raw);
} catch (e) {
  fail(`JSON không hợp lệ: ${e.message}`);
}

if (!bank.meta?.version) fail('Thiếu meta.version');
if (!Array.isArray(bank.packs)) fail('packs phải là mảng');
if (!Array.isArray(bank.characters)) fail('characters phải là mảng');

const charById = new Map();
for (const c of bank.characters) {
  if (!c.id) fail('Character thiếu id');
  if (charById.has(c.id)) fail(`Character id trùng: ${c.id}`);
  if (!c.char) fail(`Character ${c.id} thiếu char`);
  if (!c.reading) fail(`Character ${c.id} thiếu reading`);
  if (!c.meaningVi) fail(`Character ${c.id} thiếu meaningVi`);
  charById.set(c.id, c);
}

const packIds = new Set();
for (const p of bank.packs) {
  if (!p.packId) fail('Pack thiếu packId');
  if (packIds.has(p.packId)) fail(`Pack id trùng: ${p.packId}`);
  packIds.add(p.packId);

  if (!p.titleVi) fail(`Pack ${p.packId} thiếu titleVi`);
  if (!p.access) fail(`Pack ${p.packId} thiếu access`);

  const access = p.access;
  const validAccess =
    VALID_ACCESS.has(access) ||
    (typeof access === 'string' && access.startsWith(PACK_ACCESS_PREFIX) && access.length > PACK_ACCESS_PREFIX.length);
  if (!validAccess) fail(`Pack ${p.packId} access không hợp lệ: ${access}`);

  if (!Array.isArray(p.charIds)) fail(`Pack ${p.packId} charIds phải là mảng`);
  for (const cid of p.charIds) {
    if (!charById.has(cid)) fail(`Pack ${p.packId} tham chiếu charId không tồn tại: ${cid}`);
  }
}

for (const c of bank.characters) {
  if (c.packId && !packIds.has(c.packId)) {
    fail(`Character ${c.id} packId không tồn tại: ${c.packId}`);
  }
  if (c.compounds) {
    for (const comp of c.compounds) {
      if (!comp.ko) fail(`Character ${c.id} compound thiếu ko`);
    }
  }
}

ok(`meta: ${bank.meta.title || 'Hán Hàn'} v${bank.meta.version}`);
ok(`${bank.packs.length} packs, ${bank.characters.length} characters`);
ok('hanja-bank.json hợp lệ');
