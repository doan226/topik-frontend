/**
 * Export essay text + score as PNG without external deps.
 */
export async function exportEssayImage({
  studentText = '',
  totalScore = 0,
  maxScore = 50,
  questionType = 54,
  filename = 'topik-essay.png',
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  ctx.fillStyle = '#fffef8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`TOPIK II · Câu ${questionType}`, 40, 60);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Điểm: ${totalScore} / ${maxScore}`, 40, 92);

  ctx.font = '18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = '#1e293b';

  const lines = wrapText(ctx, studentText || '(trống)', canvas.width - 80, 28);
  let y = 130;
  for (const line of lines) {
    if (y > canvas.height - 60) break;
    ctx.fillText(line, 40, y);
    y += 32;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve(true);
    }, 'image/png');
  });
}

function wrapText(ctx, text, maxWidth, lineHeight) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (!lines.length) lines.push('');
  return lines;
}

export default exportEssayImage;
