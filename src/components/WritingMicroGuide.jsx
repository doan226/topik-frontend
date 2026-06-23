import React, { useState } from 'react';
import { getPatternsByType } from '../utils/contentData';
import { getChart53Formula } from '../utils/contentData';

export default function WritingMicroGuide({ questionType }) {
  const [open, setOpen] = useState(true);

  if (![51, 52, 53].includes(questionType)) return null;

  const patterns =
    questionType === 51 || questionType === 52
      ? getPatternsByType(questionType).slice(0, 4)
      : [];

  const formula = questionType === 53 ? getChart53Formula() : null;

  return (
    <div className="writing-micro-guide">
      <button
        type="button"
        className="writing-micro-guide__toggle"
        onClick={() => setOpen(!open)}
      >
        <span>💡 Micro-guide — Câu {questionType}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="writing-micro-guide__body">
          {(questionType === 51 || questionType === 52) && (
            <>
              <p className="writing-micro-guide__intro">
                {questionType === 51
                  ? 'Câu 51: thông báo/email — thể trang trọng (습니다체).'
                  : 'Câu 52: luận điển logic — thể văn viết (한다체).'}
              </p>
              <ul className="writing-micro-guide__list">
                {patterns.map((p) => (
                  <li key={p.id}>
                    <strong>{p.patternKo}</strong>
                    {p.reasonVi && <span> — {p.reasonVi}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {questionType === 53 && formula && (
            <>
              <p className="writing-micro-guide__intro">
                {formula.overview?.length} · {formula.overview?.style}
              </p>
              <div className="writing-micro-guide__steps">
                {(formula.essayStructure || []).map((s) => (
                  <div key={s.step} className="writing-micro-guide__step">
                    <span className="writing-micro-guide__step-num">{s.step}</span>
                    <div>
                      <strong>{s.ko}</strong>
                      <span> — {s.vi}</span>
                    </div>
                  </div>
                ))}
              </div>
              {formula.overview?.rules?.length > 0 && (
                <ul className="writing-micro-guide__list">
                  {formula.overview.rules.slice(0, 3).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
