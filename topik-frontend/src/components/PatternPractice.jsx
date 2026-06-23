import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getExercisesByType,
  getPatternById,
  getExpressionCards5152,
  getVocabCards5152,
  getVocabGroupsByType,
  getPattern5152Stats,
} from '../utils/contentData';
import {
  detectBlanksInPrompt,
  getAcceptedForBlank,
  checkBlankAnswer,
} from '../utils/exerciseCheck';
import {
  loadSavedPatterns5152,
  toggleSavedPattern5152,
  isPattern5152Saved,
  filterBySavedIds5152,
  removeSavedPattern5152,
  countSavedByType,
} from '../utils/savedPatterns5152';
import { usePracticeQuota } from '../hooks/usePracticeQuota';
import { exerciseFeatureKey } from '../config/practiceFreeTier';
import { loadUnlockedIds, addUnlockedId } from '../utils/practiceUnlockStorage';
import PracticeQuotaBanner, { PremiumLockOverlay } from './PracticeQuotaBanner';

const THEMES = {
  51: {
    accent: 'var(--p51-accent)',
    accentSoft: 'var(--p51-accent-soft)',
    accentText: 'var(--p51-accent-text)',
    gradient: 'var(--p51-hero-gradient)',
    icon: '✉️',
    title: 'Câu 51',
    tagline: 'Thông báo · Email · Quảng cáo',
    desc: 'Thể trang trọng (습니다체) — điền câu phù hợp ngữ cảnh thông báo.',
  },
  52: {
    accent: 'var(--p52-accent)',
    accentSoft: 'var(--p52-accent-soft)',
    accentText: 'var(--p52-accent-text)',
    gradient: 'var(--p52-hero-gradient)',
    icon: '📝',
    title: 'Câu 52',
    tagline: 'Luận điển · Liên từ · So sánh',
    desc: 'Thể văn viết (한다체) — điền biểu hiện logic trong đoạn luận.',
  },
};

const SECTIONS = [
  { id: 'expr', label: 'Biểu hiện', icon: '💡' },
  { id: 'vocab', label: 'Từ vựng', icon: '📖' },
  { id: 'exercise', label: 'Bài luyện', icon: '✏️' },
];

function SaveButton({ saved, onToggle }) {
  return (
    <button
      type="button"
      className={`p5152-save-btn${saved ? ' saved' : ''}`}
      onClick={onToggle}
      title={saved ? 'Bỏ khỏi danh sách chưa thuộc' : 'Lưu để ôn lại sau'}
    >
      {saved ? '★ Đã lưu' : '☆ Chưa thuộc'}
    </button>
  );
}

function ItemNav({ index, total, onPrev, onNext }) {
  if (total <= 0) return null;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  return (
    <div className="p5152-nav">
      <div className="p5152-nav-bar">
        <div className="p5152-nav-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="p5152-nav-row">
        <button type="button" onClick={onPrev} className="practice-nav-btn">← Trước</button>
        <span className="p5152-nav-count">{index + 1} / {total}</span>
        <button type="button" onClick={onNext} className="practice-nav-btn">Sau →</button>
      </div>
    </div>
  );
}

