import React, { useEffect, useState } from 'react';
import { lookupDict, ensurePassageVocab } from '../modules/lib/apiClient';
import type { SelectionAnchor } from '../hooks/useTextSelectionLookup';
import { getExamMeta } from '../modules/lib/examMeta';

export interface WordLookupContext {
  examId: string;
  section: 'listening' | 'reading';
  questionNo: string;
}

interface DictHit {
  word: string;
  meaning: string;
  pos?: string;
}

interface WordLookupPopoverProps {
  word: string;
  anchor: SelectionAnchor;
  context: WordLookupContext;
  userId: number | string;
  onSaved?: () => void;
  onClose: () => void;
  showToast?: (msg: string, type?: string) => void;
}

export default function WordLookupPopover({
  word,
  anchor,
  context,
  userId,
  onSaved,
  onClose,
  showToast,
}: WordLookupPopoverProps) {
  const [loading, setLoading] = useState(true);
  const [hit, setHit] = useState<DictHit | null>(null);
  const [meaning, setMeaning] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await lookupDict(word);
      if (cancelled) return;
      if (result) {
        setHit({ word: result.word, meaning: result.meaning, pos: result.pos });
        setMeaning(result.meaning || '');
      } else {
        setHit(null);
        setMeaning('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [word]);

  const examTitle = getExamMeta(context.examId).title.replace('TOPIK II — ', '');
  const sectionLabel = context.section === 'listening' ? 'Nghe' : 'Đọc';
  const contextLabel = `${examTitle} · ${sectionLabel} · Câu ${context.questionNo}`;

  const handleSave = async () => {
    const trimmed = meaning.trim();
    if (!trimmed) {
      showToast?.('Nhập nghĩa tiếng Việt trước khi lưu', 'info');
      return;
    }
    setSaving(true);
    const { ok, data } = await ensurePassageVocab(userId, {
      word,
      meaning: trimmed,
      examId: context.examId,
      section: context.section,
      questionNo: context.questionNo,
    });
    setSaving(false);
    if (!ok) {
      showToast?.(data?.message || 'Không lưu được từ', 'error');
      return;
    }
    setSaved(true);
    showToast?.('Đã lưu từ để ôn sau', 'success');
    onSaved?.();
  };

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 900 }}
      />
      <div
        className="practice-card"
        style={{
          position: 'absolute',
          top: anchor.top,
          left: Math.min(anchor.left, window.innerWidth - 320),
          zIndex: 901,
          width: 'min(300px, calc(100vw - 24px))',
          padding: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--app-text-muted)' }}>{contextLabel}</p>
        <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>{word}</p>

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--app-text-muted)' }}>Đang tra từ điển…</p>
        ) : (
          <>
            {hit?.pos && (
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--app-text-muted)' }}>{hit.pos}</p>
            )}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Nghĩa tiếng Việt
            </label>
            <input
              type="text"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder={hit ? '' : 'Từ điển chưa có — nhập nghĩa'}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--app-border)',
                fontSize: 14,
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="app-btn-premium-action"
            disabled={loading || saving || saved}
            onClick={handleSave}
            style={{ flex: 1, minWidth: 120 }}
          >
            {saved ? 'Đã lưu' : saving ? 'Đang lưu…' : 'Lưu để ôn'}
          </button>
          <button type="button" className="practice-nav-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}
