// One-off: export question bank to JSON for backend seed
import { questionBank } from '../src/QuestionBank.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '../../Users/01666/Downloads/topikai/topikai/src/main/resources/question-bank.json');
writeFileSync(out, JSON.stringify(questionBank, null, 2), 'utf8');
console.log(`Exported ${questionBank.length} questions to ${out}`);
