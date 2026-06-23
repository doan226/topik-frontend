import React, { useEffect, useState } from 'react';
import type { PassageCard } from '../utils/passageVocab';
import { formatPassageContext } from '../utils/passageVocab';

interface PassageSrsFlashcardProps {
  card: PassageCard;
  onRate: (rating: number) => void;
}

export default function PassageSrsFlashcard({ card, onRate }: PassageSrsFlashcardProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [card.id]);

  if (!card) return null;
  const ctx = formatPassageContext(card.specialty);

  return (
    <div className="practice-card" style={{ padding: 24, textAlign: 'center' }}>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        style={{
          width: '100%',
          minHeight: 200,
          border: '2px dashed var(--app-border)',
          borderRadius: 12,
          background: 'var(--app-surface-2)',
          cursor: 'pointer',
          padding: 24,
        }}
      >
        {!flipped ? (
          <>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3 }}>{card.word}</div>
            {ctx && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--app-text-muted)' }}>{ctx}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--app-text-muted)' }}>Nhấn để lật</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-accent)', lineHeight: 1.4 }}>
              {card.meaning}
            </div>
            {ctx && (
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--app-text-muted)' }}>
                Gặp trong: {ctx}
              </div>
            )}
          </>
        )}
      </button>
      {flipped && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { q: 1, label: 'Again', color: 'var(--app-danger)' },
            { q: 2, label: 'Hard', color: 'var(--app-warning)' },
            { q: 3, label: 'Good', color: 'var(--app-success)' },
            { q: 4, label: 'Easy', color: 'var(--app-accent)' },
          ].map(({ q, label, color }) => (
            <button
              key={q}
              type="button"
              onClick={() => onRate(q)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: color,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
