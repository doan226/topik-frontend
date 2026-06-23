import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, '..', 'data', 'hanja-bank.json');
const backendRoot = process.env.TOPIKAI_ROOT
  || join(root, '..', '..', 'Users', '01666', 'Downloads', 'topikai', 'topikai');
const dest = join(backendRoot, 'src', 'main', 'resources', 'hanja-bank.json');

copyFileSync(src, dest);
console.log('Synced hanja-bank.json → backend resources');
