import React from 'react';

const TYPE_STYLES = {
  success: { bg: '#dcfce7', border: '#86efac', color: '#166534' },
  error: { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
  warning: { bg: '#fef9c3', border: '#fde047', color: '#854d0e' },
  info: { bg: '#e0f2fe', border: '#7dd3fc', color: '#0369a1' },
};

export default function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        left: '16px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            role="alert"
            style={{
              pointerEvents: 'auto',
              maxWidth: '420px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1px solid ${s.border}`,
              backgroundColor: s.bg,
              color: s.color,
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: s.color,
                fontSize: '18px',
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
