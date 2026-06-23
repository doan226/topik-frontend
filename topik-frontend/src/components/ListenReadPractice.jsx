import React, { useState, useMemo } from 'react';
import { listenReadItems } from '../utils/contentData';

export default function ListenReadPractice({ showToast }) {
  const readingSet = useMemo(
    () => listenReadItems.filter((i) => i.type === 'reading'),
    []
  );
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);

  if (!readingSet.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Chưa có câu luyện đọc trong data/listen-read-bank.json
      </div>
    );
  }

  const item = readingSet[current % readingSet.length];

  const handleSelect = (idx) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    if (idx === item.correct) {
      setScore((s) => s + 1);
      showToast('Chính xác!', 'success');
    } else {
      showToast('Chưa đúng — xem giải thích bên dưới', 'info');
    }
    setDone((d) => d + 1);
  };

  const next = () => {
    setSelected(null);
    setRevealed(false);
    setCurrent((c) => (c + 1) % readingSet.length);
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: 'clamp(16px, 4vw, 28px)', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
      <h2 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: 'clamp(18px, 4vw, 22px)' }}>📖 Luyện Đọc hiểu</h2>
      <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
        Trắc nghiệm máy chấm — không tốn AI. Câu {current + 1}/{readingSet.length} · Điểm: <strong>{score}/{done}</strong>
      </p>

      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', lineHeight: 1.7, fontSize: '15px' }}>
        {item.passage}
      </div>

      <p style={{ fontWeight: 'bold', color: '#334155', marginBottom: '12px' }}>{item.question}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {item.options.map((opt, idx) => {
          let bg = '#fff';
          let border = '1px solid #cbd5e1';
          if (revealed) {
            if (idx === item.correct) {
              bg = '#dcfce7';
              border = '2px solid #22c55e';
            } else if (idx === selected) {
              bg = '#fee2e2';
              border = '2px solid #ef4444';
            }
          } else if (selected === idx) {
            border = '2px solid #3b82f6';
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={revealed}
              onClick={() => handleSelect(idx)}
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                borderRadius: '6px',
                border,
                backgroundColor: bg,
                cursor: revealed ? 'default' : 'pointer',
                fontSize: '14px',
                color: '#1e293b',
              }}
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '14px', color: '#166534' }}>
          <strong>Giải thích:</strong> {item.explanation}
        </div>
      )}

      {revealed && (
        <button
          type="button"
          onClick={next}
          style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Câu tiếp theo →
        </button>
      )}
    </div>
  );
}
