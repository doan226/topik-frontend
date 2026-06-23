import React, { useMemo, useState } from 'react';
import {
  getCharactersForPack,
  getPackById,
  getPackProgress,
  getDisplayWord,
  groupByReading,
  canAccessPack,
} from '../utils/hanjaData';
import {
  getPackTheme,
  getMemoryHook,
  getQuickCompound,
  isShowcasePack,
} from '../utils/hanjaMemory';

function ReadingChip({ reading, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hanja-reading-chip${active ? ' hanja-reading-chip--active' : ''}`}
    >
      <span className="hanja-reading-chip__sound">{reading}</span>
      <span className="hanja-reading-chip__count">{count} từ</span>
    </button>
  );
}

function CharacterTile({ character, theme, onSelect, learned }) {
  const hook = getMemoryHook(character);
  const compound = getQuickCompound(character);
  const mainWord = getDisplayWord(character);

  return (
    <button
      type="button"
      className={`hanja-char-tile${learned ? ' hanja-char-tile--learned' : ''}`}
      onClick={() => onSelect?.(character)}
      style={{ '--hanja-tile-accent': theme?.accent }}
    >
      {learned && <span className="hanja-char-tile__badge">✓</span>}
      <div className="hanja-char-tile__label">{character.hanViet || character.reading}</div>
      <div className="hanja-char-tile__reading">âm {character.reading}</div>
      <div className="hanja-char-tile__ko">{mainWord}</div>
      {hook?.hook && (
        <div className="hanja-char-tile__hook">
          {hook.emoji} {hook.hook}
        </div>
      )}
      {compound && (
        <div className="hanja-char-tile__compound">
          <strong>{compound.ko}</strong>
          {compound.vi && <span> · {compound.vi}</span>}
        </div>
      )}
    </button>
  );
}

export default function HanjaPackShowcase({
  packId,
  accessCtx,
  srsState = {},
  onOpenCharacter,
  onBrowsePack,
  onUpgradeClick,
}) {
  const [readingFilter, setReadingFilter] = useState('');

  const pack = getPackById(packId);
  const theme = getPackTheme(packId);
  const accessible = pack && canAccessPack(pack, accessCtx);
  const progress = getPackProgress(packId, srsState);

  const characters = useMemo(() => getCharactersForPack(packId), [packId]);
  const readingGroups = useMemo(() => groupByReading(characters), [characters]);

  const filteredChars = useMemo(() => {
    if (!readingFilter) return characters;
    const group = readingGroups.find((g) => g.reading === readingFilter);
    return group?.characters || characters;
  }, [characters, readingGroups, readingFilter]);

  if (!pack || !isShowcasePack(packId) || !theme) return null;

  const learnedIds = new Set(
    characters
      .filter((c) => {
        const s = srsState[c.id];
        return s && s.repetitions >= 3;
      })
      .map((c) => c.id)
  );

  return (
    <div
      className="hanja-pack-showcase"
      style={{
        background: theme.gradient,
        borderColor: theme.border,
      }}
    >
      {!accessible && (
        <div className="hanja-pack-showcase__lock">
          <div style={{ fontSize: '40px' }}>🔒</div>
          <p>
            {packId === 'topik-intermediate'
              ? '27 gốc âm nâng cao — cần PREMIUM'
              : 'Pack bị khóa'}
          </p>
          <button type="button" onClick={onUpgradeClick} className="app-btn-premium">
            ⭐ Nâng cấp
          </button>
        </div>
      )}

      <div className="hanja-pack-showcase__header">
        <div className="hanja-pack-showcase__icon">{theme.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="hanja-pack-showcase__title">{pack.titleVi}</h3>
          <p className="hanja-pack-showcase__tagline">{theme.tagline}</p>
        </div>
        <div className="hanja-pack-showcase__stats">
          <span style={{ color: theme.accent, fontWeight: 800 }}>
            {progress.learned}/{progress.total}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>đã thuộc</span>
        </div>
      </div>

      <div className="hanja-pack-showcase__progress">
        <div
          className="hanja-pack-showcase__progress-fill"
          style={{ width: `${progress.percent}%`, background: theme.accent }}
        />
      </div>

      <p className="hanja-pack-showcase__tip">💡 {theme.tip}</p>

      <div className="hanja-pack-showcase__actions">
        <button
          type="button"
          className="practice-nav-btn"
          onClick={() => onBrowsePack?.(packId)}
          disabled={!accessible}
        >
          Xem & lật thẻ chi tiết
        </button>
      </div>

      <div className="hanja-pack-showcase__reading-row">
        <ReadingChip
          reading="Tất cả"
          count={characters.length}
          active={!readingFilter}
          onClick={() => setReadingFilter('')}
        />
        {readingGroups.map((g) => (
          <ReadingChip
            key={g.reading}
            reading={g.reading}
            count={g.characters.length}
            active={readingFilter === g.reading}
            onClick={() => setReadingFilter(readingFilter === g.reading ? '' : g.reading)}
          />
        ))}
      </div>

      <div className={`hanja-char-grid${!accessible ? ' hanja-char-grid--locked' : ''}`}>
        {filteredChars.map((c) => (
          <CharacterTile
            key={c.id}
            character={c}
            theme={theme}
            learned={learnedIds.has(c.id)}
            onSelect={accessible ? onOpenCharacter : undefined}
          />
        ))}
      </div>
    </div>
  );
}
