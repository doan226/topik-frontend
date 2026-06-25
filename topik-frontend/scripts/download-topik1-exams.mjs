/**
 * Tải đề TOPIK I (PDF, MP3, transcript, đáp án) từ learnkorean.in / topikguide.
 * Run: node scripts/download-topik1-exams.mjs [35 60 91 ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Downloads',
  'TOPIK_I_Exams'
);
const OUT_ROOT = process.env.TOPIK1_EXAMS_DIR || DEFAULT_OUT;

/** @type {Record<string, { folder: string, files: { label: string, url: string, name: string }[] }>} */
const SESSIONS = {
  '35': {
    folder: 'Ki35_2014',
    files: [
      { label: 'papers', url: 'https://content.topikguide.com/file/TOPIK1Papers/35th-TOPIK-I-Papers.pdf', name: '35th-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://content.topikguide.com/file/TOPIK1Papers/35th-TOPIK-I-Answer-Sheet.pdf', name: '35th-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://content.topikguide.com/file/mocktest/35-TOPIK-I-Listening-Audio-File.mp3', name: '35-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=1kqlCIofg-fx9CIBZQvs0jOFWlpbH8lO1', name: '35th-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '36': {
    folder: 'Ki36_2015',
    files: [
      { label: 'papers', url: 'https://drive.google.com/uc?export=download&id=1PWaAhYpt44dbvIebImCJpb5SbQXTzI_t', name: '36th-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://drive.google.com/uc?export=download&id=1yISuFXjl9FFf41BIE5AKpRCkJTZ9ATap', name: '36th-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://drive.google.com/uc?export=download&id=1WMGtnb4xCTbTSXDr_ElB02i79BB3acMR', name: '36-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=1p4w-dwg834L_QSKPXo9FzekZ5u9mv-RO', name: '36th-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '37': {
    folder: 'Ki37_2015',
    files: [
      { label: 'papers', url: 'https://drive.google.com/uc?export=download&id=14HQzUCtGhAUMx6WG0sMMQQBPkaD-XQl0', name: '37th-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://drive.google.com/uc?export=download&id=1P3TcEV4VNEcNRmamQEHw6YK-2_4zYfs0', name: '37th-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://drive.google.com/uc?export=download&id=1gi_xh3Y6toYe6cSnca2k0SZCY0R0eAsm', name: '37-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=1bMfyWj7C67YOs4-1LbxWBOqLOrd-wtNy', name: '37th-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '41': {
    folder: 'Ki41_2016',
    files: [
      { label: 'papers', url: 'https://drive.google.com/uc?export=download&id=1nZpGqII6LIR24EjdQVTMz9EIy2uD6JpI', name: '41st-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://drive.google.com/uc?export=download&id=17zM1AjZGLhKcPvUEwi7f88vkRHFpj1eR', name: '41st-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://drive.google.com/uc?export=download&id=1KKLgs20kfeZEnPoL7mbdOmKo3kgwmQmo', name: '41-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=1cnxTkeNUbG8o6hmh5aU-06t05bP-kyde', name: '41st-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '47': {
    folder: 'Ki47_2017',
    files: [
      { label: 'papers', url: 'https://drive.google.com/uc?export=download&id=1ESuGpvuKMfJ29cjreZ0OHfmfNQIqFWP2', name: '47th-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://drive.google.com/uc?export=download&id=1zm7JED5n1_7vACZOl5IY3TWsbrdt5MTQ', name: '47th-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://drive.google.com/uc?export=download&id=1eN2XdQ4v_N_NUZRt8DcoC3FMVT-GdWuA', name: '47-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=19YE_lxqdVFzEZcSo-iVQO-xFUcTW34ZW', name: '47th-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '52': {
    folder: 'Ki52_2018',
    files: [
      { label: 'papers', url: 'https://drive.google.com/uc?export=download&id=1RCJL89d0CVpW5zoyDFVD-lp62r9ZGu2P', name: '52nd-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://drive.google.com/uc?export=download&id=1oyrXk7jS0y9MP-2uFfOfNkqbUpA95-dk', name: '52nd-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://drive.google.com/uc?export=download&id=16kHt9EPAKDI-QWRpD1kexkXaJGTypJQX', name: '52-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=1VdY2HB3nZCnT11moa_3u51xjsrhj8oJa', name: '52nd-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '60': {
    folder: 'Ki60_2019',
    files: [
      { label: 'papers', url: 'https://drive.google.com/uc?export=download&id=1Ynj1TBuxk-rfg57w-0GR8va28E3hRjia', name: '60th-TOPIK-I-Papers.pdf' },
      { label: 'answers', url: 'https://drive.google.com/uc?export=download&id=1Cl-T_2Ecp43tG_UJcebyAdcvSNFWl6Jn', name: '60th-TOPIK-I-Answers.pdf' },
      { label: 'audio', url: 'https://drive.google.com/uc?export=download&id=1FnHkoTfTonTFRJeSd4as4w0MF5VPg47a', name: '60-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://drive.google.com/uc?export=download&id=1AlfiP_d0aauyMpQdQBIimA82fd1qpGet', name: '60th-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '64': {
    folder: 'Ki64_2020',
    files: [
      { label: 'listen_paper', url: 'https://files.topikguide.com/test-papers/64th-TOPIK-I-Listening-Test-Paper.pdf', name: '64th-TOPIK-I-Listening-Test-Paper.pdf' },
      { label: 'read_paper', url: 'https://files.topikguide.com/test-papers/64th-TOPIK-I-Reading-Test-Paper.pdf', name: '64th-TOPIK-I-Reading-Test-Paper.pdf' },
      { label: 'listen_answers', url: 'https://files.topikguide.com/test-papers/64th-TOPIK-I-Listening-Answers.pdf', name: '64th-TOPIK-I-Listening-Answers.pdf' },
      { label: 'read_answers', url: 'https://files.topikguide.com/test-papers/64th-TOPIK-I-Reading-Answers.pdf', name: '64th-TOPIK-I-Reading-Answers.pdf' },
      { label: 'audio', url: 'https://files.topikguide.com/listening/64-TOPIK-I-Listening-Audio-File.mp3', name: '64-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://files.topikguide.com/test-papers/64th-TOPIK-I-Listening-Transcript.pdf', name: '64th-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '83': {
    folder: 'Ki83_2022',
    files: [
      { label: 'listen_paper', url: 'https://files.topikguide.com/test-papers/83rd-TOPIK-I-Listening-Test-Paper.pdf', name: '83rd-TOPIK-I-Listening-Test-Paper.pdf' },
      { label: 'read_paper', url: 'https://files.topikguide.com/test-papers/83rd-TOPIK-I-Reading-Test-Paper.pdf', name: '83rd-TOPIK-I-Reading-Test-Paper.pdf' },
      { label: 'listen_answers', url: 'https://files.topikguide.com/test-papers/83rd-TOPIK-I-Listening-Answers.pdf', name: '83rd-TOPIK-I-Listening-Answers.pdf' },
      { label: 'read_answers', url: 'https://files.topikguide.com/test-papers/83rd-TOPIK-I-Reading-Answers.pdf', name: '83rd-TOPIK-I-Reading-Answers.pdf' },
      { label: 'audio', url: 'https://files.topikguide.com/listening/83-TOPIK-I-Listening-Audio-File.mp3', name: '83-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://files.topikguide.com/test-papers/83rd-TOPIK-I-Listening-Transcript.pdf', name: '83rd-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
  '91': {
    folder: 'Ki91_2023',
    files: [
      { label: 'listen_paper', url: 'https://files.topikguide.com/test-papers/91st-TOPIK-I-Listening-Test-Paper.pdf', name: '91st-TOPIK-I-Listening-Test-Paper.pdf' },
      { label: 'read_paper', url: 'https://files.topikguide.com/test-papers/91st-TOPIK-I-Reading-Test-Paper.pdf', name: '91st-TOPIK-I-Reading-Test-Paper.pdf' },
      { label: 'listen_answers', url: 'https://files.topikguide.com/test-papers/91st-TOPIK-I-Listening-Answers.pdf', name: '91st-TOPIK-I-Listening-Answers.pdf' },
      { label: 'read_answers', url: 'https://files.topikguide.com/test-papers/91st-TOPIK-I-Reading-Answers.pdf', name: '91st-TOPIK-I-Reading-Answers.pdf' },
      { label: 'audio', url: 'https://files.topikguide.com/listening/91-TOPIK-I-Listening-Audio-File.mp3', name: '91-TOPIK-I-Listening-Audio-File.mp3' },
      { label: 'transcript', url: 'https://files.topikguide.com/test-papers/91st-TOPIK-I-Listening-Transcript.pdf', name: '91st-TOPIK-I-Listening-Transcript.pdf' },
    ],
  },
};

function parseArgs() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (args.length) return args;
  return Object.keys(SESSIONS);
}

async function downloadFile(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    console.log(`  [SKIP] ${path.basename(dest)}`);
    return;
  }
  console.log(`  [GET]  ${path.basename(dest)}`);
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    maxRedirects: 10,
    timeout: 300000,
    headers: { 'User-Agent': 'Mozilla/5.0 TOPIK-AI-downloader/1.0' },
    validateStatus: (s) => s >= 200 && s < 400,
  });
  const buf = Buffer.from(res.data);
  if (buf.length < 512) {
    const preview = buf.toString('utf8', 0, Math.min(buf.length, 200));
    if (/html|DOCTYPE/i.test(preview)) {
      throw new Error(`Link tra ve HTML thay vi file: ${url}`);
    }
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`  [OK]   ${path.basename(dest)} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function downloadSession(ky) {
  const cfg = SESSIONS[ky];
  if (!cfg) throw new Error(`Ky khong ho tro: ${ky}`);
  const dir = path.join(OUT_ROOT, cfg.folder);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n[download-topik1] Ky ${ky} -> ${dir}`);
  const missing = [];
  for (const f of cfg.files) {
    const dest = path.join(dir, f.name);
    try {
      await downloadFile(f.url, dest);
    } catch (err) {
      console.error(`  [FAIL] ${f.name}: ${err.message}`);
      missing.push(f.label);
    }
  }
  return missing;
}

async function main() {
  const kys = parseArgs();
  console.log('[download-topik1] Output:', OUT_ROOT);
  const log = [];
  for (const ky of kys) {
    const missing = await downloadSession(ky);
    log.push({ ky, missing });
  }
  const logPath = path.join(OUT_ROOT, 'download_log.json');
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`\n[download-topik1] Log: ${logPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
