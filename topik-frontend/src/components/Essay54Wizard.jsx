import React, { useState } from 'react';

const STEPS = [
  { id: 1, label: 'Brainstorm', icon: '💡', desc: 'Ghi ý tưởng & từ khóa' },
  { id: 2, label: 'Outline', icon: '📋', desc: 'Dàn ý 서론–본론–결론' },
  { id: 3, label: 'Viết', icon: '✍️', desc: 'Viết bài trên 원고지' },
  { id: 4, label: 'Review', icon: '🔍', desc: 'Kiểm tra trước khi chấm' },
];

const OUTLINE_FIELDS = [
  { key: 'intro', label: '서론 — Mở bài', placeholder: 'Giới thiệu chủ đề, nêu luận điểm chính…' },
  { key: 'body1', label: '본론 1 — Lý do / Điều kiện', placeholder: 'Trả lời ý 1–2 trong đề…' },
  { key: 'body2', label: '본론 2 — Ví dụ / Giải pháp', placeholder: 'Ví dụ cụ thể, giải pháp…' },
  { key: 'conclusion', label: '결론 — Kết bài', placeholder: 'Tóm tắt, nhấn mạnh quan điểm…' },
];

export default function Essay54Wizard({ children, onStepChange }) {
  const [step, setStep] = useState(1);
  const [brainstorm, setBrainstorm] = useState('');
  const [outline, setOutline] = useState({
    intro: '',
    body1: '',
    body2: '',
    conclusion: '',
  });

  const goTo = (next) => {
    setStep(next);
    onStepChange?.(next);
  };

  const outlineFilled = Object.values(outline).some((v) => v.trim());

  return (
    <div className="essay54-wizard">
      <div className="essay54-wizard__steps">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`essay54-wizard__step${step === s.id ? ' active' : ''}${step > s.id ? ' done' : ''}`}
            onClick={() => s.id <= step && goTo(s.id)}
          >
            <span className="essay54-wizard__step-icon">{s.icon}</span>
            <span className="essay54-wizard__step-label">{s.label}</span>
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="essay54-wizard__panel app-card">
          <h4>💡 Bước 1: Brainstorm</h4>
          <p className="theme-text-muted" style={{ fontSize: '14px', marginBottom: '12px' }}>
            Ghi nhanh từ khóa, luận điểm, ví dụ — không cần viết câu hoàn chỉnh.
          </p>
          <textarea
            className="essay54-wizard__textarea"
            value={brainstorm}
            onChange={(e) => setBrainstorm(e.target.value)}
            placeholder="VD: 지도자, 통찰력, 소통, 책임감, 노력…"
            rows={6}
          />
          <div className="essay54-wizard__nav">
            <button type="button" className="app-btn-primary" onClick={() => goTo(2)}>
              Tiếp → Dàn ý
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="essay54-wizard__panel app-card">
          <h4>📋 Bước 2: Outline (서론–본론–결론)</h4>
          <p className="theme-text-muted" style={{ fontSize: '14px', marginBottom: '12px' }}>
            Lập dàn ý 4 phần trước khi viết bài hoàn chỉnh.
          </p>
          {OUTLINE_FIELDS.map((f) => (
            <div key={f.key} className="essay54-wizard__outline-field">
              <label>{f.label}</label>
              <textarea
                className="essay54-wizard__textarea"
                value={outline[f.key]}
                onChange={(e) => setOutline({ ...outline, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                rows={3}
              />
            </div>
          ))}
          <div className="essay54-wizard__nav">
            <button type="button" className="practice-nav-btn" onClick={() => goTo(1)}>← Brainstorm</button>
            <button type="button" className="app-btn-primary" onClick={() => goTo(3)}>
              Tiếp → Viết bài
            </button>
          </div>
        </div>
      )}

      {step >= 3 && (
        <>
          {step === 3 && outlineFilled && (
            <div className="essay54-wizard__outline-hint app-card">
              <strong>📋 Dàn ý của bạn:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '14px' }}>
                {OUTLINE_FIELDS.filter((f) => outline[f.key]?.trim()).map((f) => (
                  <li key={f.key}>
                    <em>{f.label}:</em> {outline[f.key].slice(0, 80)}
                    {outline[f.key].length > 80 ? '…' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 4 && (
            <div className="essay54-wizard__review app-card">
              <h4>🔍 Bước 4: Review trước khi chấm</h4>
              <ul className="essay54-wizard__review-list">
                <li>✓ Đã trả lời đủ 3 ý trong đề?</li>
                <li>✓ Độ dài 600–700 ký tự Hàn?</li>
                <li>✓ Có 서론–본론–결론 rõ ràng?</li>
                <li>✓ Có ví dụ cụ thể trong thân bài?</li>
              </ul>
              {brainstorm && (
                <p style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                  Brainstorm: {brainstorm.slice(0, 120)}{brainstorm.length > 120 ? '…' : ''}
                </p>
              )}
              <button type="button" className="practice-nav-btn" onClick={() => goTo(3)}>
                ← Quay lại sửa bài
              </button>
            </div>
          )}

          {children}

          <div className="essay54-wizard__nav essay54-wizard__nav--bottom">
            {step === 3 && (
              <button type="button" className="app-btn-primary" onClick={() => goTo(4)}>
                Sang bước Review →
              </button>
            )}
            {step === 4 && (
              <button type="button" className="practice-nav-btn" onClick={() => goTo(3)}>
                ← Sửa bài
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
