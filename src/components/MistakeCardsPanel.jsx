import React, { useState, useEffect } from 'react';
import {
  loadMistakeCards,
  mergeMistakeCards,
  extractMistakesFromHistory,
  getDueCards,
  fetchMistakeCardsFromServer,
  reviewMistakeCardRemote,
} from '../utils/mistakeCards';
import { getPatternById } from '../utils/contentData';
import { getWritingTabForQuestion } from '../navigation';

export default function MistakeCardsPanel({ userId, historyRows, onNavigate }) {
  const [cards, setCards] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const fromHistory = extractMistakesFromHistory(historyRows);
      mergeMistakeCards(userId, fromHistory);
      const serverCards = await fetchMistakeCardsFromServer(userId);
      if (!cancelled) setCards(serverCards.length ? serverCards : loadMistakeCards(userId));
    })();
    return () => { cancelled = true; };
  }, [userId, historyRows]);

  const goOmr = (questionType) => {
    const tab = getWritingTabForQuestion(questionType);
    if (tab) onNavigate?.(tab, { writingMode: 'omr' });
  };

  const dueCount = getDueCards(cards).length;

  const handleReview = async (card, remembered) => {
    const updated = await reviewMistakeCardRemote(userId, card, remembered);
    setCards(updated);
  };

  if (!cards.length) {
    return (
      <div className="app-card mistake-panel" style={{ marginBottom: '24px' }}>
        <h3>🃏 Sổ lỗi cá nhân</h3>
        <div className="mistake-empty">
          <div className="mistake-empty-icon">📋</div>
          <p>Chưa có thẻ lỗi. Làm bài và chấm AI ở tab <strong>Làm đề OMR</strong> — lỗi ngữ pháp sẽ tự lưu vào đây.</p>
          <button
            type="button"
            className="app-btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => onNavigate?.('writing51', { writingMode: 'omr' })}
          >
            Làm đề OMR — Câu 51
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card mistake-panel" style={{ marginBottom: '24px' }}>
      <h3>🃏 Sổ lỗi cá nhân</h3>
      <p className="sub">
        {cards.length} lỗi từ AI chấm bài
        {dueCount > 0 && <> · <strong>{dueCount} cần ôn hôm nay</strong></>}
      </p>
      <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {cards.slice(0, 20).map((card) => {
          const pattern = card.patternId ? getPatternById(card.patternId) : null;
          const isOpen = expanded === card.id;
          const qType = card.questionType || card.questionNumber || 51;
          const isDue = !card.nextReviewDate || card.nextReviewDate <= new Date().toISOString().slice(0, 10);
          return (
            <div
              key={card.id}
              className={`mistake-card${isOpen ? ' open' : ''}${isDue ? ' due' : ''}`}
            >
              <button
                type="button"
                className="mistake-card-toggle"
                onClick={() => setExpanded(isOpen ? null : card.id)}
              >
                <span style={{ fontSize: '0.875rem' }}>
                  <del className="theme-text-danger">{card.wrong}</del>
                  {' → '}
                  <strong className="theme-text-success">{card.correct}</strong>
                </span>
              </button>
              {isOpen && (
                <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--app-text-muted)' }}>
                  {card.reasonVi && <p style={{ margin: '0 0 6px' }}>{card.reasonVi}</p>}
                  {pattern && <p style={{ margin: '0 0 8px', color: 'var(--app-accent)' }}>Pattern: {pattern.patternKo}</p>}
                  {card.nextReviewDate && (
                    <p style={{ margin: '0 0 6px', fontSize: '0.78rem' }}>
                      Ôn tiếp: {card.nextReviewDate} · Đã ôn {card.reviewCount || 0} lần
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="practice-nav-btn" onClick={() => handleReview(card, true)}>
                      ✓ Nhớ rồi
                    </button>
                    <button type="button" className="practice-nav-btn" onClick={() => handleReview(card, false)}>
                      ↻ Ôn lại
                    </button>
                    <button
                      type="button"
                      className="qtype-practice-link"
                      onClick={() => goOmr(Number(qType))}
                    >
                      Làm lại OMR — Câu {qType}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
