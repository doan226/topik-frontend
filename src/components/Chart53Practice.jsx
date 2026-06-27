import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChart53Formula } from '../utils/contentData';
import Question53Chart from './Question53Chart';
import { usePracticeQuota } from '../hooks/usePracticeQuota';
import { FEATURE_KEYS } from '../config/practiceFreeTier';
import { loadUnlockedIds, addUnlockedId } from '../utils/practiceUnlockStorage';
import PracticeQuotaBanner, { PremiumLockOverlay } from './PracticeQuotaBanner';

const cardClass = 'practice-card';
const navBtnClass = 'practice-nav-btn';

const MODES = [
  { id: 'formula', label: 'Công thức viết' },
  { id: 'practice', label: 'Luyện đề' },
];

function countChars(text) {
  return (text || '').replace(/\s/g, '').length;
}

function charCountClass(n) {
  if (n >= 200 && n <= 300) return 'chart53-char-ok';
  if (n > 300) return 'chart53-char-over';
  return 'chart53-char-neutral';
}

function ItemNav({ index, total, onPrev, onNext }) {
  if (total <= 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
      <button type="button" onClick={onPrev} className={navBtnClass}>← Trước</button>
      <span className="theme-text" style={{ fontSize: '14px', fontWeight: 600 }}>{index + 1} / {total}</span>
      <button type="button" onClick={onNext} className={navBtnClass}>Sau →</button>
    </div>
  );
}

