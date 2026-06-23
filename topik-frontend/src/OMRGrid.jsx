import React, { useState, useEffect, useRef } from 'react';
import {
  countKoreanChars,
  getLengthProgress,
  parseQ51Q52Blanks,
  buildQ51Q52Text,
} from './utils/wongojiUtils';

function LengthProgressBar({ questionType, text }) {
  const count = countKoreanChars(text);
  const progress = getLengthProgress(questionType, count);
  if (!progress) return null;

  const statusClass =
    progress.status === 'ok'
      ? 'wongoji-progress--ok'
      : progress.status === 'over'
        ? 'wongoji-progress--over'
        : progress.status === 'under'
          ? 'wongoji-progress--under'
          : '';

  return (
    <div className={`wongoji-progress ${statusClass}`}>
      <div className="wongoji-progress__header">
        <span>Đếm ký tự Hàn: <strong>{progress.count}</strong> / {progress.max}</span>
        <span className="wongoji-progress__target">Mục tiêu: {progress.label}</span>
      </div>
      <div className="progress-bar-track wongoji-progress__track">
        <div
          className="progress-bar-fill wongoji-progress__fill"
          style={{ width: `${progress.pct}%` }}
        />
        <div
          className="wongoji-progress__marker wongoji-progress__marker--min"
          style={{ left: `${Math.round((progress.min / progress.max) * 100)}%` }}
          title={`Tối thiểu ${progress.min}`}
        />
      </div>
    </div>
  );
}

function OMRGrid({ text, questionType: externalQuestionType, onTextChange, hideMainTextarea }) {
  const [currentQuestion, setCurrentQuestion] = useState(51);
  const [gieok, setGieok] = useState('');
  const [nieun, setNieun] = useState('');
  const internalUpdate = useRef(false);

  const SQUARES_PER_ROW = 20;
  const MIN_SQUARES = 200;

  useEffect(() => {
    if (externalQuestionType) {
      setCurrentQuestion(Number(externalQuestionType));
    }
  }, [externalQuestionType]);

  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    if (currentQuestion === 51 || currentQuestion === 52) {
      const parsed = parseQ51Q52Blanks(text);
      setGieok(parsed.gieok);
      setNieun(parsed.nieun);
    }
  }, [text, currentQuestion]);

  useEffect(() => {
    if (currentQuestion !== 51 && currentQuestion !== 52) return;
    const combined = buildQ51Q52Text(gieok, nieun);
    if (onTextChange && combined !== text) {
      internalUpdate.current = true;
      onTextChange(combined);
    }
  }, [gieok, nieun, currentQuestion, onTextChange, text]);

  useEffect(() => {
    if (!hideMainTextarea) return;
    const bigTextArea = document.querySelector(
      'textarea[placeholder*="Hãy viết câu trả lời bằng tiếng Hàn"]'
    );
    const labelText = bigTextArea?.previousElementSibling;
    const isBlankQ = currentQuestion === 51 || currentQuestion === 52;
    if (bigTextArea) {
      bigTextArea.style.display = isBlankQ ? 'none' : 'block';
    }
    if (labelText?.textContent?.includes('Nhập bài làm')) {
      labelText.style.display = isBlankQ ? 'none' : 'block';
    }
  }, [currentQuestion, hideMainTextarea]);

  const handleGieokChange = (e) => setGieok(e.target.value);
  const handleNieunChange = (e) => setNieun(e.target.value);

  const displayRealText = currentQuestion === 51 || currentQuestion === 52 ? '' : (text || '');
  const chars = displayRealText.split('');
  const totalSquaresNeeded = Math.max(
    MIN_SQUARES,
    Math.ceil(chars.length / SQUARES_PER_ROW) * SQUARES_PER_ROW
  );
  const gridSquares = Array.from({ length: totalSquaresNeeded });

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {(currentQuestion === 53 || currentQuestion === 54) && (
        <LengthProgressBar questionType={currentQuestion} text={text} />
      )}

      {(currentQuestion === 51 || currentQuestion === 52) && (
        <div className="omr-blank-form">
          <h4 className="omr-blank-form__title">
            📝 KHU VỰC ĐIỀN ĐÁP ÁN CÂU {currentQuestion}
          </h4>
          <div className="omr-blank-form__fields">
            <div>
              <label className="omr-blank-form__label">
                <span className="omr-blank-form__badge">ㄱ</span>
                Cụm từ điền vào vị trí (ㄱ):
              </label>
              <input
                type="text"
                value={gieok}
                onChange={handleGieokChange}
                placeholder="Nhập câu trả lời cho ô (ㄱ) tại đây..."
                className="omr-blank-form__input"
              />
            </div>
            <div>
              <label className="omr-blank-form__label">
                <span className="omr-blank-form__badge">ㄴ</span>
                Cụm từ điền vào vị trí (ㄴ):
              </label>
              <input
                type="text"
                value={nieun}
                onChange={handleNieunChange}
                placeholder="Nhập câu trả lời cho ô (ㄴ) tại đây..."
                className="omr-blank-form__input"
              />
            </div>
          </div>
        </div>
      )}

      {(currentQuestion === 53 || currentQuestion === 54) && (
        <div className="omr-grid-wrap">
          <h4 className="omr-grid-wrap__title">
            <span>📄 Giấy thi viết TOPIK chuẩn (원고지) - Câu {currentQuestion}</span>
            <span className="omr-grid-wrap__hint">Hàng: 20 ô · vuốt ngang trên mobile</span>
          </h4>
          <div className="omr-grid">
            {gridSquares.map((_, index) => {
              const char = chars[index] || '';
              return (
                <div key={index} className={`omr-cell${char ? ' omr-cell--filled' : ''}`}>
                  {char}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default OMRGrid;
