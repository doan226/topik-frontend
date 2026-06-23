import React, { useEffect, useState } from 'react';
import { getPackById, getDisplayWord, getPackIdsForCharacter } from '../utils/hanjaData';
import { getMemoryHook, getQuickCompound, getPackTheme, isShowcasePack } from '../utils/hanjaMemory';

export default function HanjaCharacterCard({
  character,
  onToggleSave,
  saved,
  compact = false,
  onNavigatePack,
  enableBrowseFlip = false,
}) {
  const [browseFlipped, setBrowseFlipped] = useState(false);

  useEffect(() => setBrowseFlipped(false), [character?.id]);

  if (!character) return null;

  const packIds = getPackIdsForCharacter(character.id);
  const showcasePackId = packIds.find((id) => isShowcasePack(id));
  const pack = getPackById(character.packId || showcasePackId || packIds[0]);
  const mainWord = getDisplayWord(character);
  const memory = getMemoryHook(character);
  const quickCompound = getQuickCompound(character);
  const packTheme = getPackTheme(showcasePackId || pack?.packId);

  const flipToggle = enableBrowseFlip ? (
    <button
      type="button"
      onClick={() => setBrowseFlipped((f) => !f)}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: browseFlipped ? '2px solid var(--app-purple)' : '1px solid var(--app-border)',
        background: browseFlipped ? 'var(--app-purple-soft, var(--app-surface-2))' : 'var(--app-surface-2)',
        color: browseFlipped ? 'var(--app-purple, var(--app-text))' : 'var(--app-text)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {browseFlipped ? 'Ẩn nghĩa' : '🃏 Lật thẻ xem'}
    </button>
  ) : null;

  return (
    <div
      className="practice-card"
      style={{
        padding: compact ? '16px' : '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {(character.hanViet || character.reading) && (
        <div
          className="hanja-card-hero"
          style={packTheme ? { borderColor: packTheme.border, background: packTheme.accentSoft } : undefined}
        >
          <div className="hanja-card-hero__meta">
            {character.hanViet && (
              <span className="hanja-card-hero__hv">{character.hanViet}</span>
            )}
            {character.reading && (
              <span className="hanja-card-hero__reading">âm {character.reading}</span>
            )}
          </div>
          {quickCompound && (
            <div className="hanja-card-hero__anchor">
              <span className="hanja-card-hero__anchor-label">Từ nhớ nhanh</span>
              <strong>{quickCompound.ko}</strong>
              {quickCompound.vi && <span> — {quickCompound.vi}</span>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {enableBrowseFlip && !browseFlipped ? (
            <button
              type="button"
              onClick={() => setBrowseFlipped(true)}
              style={{
                width: '100%',
                textAlign: 'center',
                border: '2px dashed var(--app-border)',
                borderRadius: '12px',
                background: 'var(--app-surface-2)',
                cursor: 'pointer',
                padding: compact ? '20px 16px' : '28px 24px',
              }}
            >
              <div style={{ fontSize: compact ? '36px' : '48px', lineHeight: 1.2, fontWeight: 700 }}>
                {mainWord}
              </div>
              {character.reading && (
                <div style={{ marginTop: '12px', fontSize: '16px', color: 'var(--app-text-muted)', fontWeight: 600 }}>
                  Âm gốc: {character.reading}
                </div>
              )}
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--app-text-muted)' }}>
                Nhấn để xem nghĩa · không tốn lượt SRS
              </div>
            </button>
          ) : enableBrowseFlip && browseFlipped ? (
            <div
              style={{
                textAlign: 'center',
                border: '2px solid var(--app-purple)',
                borderRadius: '12px',
                background: 'var(--app-purple-soft, var(--app-surface-2))',
                padding: compact ? '20px 16px' : '28px 24px',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                Nghĩa tiếng Việt
              </div>
              <div style={{ fontSize: compact ? '24px' : '28px', fontWeight: 700, color: 'var(--app-accent)' }}>
                {character.meaningVi}
              </div>
              {character.compounds?.[0] && (
                <div style={{ marginTop: '14px', fontSize: '14px', color: 'var(--app-text-muted)' }}>
                  {character.compounds[0].ko} — {character.compounds[0].vi}
                </div>
              )}
              {memory && (
                <div className="hanja-memory-box">
                  <span className="hanja-memory-box__emoji">{memory.emoji}</span>
                  <div>
                    {memory.hook && <div className="hanja-memory-box__hook">{memory.hook}</div>}
                    {memory.mnemonicVi && (
                      <p className="hanja-memory-box__text">{memory.mnemonicVi}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: compact ? '36px' : '48px', lineHeight: 1.2, fontWeight: 700 }}>
                {mainWord}
              </div>
              {character.reading && (
                <div style={{ marginTop: '8px', fontSize: '16px', color: 'var(--app-text-muted)', fontWeight: 600 }}>
                  Âm gốc: {character.reading}
                </div>
              )}
              <div style={{ fontSize: compact ? '15px' : '18px', color: 'var(--app-accent)', fontWeight: 600, marginTop: '8px' }}>
                {character.meaningVi}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
          {onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              title={saved ? 'Bỏ khỏi danh sách chưa thuộc' : 'Lưu để ôn lại sau'}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: saved ? '2px solid var(--app-warning)' : '1px solid var(--app-border)',
                background: saved ? 'var(--app-warning-soft)' : 'var(--app-surface-2)',
                color: saved ? 'var(--app-warning-text)' : 'var(--app-text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {saved ? '★ Đã lưu' : '☆ Chưa thuộc'}
            </button>
          )}
          {flipToggle}
        </div>
      </div>

      {pack && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '13px' }}>
          <button
            type="button"
            onClick={() => onNavigatePack?.(pack.packId)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              background: 'var(--app-purple-soft, var(--app-surface-2))',
              color: 'var(--app-purple, var(--app-text))',
              cursor: onNavigatePack ? 'pointer' : 'default',
              fontSize: '13px',
            }}
          >
            {pack.titleVi}
          </button>
        </div>
      )}

      {!enableBrowseFlip && memory && (
        <div className="hanja-memory-box">
          <span className="hanja-memory-box__emoji">{memory.emoji}</span>
          <div>
            {memory.hook && <div className="hanja-memory-box__hook">{memory.hook}</div>}
            {memory.mnemonicVi && (
              <p className="hanja-memory-box__text">{memory.mnemonicVi}</p>
            )}
          </div>
        </div>
      )}

      {(!enableBrowseFlip || browseFlipped) && character.compounds?.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px' }}>
            Từ liên quan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {character.compounds.map((co) => (
              <div
                key={co.ko}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--app-surface-2)',
                  fontSize: '14px',
                }}
              >
                <span><strong>{co.ko}</strong></span>
                <span style={{ color: 'var(--app-text-muted)' }}>{co.vi}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!enableBrowseFlip || browseFlipped) && character.examples?.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px' }}>
            Ví dụ
          </div>
          {character.examples.map((ex, i) => (
            <p key={i} style={{ margin: '0 0 4px 0', fontSize: '14px', lineHeight: 1.5 }}>
              {ex.ko}
              {ex.vi && <span style={{ display: 'block', color: 'var(--app-text-muted)', fontSize: '13px' }}>{ex.vi}</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