function ExpressionFlashcard({ item, theme, saved, onToggleSave }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="p5152-flashcard-wrap">
      <div className={`p5152-flashcard${flipped ? ' flipped' : ''}`}>
        <div className="p5152-flashcard-face p5152-flashcard-front">
          <div className="p5152-flashcard-top">
            <span className="p5152-badge" style={{ background: theme.accentSoft, color: theme.accentText }}>
              {item.label}
            </span>
            <div className="p5152-flashcard-actions">
              <SaveButton saved={saved} onToggle={onToggleSave} />
              <button type="button" className="p5152-flip-btn" onClick={() => setFlipped(true)}>
                Lật thẻ →
              </button>
            </div>
          </div>
          <h3 className="p5152-flashcard-ko">{item.ko}</h3>
          {item.forms?.length > 0 && (
            <div className="p5152-forms">
              {item.forms.map((f) => (
                <span key={f} className="p5152-form-chip">{f}</span>
              ))}
            </div>
          )}
          {item.exampleKo && (
            <p className="p5152-example">VD: {item.exampleKo}</p>
          )}
        </div>
        <div className="p5152-flashcard-face p5152-flashcard-back">
          <div className="p5152-flashcard-top">
            <span className="p5152-badge" style={{ background: theme.accentSoft, color: theme.accentText }}>
              Giải thích
            </span>
            <button type="button" className="p5152-flip-btn" onClick={() => setFlipped(false)}>
              ← Quay lại
            </button>
          </div>
          <p className="p5152-reason">{item.vi}</p>
          {item.commonWrong?.length > 0 && (
            <div className="p5152-wrong-box">
              <strong>Hay sai:</strong>
              <ul>
                {item.commonWrong.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VocabFlashcard({ item, theme, saved, onToggleSave }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="p5152-flashcard-wrap">
      <div className={`p5152-flashcard p5152-flashcard-vocab${flipped ? ' flipped' : ''}`}>
        <div className="p5152-flashcard-face p5152-flashcard-front">
          <div className="p5152-flashcard-top">
            <span className="p5152-badge" style={{ background: theme.accentSoft, color: theme.accentText }}>
              {item.topicKo}
            </span>
            <div className="p5152-flashcard-actions">
              <SaveButton saved={saved} onToggle={onToggleSave} />
              <button type="button" className="p5152-flip-btn" onClick={() => setFlipped(true)}>
                Lật thẻ →
              </button>
            </div>
          </div>
          <h3 className="p5152-flashcard-ko p5152-vocab-ko">{item.ko}</h3>
          <p className="p5152-tap-hint">Nhấn lật thẻ để xem nghĩa</p>
        </div>
        <div className="p5152-flashcard-face p5152-flashcard-back">
          <div className="p5152-flashcard-top">
            <span className="p5152-badge" style={{ background: theme.accentSoft, color: theme.accentText }}>
              Nghĩa tiếng Việt
            </span>
            <button type="button" className="p5152-flip-btn" onClick={() => setFlipped(false)}>
              ← Quay lại
            </button>
          </div>
          <p className="p5152-vocab-vi">{item.vi}</p>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, theme, showToast }) {
  const blanks = useMemo(() => detectBlanksInPrompt(exercise.prompt), [exercise.prompt]);
  const [inputs, setInputs] = useState(() => Object.fromEntries(blanks.map((b) => [b, ''])));
  const [results, setResults] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const linkedPatterns = (exercise.patternIds || [])
    .map((id) => getPatternById(id))
    .filter(Boolean);

  const check = () => {
    const res = {};
    let allOk = true;
    blanks.forEach((b) => {
      const r = checkBlankAnswer(inputs[b], getAcceptedForBlank(exercise, b));
      res[b] = r;
      if (!r.ok) allOk = false;
    });
    setResults(res);
    if (allOk) showToast('Chính xác (khớp đáp án gợi ý)!', 'success');
    else showToast('Chưa khớp — xem gợi ý pattern bên dưới', 'info');
  };

  const reset = () => {
    setInputs(Object.fromEntries(blanks.map((b) => [b, ''])));
    setResults(null);
    setShowHint(false);
  };

  return (
    <div className="practice-card p5152-exercise">
      <div className="p5152-exercise-meta">
        <span>{exercise.id}</span>
        <span>{exercise.source}</span>
        {exercise.examSession && (
          <span className="p5152-exam-badge">{exercise.examSession}회</span>
        )}
      </div>
      <div className="p5152-prompt-box">{exercise.prompt}</div>
      <div className="p5152-blanks">
        {blanks.map((b) => (
          <div key={b} className="p5152-blank-row">
            <label>Điền {b}:</label>
            <input
              type="text"
              value={inputs[b]}
              onChange={(e) => setInputs({ ...inputs, [b]: e.target.value })}
              disabled={results !== null}
              placeholder="Viết câu tiếng Hàn..."
            />
            {results?.[b] && (
              <p className={results[b].ok ? 'p5152-result-ok' : 'p5152-result-fail'}>
                {results[b].ok ? `✓ ${results[b].matched}` : '✗ Chưa khớp đáp án gợi ý'}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="p5152-exercise-actions">
        {!results ? (
          <button type="button" className="p5152-btn-primary" style={{ background: theme.accent }} onClick={check}>
            Kiểm tra
          </button>
        ) : (
          <>
            <button type="button" className="p5152-btn-secondary" onClick={reset}>Làm lại</button>
            <button type="button" className="p5152-btn-secondary" onClick={() => setShowHint(!showHint)}>
              {showHint ? 'Ẩn đáp án' : 'Xem đáp án gợi ý'}
            </button>
          </>
        )}
      </div>
      {showHint && exercise.answers?.length > 0 && (
        <ul className="p5152-hint-list">
          {exercise.answers.map((a, i) => (
            <li key={i}>{a.blank}: {a.text} <span>({a.verified})</span></li>
          ))}
        </ul>
      )}
      {linkedPatterns.length > 0 && (
        <div className="p5152-linked" style={{ borderColor: theme.accentSoft, background: theme.accentSoft }}>
          <strong>Pattern liên quan:</strong>
          {linkedPatterns.map((p) => (
            <div key={p.id}>{p.patternKo} — {p.reasonVi?.slice(0, 80)}…</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SavedListPanel({ savedItems, questionType, onRemove, onClose }) {
  const filtered = savedItems.filter((i) => i.questionType === questionType);

  if (filtered.length === 0) {
    return (
      <div className="practice-card p5152-saved-empty">
        <p>
          Chưa có biểu hiện nào được lưu. Nhấn <strong>☆ Chưa thuộc</strong> trên thẻ đang học để thêm vào danh sách ôn lại.
        </p>
        <button type="button" onClick={onClose} className="practice-nav-btn">Đóng</button>
      </div>
    );
  }

  return (
    <div className="practice-card p5152-saved-panel">
      <div className="p5152-saved-header">
        <h3>Chưa thuộc — Câu {questionType} ({filtered.length})</h3>
        <button type="button" onClick={onClose} className="practice-nav-btn">Đóng</button>
      </div>
      <ul className="p5152-saved-list">
        {filtered.map((item) => (
          <li key={item.id}>
            <div>
              <div className="p5152-saved-ko">{item.ko}</div>
              <div className="p5152-saved-vi">{item.vi}</div>
              {item.label && <div className="p5152-saved-label">{item.label}</div>}
            </div>
            <button type="button" className="p5152-saved-remove" onClick={() => onRemove(item.id)}>Xóa</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PatternPractice({
  questionType,
  showToast,
  userId,
  isPremium = false,
  onUpgradeClick,
}) {
  const theme = THEMES[questionType];
  const stats = useMemo(() => getPattern5152Stats(questionType), [questionType]);
  const featureKey = exerciseFeatureKey(questionType);
  const { consume, getFeature, savedLimit } = usePracticeQuota(userId, isPremium);
  const exerciseFeature = getFeature(featureKey);

  const [section, setSection] = useState('expr');
  const [topicFilter, setTopicFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [showSavedList, setShowSavedList] = useState(false);
  const [savedItems, setSavedItems] = useState(() => loadSavedPatterns5152(userId));
  const [idx, setIdx] = useState(0);
  const [exerciseLocked, setExerciseLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockedRef = useRef(new Set());

  useEffect(() => {
    setSavedItems(loadSavedPatterns5152(userId));
  }, [userId]);

  const exprCards = useMemo(() => getExpressionCards5152(questionType), [questionType]);
  const vocabCards = useMemo(
    () => getVocabCards5152(questionType, topicFilter || null),
    [questionType, topicFilter]
  );
  const exerciseList = useMemo(() => getExercisesByType(questionType), [questionType]);
  const vocabGroups = useMemo(() => getVocabGroupsByType(questionType), [questionType]);

  const baseList = section === 'expr' ? exprCards : section === 'vocab' ? vocabCards : exerciseList;
  const activeList = useMemo(() => {
    if (section === 'exercise' || reviewFilter !== 'saved') return baseList;
    return filterBySavedIds5152(baseList, savedItems, questionType);
  }, [baseList, reviewFilter, savedItems, questionType, section]);

  useEffect(() => {
    if (idx >= activeList.length && activeList.length > 0) setIdx(0);
  }, [activeList.length, idx]);

  const current = activeList[idx % Math.max(activeList.length, 1)];
  const currentSaved = current?.id ? isPattern5152Saved(userId, current.id) : false;
  const savedCount = countSavedByType(savedItems, questionType);
  const periodDate = exerciseFeature?.periodDate || 'week';

  useEffect(() => {
    unlockedRef.current = loadUnlockedIds(userId, featureKey, periodDate);
  }, [userId, featureKey, periodDate]);

  const tryUnlockExercise = useCallback(async (exerciseId) => {
    if (section !== 'exercise' || !exerciseId) return true;
    if (isPremium) {
      setExerciseLocked(false);
      return true;
    }
    const id = String(exerciseId);
    if (unlockedRef.current.has(id)) {
      setExerciseLocked(false);
      return true;
    }
    if (!exerciseFeature?.canUse) {
      setExerciseLocked(true);
      return false;
    }
    setUnlocking(true);
    const result = await consume(featureKey);
    setUnlocking(false);
    if (result.success) {
      unlockedRef.current = addUnlockedId(userId, featureKey, periodDate, id);
      setExerciseLocked(false);
      return true;
    }
    setExerciseLocked(true);
    if (result.quotaExceeded) {
      showToast?.(result.message || 'Hết lượt bài luyện tuần này.', 'warning');
    }
    return false;
  }, [section, isPremium, exerciseFeature, consume, featureKey, userId, periodDate, showToast]);

  useEffect(() => {
    if (section === 'exercise' && current?.id) {
      tryUnlockExercise(current.id);
    } else {
      setExerciseLocked(false);
    }
  }, [section, current?.id, tryUnlockExercise]);

  const handleToggleSave = useCallback(() => {
    if (!current?.id || section === 'exercise') return;
    if (!userId) {
      showToast?.('Cần đăng nhập để lưu', 'warning');
      return;
    }
    const maxItems = isPremium ? -1 : savedLimit;
    const { saved, items, blocked } = toggleSavedPattern5152(userId, current, { maxItems });
    if (blocked) {
      showToast?.(`FREE: tối đa ${savedLimit} mục "chưa thuộc". Nâng cấp PREMIUM để lưu không giới hạn.`, 'warning');
      onUpgradeClick?.();
      return;
    }
    setSavedItems(items);
    showToast?.(
      saved ? 'Đã lưu — ôn lại trong "Chưa thuộc"' : 'Đã bỏ khỏi danh sách',
      saved ? 'success' : 'info'
    );
  }, [current, userId, showToast, section, isPremium, savedLimit, onUpgradeClick]);

  const handleRemoveSaved = (itemId) => {
    const next = removeSavedPattern5152(userId, itemId);
    setSavedItems(next);
    showToast?.('Đã xóa khỏi danh sách chưa thuộc', 'info');
  };

  const switchSection = (next) => {
    setSection(next);
    setIdx(0);
    setReviewFilter('all');
    setExerciseLocked(false);
  };

  const goPrev = async () => {
    const nextIdx = (idx - 1 + activeList.length) % activeList.length;
    if (section === 'exercise') {
      const target = activeList[nextIdx];
      const ok = await tryUnlockExercise(target?.id);
      if (!ok) return;
    }
    setIdx(nextIdx);
  };

  const goNext = async () => {
    const nextIdx = (idx + 1) % activeList.length;
    if (section === 'exercise') {
      const target = activeList[nextIdx];
      const ok = await tryUnlockExercise(target?.id);
      if (!ok) return;
    }
    setIdx(nextIdx);
  };

  return (
    <div className="p5152-page">
      <div className="p5152-hero" style={{ background: theme.gradient }}>
        <div className="p5152-hero-content">
          <div className="p5152-hero-icon">{theme.icon}</div>
          <div>
            <div className="p5152-hero-tag">{theme.tagline}</div>
            <h2 className="p5152-hero-title">{theme.title}</h2>
            <p className="p5152-hero-desc">{theme.desc}</p>
          </div>
        </div>
        <div className="p5152-stats">
          <div className="p5152-stat">
            <span className="p5152-stat-num">{stats.patterns + stats.connectors}</span>
            <span className="p5152-stat-label">Biểu hiện</span>
          </div>
          <div className="p5152-stat">
            <span className="p5152-stat-num">{stats.vocab}</span>
            <span className="p5152-stat-label">Từ vựng</span>
          </div>
          <div className="p5152-stat">
            <span className="p5152-stat-num">{stats.exercises}</span>
            <span className="p5152-stat-label">Bài luyện</span>
          </div>
          {savedCount > 0 && (
            <div className="p5152-stat p5152-stat-saved">
              <span className="p5152-stat-num">★ {savedCount}</span>
              <span className="p5152-stat-label">Chưa thuộc</span>
            </div>
          )}
        </div>
      </div>

      <div className="p5152-toolbar">
        <div className="p5152-section-tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`p5152-section-tab${section === s.id ? ' active' : ''}`}
              style={section === s.id ? { background: theme.accent, borderColor: theme.accent } : undefined}
              onClick={() => switchSection(s.id)}
            >
              <span className="p5152-tab-icon">{s.icon}</span>
              {s.label}
              <span className="p5152-tab-count">
                {s.id === 'expr' ? stats.patterns + stats.connectors : s.id === 'vocab' ? stats.vocab : stats.exercises}
              </span>
            </button>
          ))}
        </div>

        {section !== 'exercise' && (
          <div className="p5152-review-row">
            <button
              type="button"
              className={`p5152-review-btn${reviewFilter === 'saved' ? ' active' : ''}`}
              onClick={() => { setReviewFilter(reviewFilter === 'saved' ? 'all' : 'saved'); setIdx(0); }}
            >
              {reviewFilter === 'saved' ? '★ Chỉ chưa thuộc' : `☆ Chưa thuộc (${savedCount})`}
            </button>
            <button
              type="button"
              className="p5152-review-btn p5152-review-list"
              onClick={() => setShowSavedList(!showSavedList)}
            >
              {showSavedList ? 'Ẩn danh sách' : 'Xem danh sách'}
            </button>
          </div>
        )}

        {section === 'vocab' && vocabGroups.length > 0 && (
          <select
            className="p5152-topic-select"
            value={topicFilter}
            onChange={(e) => { setTopicFilter(e.target.value); setIdx(0); }}
          >
            <option value="">Tất cả chủ đề ({vocabGroups.length})</option>
            {vocabGroups.map((g) => (
              <option key={g.id} value={g.topic}>{g.topicKo} ({g.terms?.length || 0})</option>
            ))}
          </select>
        )}
      </div>

      {showSavedList && (
        <SavedListPanel
          savedItems={savedItems}
          questionType={questionType}
          onRemove={handleRemoveSaved}
          onClose={() => setShowSavedList(false)}
        />
      )}

      {reviewFilter === 'saved' && section !== 'exercise' && activeList.length === 0 && (
        <div className="practice-card p5152-saved-empty">
          <p>
            Chưa có mục nào trong danh sách chưa thuộc. Học flashcard và nhấn <strong>☆ Chưa thuộc</strong> để lưu.
          </p>
        </div>
      )}

      {section === 'expr' && current && (
        <>
          <ExpressionFlashcard
            key={current.id}
            item={current}
            theme={theme}
            saved={currentSaved}
            onToggleSave={handleToggleSave}
          />
          <ItemNav index={idx} total={activeList.length} onPrev={goPrev} onNext={goNext} />
        </>
      )}

      {section === 'vocab' && current && (
        <>
          <VocabFlashcard
            key={current.id}
            item={current}
            theme={theme}
            saved={currentSaved}
            onToggleSave={handleToggleSave}
          />
          <ItemNav index={idx} total={activeList.length} onPrev={goPrev} onNext={goNext} />
        </>
      )}

      {section === 'exercise' && (
        <>
          <PracticeQuotaBanner
            feature={exerciseFeature}
            isPremium={isPremium}
            periodLabel="mỗi thứ Hai"
          />
          {unlocking && (
            <p className="p5152-empty" style={{ textAlign: 'center' }}>Đang mở bài luyện...</p>
          )}
          {exerciseLocked && !unlocking ? (
            <PremiumLockOverlay
              message={`FREE: ${exerciseFeature?.limit ?? 5} bài luyện/tuần cho câu ${questionType}. Nâng cấp PREMIUM để luyện toàn bộ ${stats.exercises} bài.`}
              onUpgrade={onUpgradeClick}
            />
          ) : current && !unlocking ? (
            <>
              <ExerciseCard key={current.id} exercise={current} theme={theme} showToast={showToast} />
              <ItemNav index={idx} total={activeList.length} onPrev={goPrev} onNext={goNext} />
            </>
          ) : null}
        </>
      )}

      {!current && reviewFilter !== 'saved' && (
        <p className="p5152-empty">Chưa có dữ liệu luyện tập cho mục này.</p>
      )}
    </div>
  );
}
