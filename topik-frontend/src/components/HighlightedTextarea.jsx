import React from 'react';
import { highlightErrors } from './GradingResultPanel';

export default function HighlightedTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  grammarErrors,
  showHighlights,
}) {
  const segments = showHighlights && grammarErrors?.length
    ? highlightErrors(value, grammarErrors)
    : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {segments && value ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: '15px',
            borderRadius: '8px',
            fontSize: '16px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            pointerEvents: 'none',
            color: 'transparent',
            zIndex: 1,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {segments.map((seg, i) =>
            seg.highlight ? (
              <span
                key={i}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  textDecoration: 'underline wavy #ef4444',
                }}
                title={seg.reason}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '130px',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '16px',
          outline: 'none',
          boxSizing: 'border-box',
          lineHeight: '1.6',
          position: 'relative',
          zIndex: 2,
          backgroundColor: segments && value ? 'rgba(255,255,255,0.85)' : '#fff',
        }}
      />
    </div>
  );
}
