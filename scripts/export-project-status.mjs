import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'docs', 'IMPLEMENTATION-STATUS.md');

const apiBase = process.env.VITE_API_BASE_URL
  || process.env.API_BASE_URL
  || `http://localhost:${process.env.VITE_API_PORT || '8080'}`;

async function main() {
  const url = `${apiBase.replace(/\/$/, '')}/api/v1/project/export-status`;
  let body;

  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    body = await res.json();
  } catch (err) {
    console.warn(`Backend unavailable (${err.message}), falling back to GET /tasks`);
    const listRes = await fetch(`${apiBase.replace(/\/$/, '')}/api/v1/project/tasks`);
    if (!listRes.ok) {
      console.error('Cannot reach project API. Start topikai backend first.');
      process.exit(1);
    }
    const tasks = await listRes.json();
    body = {
      generatedAt: new Date().toISOString(),
      taskCount: tasks.length,
      tasks,
      markdown: buildMarkdownLocal(tasks),
    };
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body.markdown, 'utf8');
  console.log(`Wrote ${outPath} (${body.taskCount} tasks)`);
}

function buildMarkdownLocal(tasks) {
  const generatedAt = new Date().toISOString();
  const byStatus = {};
  for (const t of tasks) {
    const s = t.status || 'pending';
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(t);
  }

  let md = `# Implementation Status (auto-generated ${generatedAt})\n\n`;
  md += '> Doc file nay TRUOC khi implement. Source: MySQL project_task.\n\n';

  for (const [title, status] of [
    ['Done (khong lam lai)', 'done'],
    ['In Progress', 'in_progress'],
    ['Pending Phase 1', 'pending'],
    ['Blocked', 'blocked'],
    ['Deferred Phase 2', 'deferred'],
  ]) {
    md += `## ${title}\n\n`;
    const list = byStatus[status] || [];
    if (list.length === 0) {
      md += '_None_\n\n';
      continue;
    }
    for (const task of list) {
      md += `- [${task.status === 'done' ? 'x' : ' '}] **${task.taskKey}** — ${task.title}`;
      if (task.notes) md += ` _(notes: ${task.notes})_`;
      md += '\n';
    }
    md += '\n';
  }

  md += `## Summary\n\n- Total: ${tasks.length}\n`;
  md += `- Done: ${tasks.filter((t) => t.status === 'done').length}\n`;
  return md;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
