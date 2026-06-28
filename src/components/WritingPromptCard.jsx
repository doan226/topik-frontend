import React from 'react';

const BLANK_SPLIT = /(\(\s*[㉠㉡㉢㉣ㄱㄴㄷ]\s*\))/g;
const BLANK_MATCH = /^\(\s*([㉠㉡㉢㉣ㄱㄴㄷ])\s*\)$/;

/** Render text, turning ( ㉠ ) / ( ㉡ ) placeholders into highlighted chips. */
function renderWithBlanks(text, keyPrefix) {
  if (!text) return null;
  return text.split(BLANK_SPLIT).map((part, i) => {
    const m = part.match(BLANK_MATCH);
    if (m) {
      return (
        <span key={`${keyPrefix}-b${i}`} className="wp-blank">
          {m[1]}
        </span>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t${i}`}>{part}</React.Fragment>;
  });
}

/** Render an array of raw lines as paragraphs (empty line = spacing). */
function renderLines(lines, keyPrefix) {
  return lines.map((ln, i) =>
    ln.trim() === '' ? (
      <div key={`${keyPrefix}-gap${i}`} className="wp-gap" />
    ) : (
      <p key={`${keyPrefix}-ln${i}`} className="wp-line">
        {renderWithBlanks(ln.trim(), `${keyPrefix}-ln${i}`)}
      </p>
    )
  );
}

const isTitle = (t) => /^제목\s*[:：]/.test(t);
const isAuthor = (t) => /^(작성자|보낸\s*사람)\s*[:：]/.test(t);
const isRecipientTag = (t) => /^받는\s*사람\s*[:：]/.test(t);
const stripTag = (t) => t.replace(/^[^:：]*[:：]\s*/, '');
const isRecipient = (t) => /께$/.test(t) && t.length <= 24;
const isSender = (t) => /(올림|드림)$/.test(t) && t.length <= 24;
const hasEndPunct = (t) => /[.?!]$/.test(t);
const hasBlank = (t) => /[㉠㉡㉢㉣ㄱㄴㄷ]/.test(t);

/** Câu 51 — thư hoặc thông báo/quảng cáo (skeuomorphic). */
function PromptLetter({ prompt }) {
  const lines = prompt.split('\n');
  let title = null;
  let recipient = null;
  let sender = null;
  const bodyIdx = [];

  lines.forEach((raw, idx) => {
    const t = raw.trim();
    if (isTitle(t)) title = stripTag(t);
    else if (isRecipientTag(t)) recipient = stripTag(t);
    else if (isAuthor(t)) recipient = recipient || stripTag(t);
    else if (!recipient && isRecipient(t)) recipient = t;
    else if (!sender && isSender(t)) sender = t;
    else bodyIdx.push(idx);
  });

  const isLetter = Boolean(recipient || sender);

  // Poster/notice: dòng đầu ngắn không có dấu kết câu → tiêu đề lớn.
  if (!isLetter && !title) {
    const firstReal = bodyIdx.find((i) => lines[i].trim() !== '');
    if (firstReal != null) {
      const t = lines[firstReal].trim();
      if (t.length <= 18 && !hasEndPunct(t) && !hasBlank(t)) {
        title = t;
        const pos = bodyIdx.indexOf(firstReal);
        bodyIdx.splice(pos, 1);
      }
    }
  }

  // Bỏ dòng trống ở đầu/cuối phần thân.
  while (bodyIdx.length && lines[bodyIdx[0]].trim() === '') bodyIdx.shift();
  while (bodyIdx.length && lines[bodyIdx[bodyIdx.length - 1]].trim() === '') bodyIdx.pop();
  const bodyLines = bodyIdx.map((i) => lines[i]);

  return (
    <div className={`wp-card ${isLetter ? 'wp-letter' : 'wp-notice'}`}>
      <div className="wp-paper-bar">
        <span className="wp-paper-icon">{isLetter ? '✉️' : '📢'}</span>
        <span className="wp-paper-kind">{isLetter ? '이메일 / 편지' : '안내문'}</span>
      </div>
      {title && (
        <div className={isLetter ? 'wp-letter__subject' : 'wp-notice__title'}>
          {title}
        </div>
      )}
      {recipient && <div className="wp-letter__to">{recipient}</div>}
      <div className="wp-body">{renderLines(bodyLines, 'letter')}</div>
      {sender && <div className="wp-letter__from">{sender}</div>}
    </div>
  );
}

/** Câu 52 — đoạn văn học thuật (thẻ trang đọc). */
function PromptReading({ prompt }) {
  const lines = prompt.split('\n').filter((l) => l.trim() !== '');
  return (
    <div className="wp-card wp-reading">
      <div className="wp-paper-bar wp-paper-bar--reading">
        <span className="wp-paper-icon">📖</span>
        <span className="wp-paper-kind">읽기 지문</span>
      </div>
      <div className="wp-body wp-reading__body">
        {lines.map((ln, i) => (
          <p key={`rd-${i}`} className="wp-line">
            {renderWithBlanks(ln.trim(), `rd-${i}`)}
          </p>
        ))}
      </div>
    </div>
  );
}

const isBullet = (t) => /^([∙•·*\-‧·]|[0-9]+[.)])\s*/.test(t);
const stripBullet = (t) => t.replace(/^([∙•·*\-‧·]|[0-9]+[.)])\s*/, '');
const isInstruction = (t) =>
  /(쓰십시오|쓰시오|쓰라|쓰세요)/.test(t) &&
  (t.includes('자로') || t.includes('주제로') || t.includes('참고') || t.includes('단,') || t.includes('단 ,'));

/** Câu 54 — phiếu đề luận (banner chủ đề + checklist). */
function PromptEssay({ prompt, maxScore }) {
  const lines = prompt.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const bullets = [];
  const instructions = [];
  const introLines = [];

  lines.forEach((t) => {
    if (isBullet(t)) bullets.push(stripBullet(t));
    else if (isInstruction(t)) instructions.push(t);
    else introLines.push(t);
  });

  const intro = introLines.join(' ');
  const themeMatch = intro.match(/['‘]([^'’]+)['’]/);
  const theme = themeMatch ? themeMatch[1] : null;

  return (
    <div className="wp-card wp-essay">
      <div className="wp-essay__meta">
        <span className="wp-essay__chip">✍️ 600~700자</span>
        <span className="wp-essay__chip">⭐ {maxScore}점</span>
        <span className="wp-essay__chip">🧩 서론·본론·결론</span>
      </div>
      {theme && (
        <div className="wp-essay__banner">
          <span className="wp-essay__banner-label">주제 (Chủ đề)</span>
          <span className="wp-essay__banner-text">{theme}</span>
        </div>
      )}
      {intro && <p className="wp-essay__intro">{intro}</p>}
      {bullets.length > 0 && (
        <ol className="wp-essay__checklist">
          {bullets.map((b, i) => (
            <li key={`bl-${i}`} className="wp-essay__item">
              <span className="wp-essay__num">{i + 1}</span>
              <span className="wp-essay__item-text">{b}</span>
            </li>
          ))}
        </ol>
      )}
      {instructions.length > 0 && (
        <p className="wp-essay__note">
          {instructions.join(' ')}
        </p>
      )}
    </div>
  );
}

export default function WritingPromptCard({ question }) {
  if (!question?.prompt) return null;
  const { type, prompt, maxScore } = question;

  if (type === 51) return <PromptLetter prompt={prompt} />;
  if (type === 52) return <PromptReading prompt={prompt} />;
  if (type === 54) return <PromptEssay prompt={prompt} maxScore={maxScore} />;

  // Fallback: giữ nguyên dạng text.
  return <div className="exam-room__prompt-text">{prompt}</div>;
}
