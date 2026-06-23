import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  vocabTopics,
  getVocabCards,
  getExpressionCards,
  getExpressionCardsByKind,
} from '../utils/contentData';
import {
  loadSavedVocab54,
  toggleSavedVocab54,
  isVocab54Saved,
  filterBySavedIds,
  removeSavedVocab54,
} from '../utils/savedVocab54';
import { usePracticeQuota } from '../hooks/usePracticeQuota';
import {
  FEATURE_KEYS,
  FREE_VOCAB54_TOPIC_IDS,
  FREE_EXPR54_KINDS,
  FREE_EXPR54_KIND_OPTIONS,
  isFreeVocabTopic,
  isFreeExprKind,
} from '../config/practiceFreeTier';
import PracticeQuotaBanner, { PremiumLockOverlay } from './PracticeQuotaBanner';

const cardClass = 'practice-card';
const navBtnClass = 'practice-nav-btn';

const EXPR_KINDS = [
  { id: 'all', label: 'Tất cả biểu hiện' },
  { id: 'opening', label: 'Mở bài' },
  { id: 'closing', label: 'Kết bài' },
  { id: 'connector', label: 'Liên từ thân bài' },
  { id: 'question-type', label: '6 dạng câu hỏi' },
];

function normalize(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getQuizOptionStyle(opt, picked, checked, correctAnswer) {
  const isCorrect = normalize(opt) === normalize(correctAnswer);
  const isPicked = picked === opt;

  if (checked && isCorrect) {
    return {
      backgroundColor: 'var(--app-success)',
      border: '2px solid var(--app-success)',
      color: 'var(--essay54-on-accent, #fff)',
      fontWeight: 700,
    };
  }
  if (checked && isPicked && !isCorrect) {
    return {
      backgroundColor: 'var(--app-danger)',
      border: '2px solid var(--app-danger)',
      color: 'var(--essay54-on-accent, #fff)',
      fontWeight: 700,
    };
  }
  if (checked) {
    return {
      backgroundColor: 'var(--app-surface-2)',
      border: '1px solid var(--app-border)',
      color: 'var(--app-text-muted)',
      fontWeight: 500,
    };
  }
  if (isPicked) {
    return {
      backgroundColor: 'var(--app-purple)',
      border: '2px solid var(--app-purple)',
      color: 'var(--essay54-on-accent, #fff)',
      fontWeight: 700,
    };
  }
  return {
    backgroundColor: 'var(--app-input-bg)',
    border: '2px solid var(--app-border-light)',
    color: 'var(--app-text)',
    fontWeight: 600,
  };
}

function SaveButton({ saved, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
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
  );
}

function ItemNav({ index, total, onPrev, onNext }) {
  if (total <= 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
      <button type="button" onClick={onPrev} className={navBtnClass}>← Trước</button>
      <span style={{ color: 'var(--app-text-muted)', fontSize: '14px', fontWeight: 600 }}>{index + 1} / {total}</span>
      <button type="button" onClick={onNext} className={navBtnClass}>Sau →</button>
    </div>
  );
}

function Flashcard({ item, mode, saved, onToggleSave }) {
  const [flipped, setFlipped] = useState(false);
  const isVocab = item.type === 'vocab';

  return (
    <div className={cardClass}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'var(--app-text-muted)', fontWeight: 'bold' }}>
          {isVocab ? `Từ vựng · ${item.topicKo}` : `Biểu hiện · ${item.labelVi || item.type}`}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <SaveButton saved={saved} onToggle={onToggleSave} />
          <button
            type="button"
            onClick={() => setFlipped(!flipped)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', color: 'var(--app-text)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            {flipped ? 'Ẩn' : 'Lật thẻ'}
          </button>
        </div>
      </div>
      {!flipped ? (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--app-text-muted)', fontWeight: 600 }}>
            {mode === 'ko-vi' ? 'Tiếng Hàn' : 'Tiếng Việt'}
          </p>
          <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '22px', lineHeight: 1.5, fontWeight: 700 }}>
            {mode === 'ko-vi' ? item.ko : item.vi}
          </h3>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--app-text-muted)', fontWeight: 600 }}>Nghĩa / mẫu</p>
          <p style={{ margin: 0, color: 'var(--app-text)', fontSize: '18px', lineHeight: 1.6, fontWeight: 600 }}>
            {mode === 'ko-vi' ? item.vi : item.ko}
          </p>
          {item.tasks?.length > 0 && (
            <ul style={{ margin: '12px 0 0 0', paddingLeft: '18px', fontSize: '14px', color: 'var(--app-text)' }}>
              {item.tasks.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function QuizCard({ item, pool, showToast, saved, onToggleSave, onBeforeCheck }) {
  const [picked, setPicked] = useState('');
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);

  const options = useMemo(() => {
    const distractors = pool
      .filter((c) => c.id !== item.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((c) => c.vi);
    const all = [...new Set([item.vi, ...distractors])].sort(() => Math.random() - 0.5);
    return all.slice(0, 4);
  }, [item, pool]);

  const check = async () => {
    if (!picked || checking) return;
    if (onBeforeCheck) {
      setChecking(true);
      const ok = await onBeforeCheck();
      setChecking(false);
      if (!ok) return;
    }
    setChecked(true);
    const ok = normalize(picked) === normalize(item.vi);
    showToast?.(ok ? 'Đúng!' : `Sai — đáp án: ${item.vi}`, ok ? 'success' : 'error');
  };

  const reset = () => {
    setPicked('');
    setChecked(false);
  };

  return (
    <div className={cardClass}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--app-text-muted)', fontWeight: 600 }}>
          Chọn nghĩa tiếng Việt · {item.topicKo || 'Biểu hiện câu 54'}
        </p>
        <SaveButton saved={saved} onToggle={onToggleSave} />
      </div>
      <h3 style={{
        margin: '0 0 16px 0',
        color: 'var(--app-purple-text)',
        fontSize: '22px',
        fontWeight: 700,
        padding: '12px 14px',
        backgroundColor: 'var(--app-accent-soft)',
        borderRadius: '8px',
        border: '1px solid var(--app-border)',
      }}
      >
        {item.ko}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {options.map((opt) => {
          const style = getQuizOptionStyle(opt, picked, checked, item.vi);
          return (
            <button
              key={opt}
              type="button"
              disabled={checked}
              onClick={() => setPicked(opt)}
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: checked ? 'default' : 'pointer',
                fontSize: '15px',
                lineHeight: 1.5,
                ...style,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {!checked ? (
          <button
            type="button"
            onClick={check}
            disabled={!picked || checking}
            style={{
              padding: '10px 20px',
              backgroundColor: picked && !checking ? 'var(--app-purple)' : 'var(--app-border-light)',
              color: picked && !checking ? '#fff' : 'var(--app-text-muted)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: picked && !checking ? 'pointer' : 'not-allowed',
            }}
          >
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra'}
          </button>
        ) : (
          <button type="button" onClick={reset} style={{ padding: '10px 20px', backgroundColor: 'var(--app-text-muted)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Làm lại
          </button>
        )}
      </div>
    </div>
  );
}

function SavedListPanel({ savedItems, onRemove, onClose }) {
  if (savedItems.length === 0) {
    return (
      <div className={cardClass} style={{ backgroundColor: 'var(--app-warning-soft)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <p style={{ margin: 0, color: 'var(--app-warning-text)', fontSize: '14px' }}>
          Chưa có từ nào được lưu. Nhấn <strong>☆ Chưa thuộc</strong> trên thẻ đang học để thêm vào danh sách ôn lại.
        </p>
        <button type="button" onClick={onClose} className={navBtnClass} style={{ marginTop: '12px' }}>Đóng</button>
      </div>
    );
  }

  return (
    <div className={cardClass} style={{ maxHeight: '320px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: 'var(--app-text)', fontSize: '16px' }}>Danh sách chưa thuộc ({savedItems.length})</h3>
        <button type="button" onClick={onClose} className={navBtnClass} style={{ padding: '6px 12px', fontSize: '13px' }}>Đóng</button>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {savedItems.map((item) => (
          <li
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 0',
              borderBottom: '1px solid var(--app-border)',
            }}
          >
            <div>
              <div style={{ color: 'var(--app-text)', fontWeight: 700, fontSize: '15px' }}>{item.ko}</div>
              <div style={{ color: 'var(--app-text-muted)', fontSize: '13px', marginTop: '2px' }}>{item.vi}</div>
              {item.topicKo && (
                <div style={{ color: 'var(--app-text-dim)', fontSize: '12px', marginTop: '2px' }}>{item.topicKo}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--app-danger)', background: 'var(--app-danger-soft)', color: 'var(--app-danger-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}
            >
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Essay54Practice({
  showToast,
  userId,
  isPremium = false,
  onUpgradeClick,
}) {
  const { consume, getFeature, savedLimit } = usePracticeQuota(userId, isPremium);
  const quizFeature = getFeature(FEATURE_KEYS.quiz54);

  const [section, setSection] = useState('vocab');
  const [studyMode, setStudyMode] = useState('flash');
  const [flashDir, setFlashDir] = useState('ko-vi');
  const [topicId, setTopicId] = useState('');
  const [exprKind, setExprKind] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [showSavedList, setShowSavedList] = useState(false);
  const [savedItems, setSavedItems] = useState(() => loadSavedVocab54(userId));
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setSavedItems(loadSavedVocab54(userId));
  }, [userId]);

  useEffect(() => {
    if (!isPremium && !isFreeExprKind(exprKind)) {
      setExprKind('all');
    }
  }, [isPremium, exprKind]);

  const vocabCards = useMemo(() => {
    let cards = getVocabCards(topicId || null);
    if (!isPremium) {
      if (topicId && !isFreeVocabTopic(topicId)) return [];
      if (!topicId) {
        cards = cards.filter((c) => isFreeVocabTopic(c.topicId));
      }
    }
    return cards;
  }, [topicId, isPremium]);

  const exprCards = useMemo(() => {
    if (!isPremium && !isFreeExprKind(exprKind)) return [];
    let cards = getExpressionCardsByKind(exprKind);
    if (!isPremium && exprKind === 'all') {
      cards = cards.filter((c) => FREE_EXPR54_KINDS.includes(c.type));
    }
    return cards;
  }, [exprKind, isPremium]);
  const baseList = section === 'vocab' ? vocabCards : exprCards;
  const activeList = useMemo(() => {
    if (reviewFilter !== 'saved') return baseList;
    return filterBySavedIds(baseList, savedItems);
  }, [baseList, reviewFilter, savedItems]);

  useEffect(() => {
    if (idx >= activeList.length && activeList.length > 0) {
      setIdx(0);
    }
  }, [activeList.length, idx]);

  const current = activeList[idx % Math.max(activeList.length, 1)];
  const currentSaved = current ? isVocab54Saved(userId, current.id) : false;

  const handleToggleSave = useCallback(() => {
    if (!current || !userId) {
      showToast?.('Cần đăng nhập để lưu từ', 'warning');
      return;
    }
    const maxItems = isPremium ? -1 : savedLimit;
    const { saved, items, blocked } = toggleSavedVocab54(userId, current, { maxItems });
    if (blocked) {
      showToast?.(`FREE: tối đa ${savedLimit} mục "chưa thuộc". Nâng cấp PREMIUM để lưu không giới hạn.`, 'warning');
      onUpgradeClick?.();
      return;
    }
    setSavedItems(items);
    showToast?.(saved ? 'Đã lưu — ôn lại trong "Chưa thuộc"' : 'Đã bỏ khỏi danh sách', saved ? 'success' : 'info');
  }, [current, userId, showToast, isPremium, savedLimit, onUpgradeClick]);

  const handleQuizBeforeCheck = useCallback(async () => {
    if (isPremium) return true;
    const result = await consume(FEATURE_KEYS.quiz54);
    if (!result.success) {
      showToast?.(result.message || 'Hết lượt quiz hôm nay.', 'warning');
      onUpgradeClick?.();
      return false;
    }
    return true;
  }, [isPremium, consume, showToast, onUpgradeClick]);

  const handleRemoveSaved = (itemId) => {
    const next = removeSavedVocab54(userId, itemId);
    setSavedItems(next);
    showToast?.('Đã xóa khỏi danh sách chưa thuộc', 'info');
  };

  const goPrev = () => setIdx((i) => (i - 1 + activeList.length) % activeList.length);
  const goNext = () => setIdx((i) => (i + 1) % activeList.length);

  const switchSection = (next) => {
    setSection(next);
    setIdx(0);
  };

  const topicsWithTerms = vocabTopics.filter((t) => t.terms?.length > 0);
  const exprKindOptions = isPremium ? EXPR_KINDS : FREE_EXPR54_KIND_OPTIONS;
  const topicLocked = section === 'vocab' && topicId && !isPremium && !isFreeVocabTopic(topicId);
  const exprKindLocked = section === 'expr' && !isPremium && !isFreeExprKind(exprKind);
  const stats = useMemo(() => ({
    vocab: getVocabCards().length,
    expr: getExpressionCards().length,
  }), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className={cardClass} style={{ padding: '16px 20px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: 'var(--app-text)' }}>📝 Luyện câu 54 — Từ vựng &amp; biểu hiện</h2>
        <p style={{ margin: '0 0 12px 0', color: 'var(--app-text-muted)', fontSize: '14px' }}>
          Quyển Viết Thu Huế — {stats.vocab} từ vựng · {stats.expr} biểu hiện luận
          {savedItems.length > 0 && (
            <span style={{ color: 'var(--app-warning-text)', fontWeight: 600 }}> · {savedItems.length} chưa thuộc</span>
          )}
        </p>
        <div className="practice-tab-row" style={{ marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => switchSection('vocab')}
            className={`essay54-tab-btn${section === 'vocab' ? ' active-purple' : ''}`}
          >
            Từ vựng chủ đề
          </button>
          <button
            type="button"
            onClick={() => switchSection('expr')}
            className={`essay54-tab-btn${section === 'expr' ? ' active-purple' : ''}`}
          >
            Biểu hiện luận
          </button>
          <button
            type="button"
            onClick={() => { setStudyMode('flash'); setIdx(0); }}
            className={`essay54-tab-btn${studyMode === 'flash' ? ' active-accent' : ''}`}
          >
            Flashcard
          </button>
          <button
            type="button"
            onClick={() => { setStudyMode('quiz'); setIdx(0); }}
            className={`essay54-tab-btn${studyMode === 'quiz' ? ' active-accent' : ''}`}
          >
            Trắc nghiệm
          </button>
          <button
            type="button"
            onClick={() => { setReviewFilter(reviewFilter === 'saved' ? 'all' : 'saved'); setIdx(0); }}
            className={`essay54-tab-btn${reviewFilter === 'saved' ? ' active-warning' : ' active-warning-soft'}`}
          >
            {reviewFilter === 'saved' ? '★ Chỉ chưa thuộc' : `☆ Chưa thuộc (${savedItems.length})`}
          </button>
          <button
            type="button"
            onClick={() => setShowSavedList(!showSavedList)}
            className="essay54-tab-btn"
          >
            {showSavedList ? 'Ẩn danh sách' : 'Xem danh sách'}
          </button>
        </div>
        {section === 'vocab' && (
          <select
            value={topicId}
            onChange={(e) => { setTopicId(e.target.value); setIdx(0); }}
            style={{ width: '100%', maxWidth: '420px', padding: '8px', borderRadius: '6px', marginTop: '4px', color: 'var(--app-text)' }}
          >
            <option value="">
              Tất cả chủ đề free ({isPremium ? topicsWithTerms.length : FREE_VOCAB54_TOPIC_IDS.length})
            </option>
            {topicsWithTerms.map((t) => {
              const locked = !isPremium && !isFreeVocabTopic(t.topicId);
              return (
                <option key={t.topicId} value={t.topicId} disabled={locked}>
                  {t.topicKo} — {t.topicVi}{locked ? ' 🔒 PREMIUM' : ''}
                </option>
              );
            })}
          </select>
        )}
        {section === 'expr' && (
          <select
            value={exprKind}
            onChange={(e) => { setExprKind(e.target.value); setIdx(0); }}
            style={{ width: '100%', maxWidth: '420px', padding: '8px', borderRadius: '6px', marginTop: '4px', color: 'var(--app-text)' }}
          >
            {exprKindOptions.map((k) => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
            {!isPremium && (
              <option disabled>── PREMIUM: liên từ, 6 dạng câu ──</option>
            )}
          </select>
        )}
        {studyMode === 'quiz' && (
          <PracticeQuotaBanner
            feature={quizFeature}
            isPremium={isPremium}
            periodLabel="mỗi ngày"
          />
        )}
        {studyMode === 'flash' && (
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setFlashDir(flashDir === 'ko-vi' ? 'vi-ko' : 'ko-vi')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--app-border)', background: 'var(--app-accent-soft)', color: 'var(--app-purple-text)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Hướng: {flashDir === 'ko-vi' ? 'Hàn → Việt' : 'Việt → Hàn'}
            </button>
          </div>
        )}
      </div>

      {showSavedList && (
        <SavedListPanel
          savedItems={savedItems}
          onRemove={handleRemoveSaved}
          onClose={() => setShowSavedList(false)}
        />
      )}

      {reviewFilter === 'saved' && activeList.length === 0 && (
        <div className={cardClass} style={{ backgroundColor: 'var(--app-warning-soft)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <p style={{ margin: 0, color: 'var(--app-warning-text)' }}>
            Chưa có mục nào trong danh sách chưa thuộc cho bộ lọc hiện tại. Học flashcard/trắc nghiệm và nhấn <strong>☆ Chưa thuộc</strong> để lưu.
          </p>
        </div>
      )}

      {(topicLocked || exprKindLocked) && (
        <PremiumLockOverlay
          message={
            topicLocked
              ? `Chủ đề này dành cho PREMIUM. FREE: ${FREE_VOCAB54_TOPIC_IDS.length} chủ đề đầu (${FREE_VOCAB54_TOPIC_IDS.join(', ')}).`
              : 'Biểu hiện liên từ & 6 dạng câu hỏi dành cho PREMIUM. FREE: mở bài + kết bài.'
          }
          onUpgrade={onUpgradeClick}
        />
      )}

      {!topicLocked && !exprKindLocked && current && studyMode === 'flash' && (
        <>
          <Flashcard
            key={`${current.id}-${flashDir}`}
            item={current}
            mode={flashDir}
            saved={currentSaved}
            onToggleSave={handleToggleSave}
          />
          <ItemNav index={idx} total={activeList.length} onPrev={goPrev} onNext={goNext} />
        </>
      )}
      {!topicLocked && !exprKindLocked && current && studyMode === 'quiz' && (
        <>
          <QuizCard
            key={current.id}
            item={current}
            pool={activeList}
            showToast={showToast}
            saved={currentSaved}
            onToggleSave={handleToggleSave}
            onBeforeCheck={handleQuizBeforeCheck}
          />
          <ItemNav index={idx} total={activeList.length} onPrev={goPrev} onNext={goNext} />
        </>
      )}
      {!current && reviewFilter !== 'saved' && (
        <p style={{ color: 'var(--app-text-muted)' }}>Chưa có dữ liệu luyện tập cho mục này.</p>
      )}
    </div>
  );
}
