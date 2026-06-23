import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

export default function RecentSubmissions({
  userId,
  questionNumber,
  onSelect,
  selectedId,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/v1/dashboard/${userId}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const filtered = data
          .filter((r) => Number(r.question_number) === Number(questionNumber))
          .slice(-10)
          .reverse();
        if (!cancelled) setItems(filtered);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, questionNumber]);

  if (loading) {
    return (
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>Đang tải bài gần đây...</p>
    );
  }

  if (!items.length) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
        📂 Bài gần đây (câu {questionNumber})
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {items.map((item, idx) => {
          let score = 0;
          try {
            const ai = JSON.parse(item.ai_feedback_json || '{}');
            score = ai.total_score || item.score || 0;
          } catch {
            score = item.score || 0;
          }
          const label = item.created_at
            ? `${item.created_at} · ${score}đ`
            : `Lần ${idx + 1} · ${score}đ`;
          const active = selectedId === item.id;
          return (
            <button
              key={item.id || idx}
              type="button"
              onClick={() => onSelect(item)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: active ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                backgroundColor: active ? '#dbeafe' : '#f8fafc',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