function ExamCard({ question }) {
  const [draft, setDraft] = useState('');
  const n = countChars(draft);

  const sessionLabel = question.source === 'official'
    ? `${question.topik}회`
    : `Mở rộng #${question.expansionSet}`;

  return (
    <div className={cardClass}>
      <div style={{ marginBottom: '12px' }}>
        <span className="theme-text-muted" style={{ fontSize: '12px' }}>Câu 53 · {sessionLabel}</span>
        {question.source === 'official' && (
          <span className="chart53-official-badge">Official</span>
        )}
      </div>

      <Question53Chart questionId={question.id} imageUrl={question.imageUrl} />

      {!question.imageUrl && question.prompt && (
        <div className="chart53-prompt-fallback">{question.prompt}</div>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Viết bài 200–300 chữ tiếng Hàn..."
        rows={8}
        style={{ width: '100%', resize: 'vertical' }}
      />
      <p className={charCountClass(n)} style={{ margin: '6px 0 0 0', fontSize: '13px' }}>
        {n} ký tự (mục tiêu 200–300)
      </p>
    </div>
  );
}

function FormulaPanel() {
  const formula = getChart53Formula();
  const [openSection, setOpenSection] = useState('opening');

  const toggle = (id) => setOpenSection(openSection === id ? null : id);

  return (
    <div className="chart53-stack">
      <div className={cardClass}>
        <h3 className="theme-text" style={{ margin: '0 0 10px 0' }}>Tổng quan câu 53</h3>
        <p className="theme-text-muted" style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.7 }}>
          <strong>{formula.overview.length}</strong> · {formula.overview.score} điểm · ~{formula.overview.timeMinutes} phút · {formula.overview.style}
        </p>
        <ul className="theme-text" style={{ margin: '0 0 12px 0', paddingLeft: '18px', fontSize: '14px', lineHeight: 1.7 }}>
          {formula.overview.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {formula.essayStructure?.length > 0 && (
          <>
            <h4 className="theme-text-success" style={{ margin: '12px 0 8px 0', fontSize: '15px' }}>Cấu trúc bài 4 bước</h4>
            <ol className="theme-text" style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', lineHeight: 1.7 }}>
              {formula.essayStructure.map((s) => (
                <li key={s.step}><strong>{s.ko}</strong> — {s.vi}</li>
              ))}
            </ol>
          </>
        )}
        <h4 className="theme-text-success" style={{ margin: '12px 0 8px 0', fontSize: '15px' }}>Cách đọc biểu đồ</h4>
        <ul className="theme-text" style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', lineHeight: 1.7 }}>
          {formula.readingSteps.map((s) => (
            <li key={s.step}><strong>{s.ko}</strong> — {s.vi}</li>
          ))}
        </ul>
      </div>

      <div className={cardClass}>
        <h4 className="theme-text" style={{ margin: '0 0 10px 0' }}>Loại biểu đồ thường gặp</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {formula.chartTypes.map((c) => (
            <span key={c.ko} className="chart53-chip">{c.ko} — {c.vi}</span>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h4 className="theme-text" style={{ margin: '0 0 12px 0' }}>Mẫu câu theo phần</h4>
        <div className="practice-tab-row" style={{ marginBottom: '12px' }}>
          {formula.sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => toggle(sec.id)}
              className={`chart53-section-btn${openSection === sec.id ? ' active' : ''}`}
            >
              {sec.titleVi}
            </button>
          ))}
        </div>
        {formula.sections.filter((s) => s.id === openSection).map((sec) => (
          <ul key={sec.id} style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {sec.templates.map((t, i) => (
              <li key={i} className="chart53-template-item">
                <code className="theme-text" style={{ display: 'block', marginBottom: '4px' }}>{t.ko}</code>
                <span className="theme-text-muted" style={{ fontSize: '13px' }}>{t.vi}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>

      <div className={cardClass}>
        <h4 className="theme-text" style={{ margin: '0 0 10px 0' }}>Từ vựng thiết yếu</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {formula.vocabulary.map((v) => (
            <div key={v.ko} className="chart53-vocab-item">
              <strong>{v.ko}</strong><br />{v.vi}
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardClass} chart53-tips-card`}>
        <h4 className="theme-text-warning" style={{ margin: '0 0 8px 0' }}>Mẹo chấm điểm</h4>
        <ul className="theme-text-warning" style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', lineHeight: 1.7 }}>
          {formula.scoringTips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Chart53Practice({
  questions = [],
  userId,
  isPremium = false,
  onUpgradeClick,
}) {
  const [mode, setMode] = useState('formula');
  const [idx, setIdx] = useState(0);
  const [examLocked, setExamLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockedRef = useRef(new Set());

  const { consume, getFeature } = usePracticeQuota(userId, isPremium);
  const chartFeature = getFeature(FEATURE_KEYS.chart53Exam);
  const periodDate = chartFeature?.periodDate || 'week';

  const examList = useMemo(() => questions.filter((q) => q.type === 53), [questions]);
  const current = examList[idx % Math.max(examList.length, 1)];

  useEffect(() => {
    unlockedRef.current = loadUnlockedIds(userId, FEATURE_KEYS.chart53Exam, periodDate);
  }, [userId, periodDate]);

  const examKey = current
    ? String(current.id ?? `${current.topik}-${current.type}`)
    : null;

  const tryUnlockExam = useCallback(async (key) => {
    if (!key || mode !== 'practice') return true;
    if (isPremium) {
      setExamLocked(false);
      return true;
    }
    if (unlockedRef.current.has(key)) {
      setExamLocked(false);
      return true;
    }
    if (!chartFeature?.canUse) {
      setExamLocked(true);
      return false;
    }
    setUnlocking(true);
    const result = await consume(FEATURE_KEYS.chart53Exam);
    setUnlocking(false);
    if (result.success) {
      unlockedRef.current = addUnlockedId(userId, FEATURE_KEYS.chart53Exam, periodDate, key);
      setExamLocked(false);
      return true;
    }
    setExamLocked(true);
    return false;
  }, [mode, isPremium, chartFeature, consume, userId, periodDate]);

  useEffect(() => {
    if (mode === 'practice' && examKey) {
      tryUnlockExam(examKey);
    } else {
      setExamLocked(false);
    }
  }, [mode, examKey, tryUnlockExam]);

  const goPrev = async () => {
    const nextIdx = (idx - 1 + examList.length) % examList.length;
    const next = examList[nextIdx];
    const key = next ? String(next.id ?? `${next.topik}-${next.type}`) : null;
    const ok = await tryUnlockExam(key);
    if (!ok) return;
    setIdx(nextIdx);
  };

  const goNext = async () => {
    const nextIdx = (idx + 1) % examList.length;
    const next = examList[nextIdx];
    const key = next ? String(next.id ?? `${next.topik}-${next.type}`) : null;
    const ok = await tryUnlockExam(key);
    if (!ok) return;
    setIdx(nextIdx);
  };

  return (
    <div className="chart53-stack">
      <div className={cardClass} style={{ padding: '16px 20px' }}>
        <h2 className="theme-text" style={{ margin: '0 0 8px 0' }}>📊 Ôn câu 53</h2>
        <p className="theme-text-muted" style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          Công thức viết + {examList.length} đề luyện (200–300 chữ)
        </p>
        <div className="practice-tab-row">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMode(m.id); setIdx(0); }}
              className={`chart53-mode-btn${mode === m.id ? ' active' : ''}`}
            >
              {m.label}{m.id === 'practice' ? ` (${examList.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {mode === 'formula' && <FormulaPanel />}

      {mode === 'practice' && examList.length === 0 && (
        <p className="theme-text-muted">Chưa có đề câu 53 trong ngân hàng.</p>
      )}
      {mode === 'practice' && examList.length > 0 && (
        <>
          <PracticeQuotaBanner
            feature={chartFeature}
            isPremium={isPremium}
            periodLabel="mỗi thứ Hai"
          />
          {unlocking && (
            <p className="theme-text-muted" style={{ textAlign: 'center' }}>Đang mở đề luyện...</p>
          )}
          {examLocked && !unlocking ? (
            <PremiumLockOverlay
              message={`FREE: 1 đề luyện câu 53/tuần. PREMIUM mở ${examList.length} đề + công thức viết.`}
              onUpgrade={onUpgradeClick}
            />
          ) : current && !unlocking ? (
            <>
              <ExamCard key={examKey} question={current} />
              <ItemNav index={idx} total={examList.length} onPrev={goPrev} onNext={goNext} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
