import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hanjaPacks,
  hanjaCharacters,
  searchCharacters,
  getAccessibleCharacters,
  canAccessPack,
  getCharactersForPack,
  getPackProgress,
  getPackById,
  groupByReading,
  generateQuizSession,
  getHanjaStats,
  getHanjaSuggestionsForVocab54,
  getDisplayWord,
  getDisplayLabel,
  isPackAccessPremium,
  isPackAccessSku,
  getSkuFromAccess,
  getTopik100Subgroups,
  getTopik90Subgroups,
  getTodayStudySet,
  TOPIK100_PACK_ID,
  TOPIK_PREMIUM_90_PACK_ID,
} from '../utils/hanjaData';
import {
  loadSavedHanja,
  toggleSavedHanja,
  isHanjaSaved,
  filterSavedCharacters,
  removeSavedHanja,
} from '../utils/savedHanja';
import {
  loadSrsState,
  getDueCards,
  recordReview,
  getSrsSummary,
  syncSrsFromServer,
  runMigrationIfNeeded,
  loadStreak,
} from '../utils/hanjaSrs';
import { SPECIALIZED_VOCAB, SPECIALTY_LIST } from '../modules/lib/seedData';
import { createSpecializedCard } from '../modules/lib/apiClient';
import { fetchUnlockedPacks, HANJA_PACK_SKUS } from '../utils/hanjaPackUnlockStorage';
import { usePracticeQuota } from '../hooks/usePracticeQuota';
import {
  FEATURE_KEYS,
  FREE_HANJA_SRS_DAILY,
  FREE_HANJA_SRS_CARDS_PER_SESSION,
} from '../config/practiceFreeTier';
import PracticeQuotaBanner from './PracticeQuotaBanner';
import HanjaCharacterCard from './HanjaCharacterCard';
import HanjaPackShowcase from './HanjaPackShowcase';
import {
  isShowcasePack,
  getPackTheme,
  getMemoryHook,
} from '../utils/hanjaMemory';
const TOPIC_SUBGROUP_CHIPS = [
  { id: '', label: 'Tất cả 100 từ' },
  { id: 'action', label: 'Động tác & hành động (60)' },
  { id: 'concept', label: 'Khái niệm xã hội (40)' },
];

const PREMIUM90_SUBGROUP_CHIPS = [
  { id: '', label: 'Tất cả 90 từ' },
  { id: 'action', label: 'Động thái & giải pháp (20)' },
  { id: 'concept', label: 'Tính chất & danh từ (20)' },
  { id: 'academic', label: 'Học thuật nâng cao (50)' },
];

function SubgroupChipRow({ value, onChange, chips = TOPIC_SUBGROUP_CHIPS }) {
  return (
    <div className="hanja-hub-chip-row">
      {chips.map((chip) => (
        <button
          key={chip.id || 'all'}
          type="button"
          className={`hanja-hub-chip${value === chip.id ? ' hanja-hub-chip--active' : ''}`}
          onClick={() => onChange(chip.id)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function SrsQuotaSoftLanding({ onGoLookup, onUpgrade }) {
  return (
    <div
      className={cardClass}
      style={{
        padding: '24px',
        textAlign: 'center',
        background: '#fffbeb',
        border: '1px solid #fcd34d',
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏸️</div>
      <h3 style={{ margin: '0 0 8px 0' }}>Hết lượt SRS hôm nay</h3>
      <p style={{ margin: '0 0 16px 0', color: 'var(--app-text-muted)', lineHeight: 1.5 }}>
        Bạn vẫn tra cứu và lật thẻ xem 120 từ free (100 TOPIK + 20 gốc âm) không giới hạn.
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onGoLookup} className={navBtnClass} style={{ padding: '10px 20px' }}>
          Mở Tra cứu
        </button>
        <button type="button" onClick={onUpgrade} className="app-btn-premium" style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
          ⭐ SRS không giới hạn
        </button>
      </div>
    </div>
  );
}

const cardClass = 'practice-card';
const navBtnClass = 'practice-nav-btn';

/** Luồng học: Tổng quan → Thư viện → Ôn SRS → Quiz */
const ZONES = [
  { id: 'home', icon: '🏠', label: 'Tổng quan', hint: 'Tiến độ & lộ trình' },
  { id: 'library', icon: '📚', label: 'Thư viện', hint: 'Tra cứu & nhóm từ' },
  { id: 'review', icon: '🔄', label: 'Ôn SRS', hint: 'FSRS — lặp ngắt quãng' },
  { id: 'specialty', icon: '🏭', label: 'Chuyên ngành', hint: '11 ngành nghề' },
  { id: 'quiz', icon: '✅', label: 'Quiz', hint: 'Kiểm tra nhanh' },
];

const LIBRARY_VIEWS = [
  { id: 'list', label: 'Tra cứu' },
  { id: 'reading', label: 'Theo âm gốc' },
  { id: 'packs', label: 'Theo pack' },
];

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

function getQuizOptionStyle(opt, picked, checked, correctAnswer) {
  const isCorrect = normalize(opt) === normalize(correctAnswer);
  const isPicked = picked === opt;
  if (checked && isCorrect) {
    return { backgroundColor: 'var(--app-success)', border: '2px solid var(--app-success)', color: '#fff', fontWeight: 700 };
  }
  if (checked && isPicked && !isCorrect) {
    return { backgroundColor: 'var(--app-danger)', border: '2px solid var(--app-danger)', color: '#fff', fontWeight: 700 };
  }
  if (checked) {
    return { backgroundColor: 'var(--app-surface-2)', border: '1px solid var(--app-border)', color: 'var(--app-text-muted)', fontWeight: 500 };
  }
  if (isPicked) {
    return { backgroundColor: 'var(--app-purple)', border: '2px solid var(--app-purple)', color: '#fff', fontWeight: 700 };
  }
  return { backgroundColor: 'var(--app-input-bg)', border: '2px solid var(--app-border-light)', color: 'var(--app-text)', fontWeight: 600 };
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

function SrsFlashcard({ character, onRate }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => setFlipped(false), [character?.id]);

  if (!character) return null;
  const mainWord = getDisplayWord(character);
  const memory = getMemoryHook(character);

  return (
    <div className={cardClass} style={{ padding: '24px', textAlign: 'center' }}>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        style={{
          width: '100%',
          minHeight: '200px',
          border: '2px dashed var(--app-border)',
          borderRadius: '12px',
          background: 'var(--app-surface-2)',
          cursor: 'pointer',
          padding: '24px',
        }}
      >
        {!flipped ? (
          <>
            {character.hanViet && (
              <div style={{ fontSize: '40px', fontWeight: 800, lineHeight: 1.1, color: 'var(--app-purple)' }}>
                {character.hanViet}
              </div>
            )}
            {character.reading && (
              <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 700, color: 'var(--app-text-muted)' }}>
                âm {character.reading}
              </div>
            )}
            <div style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1.2, marginTop: '12px' }}>{mainWord}</div>
            {memory?.hook && (
              <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--app-text-muted)', lineHeight: 1.4 }}>
                {memory.emoji} {memory.hook}
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--app-text-muted)' }}>Nhấn để lật</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--app-accent)' }}>{character.meaningVi}</div>
            {character.compounds?.[0] && (
              <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--app-text-muted)' }}>
                {character.compounds[0].ko} — {character.compounds[0].vi}
              </div>
            )}
            {memory?.mnemonicVi && (
              <p style={{ margin: '14px 0 0 0', fontSize: '14px', color: 'var(--app-text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                💡 {memory.mnemonicVi}
              </p>
            )}
          </>
        )}
      </button>
      {flipped && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
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
                borderRadius: '8px',
                border: 'none',
                background: color,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '13px',
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

function QuizPanel({ questions, onComplete, showToast }) {
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[qIdx];

  const handlePick = (opt) => {
    if (checked) return;
    setPicked(opt);
    setChecked(true);
    if (normalize(opt) === normalize(q.correctAnswer)) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (qIdx + 1 >= questions.length) {
      setDone(true);
      onComplete?.(score + (normalize(picked) === normalize(q.correctAnswer) ? 0 : 0));
      showToast?.(`Quiz xong: ${score + (normalize(picked) === normalize(q?.correctAnswer) ? 0 : 0)}/${questions.length}`, 'success');
      return;
    }
    setQIdx((i) => i + 1);
    setPicked(null);
    setChecked(false);
  };

  if (!questions.length) {
    return <p style={{ color: 'var(--app-text-muted)' }}>Không đủ dữ liệu để tạo quiz.</p>;
  }

  if (done) {
    const finalScore = score;
    return (
      <div className={cardClass} style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
        <h3 style={{ margin: '0 0 8px 0' }}>Kết quả: {finalScore}/{questions.length}</h3>
        <button type="button" className={navBtnClass} onClick={() => onComplete?.(finalScore)}>Làm phiên mới</button>
      </div>
    );
  }

  const typeLabels = { compound: 'Từ ghép', word: 'Từ tiếng Hàn', readingMean: 'Âm gốc', mixed: 'Hỗn hợp' };

  return (
    <div className={cardClass} style={{ padding: '20px' }}>
      <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginBottom: '8px' }}>
        Câu {qIdx + 1}/{questions.length} · {typeLabels[q.type] || q.type}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', margin: '16px 0' }}>
        {q.prompt}
      </div>
      {q.promptSub && <p style={{ textAlign: 'center', color: 'var(--app-text-muted)', margin: '0 0 16px 0' }}>{q.promptSub}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {q.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => handlePick(opt)}
            style={{ ...getQuizOptionStyle(opt, picked, checked, q.correctAnswer), padding: '12px 16px', borderRadius: '8px', cursor: checked ? 'default' : 'pointer', fontSize: '15px' }}
          >
            {opt}
          </button>
        ))}
      </div>
      {checked && (
        <>
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: 'var(--app-text-muted)' }}>{q.explanation}</p>
          <button type="button" onClick={handleNext} className={navBtnClass} style={{ marginTop: '12px', width: '100%' }}>
            {qIdx + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp →'}
          </button>
        </>
      )}
    </div>
  );
}

export default function HanjaPractice({
  showToast,
  userId,
  isPremium,
  onUpgradeClick,
}) {
  const [zone, setZone] = useState('home');
  const [libraryView, setLibraryView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [packFilter, setPackFilter] = useState(TOPIK100_PACK_ID);
  const [topicSubgroup, setTopicSubgroup] = useState('');
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [savedItems, setSavedItems] = useState([]);
  const [savedFilter, setSavedFilter] = useState(false);
  const [flashIdx, setFlashIdx] = useState(0);
  const [srsState, setSrsState] = useState({});
  const [srsSessionActive, setSrsSessionActive] = useState(false);
  const [srsSessionCardsDone, setSrsSessionCardsDone] = useState(0);
  const [srsQuotaExhausted, setSrsQuotaExhausted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);
  const [unlockedPackIds, setUnlockedPackIds] = useState([]);
  const [vocabLinks, setVocabLinks] = useState([]);
  const [specialtyFilter, setSpecialtyFilter] = useState(SPECIALTY_LIST[0] || '');
  const [specialtyIdx, setSpecialtyIdx] = useState(0);
  const [typingTarget, setTypingTarget] = useState(SPECIALIZED_VOCAB[0] || null);

  const { consume, getFeature, savedLimit } = usePracticeQuota(userId, isPremium);
  const quizFeature = getFeature(FEATURE_KEYS.hanjaQuiz);
  const srsFeature = getFeature(FEATURE_KEYS.hanjaSrs);
  const stats = useMemo(() => getHanjaStats(), []);

  useEffect(() => {
    if (userId) setSavedItems(loadSavedHanja(userId));
    setSrsState(loadSrsState(userId));
    setVocabLinks(getHanjaSuggestionsForVocab54(10));
    fetchUnlockedPacks(userId).then(setUnlockedPackIds);
  }, [userId]);

  useEffect(() => {
    if (zone === 'review' && isPremium) {
      setSrsSessionActive(true);
    }
    if (zone !== 'review') {
      setSrsSessionActive(false);
      setSrsSessionCardsDone(0);
      setSrsQuotaExhausted(false);
    }
  }, [zone, isPremium]);

  const sortedPacks = useMemo(() => {
    const heroIds = new Set([TOPIK100_PACK_ID, TOPIK_PREMIUM_90_PACK_ID]);
    const hero = hanjaPacks.find((p) => p.packId === TOPIK100_PACK_ID);
    const rest = hanjaPacks.filter((p) => !heroIds.has(p.packId));
    return hero ? [hero, ...rest] : hanjaPacks.filter((p) => !heroIds.has(p.packId));
  }, []);

  const accessCtx = useMemo(
    () => ({ hasHanja: isPremium, isPremium, unlockedPackIds }),
    [isPremium, unlockedPackIds]
  );

  const premium90Pack = useMemo(() => getPackById(TOPIK_PREMIUM_90_PACK_ID), []);
  const premium90Accessible = useMemo(
    () => canAccessPack(premium90Pack, accessCtx),
    [premium90Pack, accessCtx]
  );

  const accessibleChars = useMemo(
    () => getAccessibleCharacters(accessCtx),
    [accessCtx]
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const meta = {};
      accessibleChars.forEach((c) => {
        meta[c.id] = { word: getDisplayWord(c), meaning: c.meaningVi || '' };
      });
      try {
        await runMigrationIfNeeded(userId, meta);
        await syncSrsFromServer(userId);
        if (!cancelled) setSrsState(loadSrsState(userId));
      } catch {
        /* offline fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [userId, accessibleChars]);

  const specialtyPool = useMemo(
    () => SPECIALIZED_VOCAB.filter((v) => !specialtyFilter || v.specialty === specialtyFilter),
    [specialtyFilter]
  );
  const currentSpecialty = specialtyPool[specialtyIdx % Math.max(specialtyPool.length, 1)];

  const allCharIds = useMemo(() => accessibleChars.map((c) => c.id), [accessibleChars]);

  const srsSummary = useMemo(
    () => getSrsSummary(userId, allCharIds),
    [userId, allCharIds, srsState]
  );

  const topik100Subgroups = useMemo(() => getTopik100Subgroups(TOPIK100_PACK_ID), []);
  const topik90Subgroups = useMemo(() => getTopik90Subgroups(TOPIK_PREMIUM_90_PACK_ID), []);
  const topik100Progress = useMemo(
    () => getPackProgress(TOPIK100_PACK_ID, srsState),
    [srsState]
  );
  const topik90Progress = useMemo(
    () => getPackProgress(TOPIK_PREMIUM_90_PACK_ID, srsState),
    [srsState]
  );
  const todayStudySet = useMemo(
    () => getTodayStudySet(topik100Subgroups.all, srsState, { limit: 5 }),
    [topik100Subgroups.all, srsState]
  );
  const todayStudySet90 = useMemo(
    () => getTodayStudySet(topik90Subgroups.all, srsState, { limit: 5 }),
    [topik90Subgroups.all, srsState]
  );

  const lookupResults = useMemo(() => {
    let pool = searchCharacters(searchQuery, {
      packId: packFilter || null,
      accessibleOnly: !packFilter,
      ...accessCtx,
    });
    if (packFilter === TOPIK100_PACK_ID && topicSubgroup) {
      pool = pool.filter((c) => c.topics?.includes(topicSubgroup));
    }
    if (packFilter === TOPIK_PREMIUM_90_PACK_ID && topicSubgroup) {
      pool = pool.filter((c) => c.topics?.includes(topicSubgroup));
    }
    if (savedFilter) pool = filterSavedCharacters(pool, savedItems);
    return pool;
  }, [searchQuery, packFilter, topicSubgroup, accessCtx, savedFilter, savedItems]);

  const dueCharIds = useMemo(() => {
    const poolIds = packFilter
      ? getCharactersForPack(packFilter).filter((c) => canAccessPack(getPackById(packFilter), accessCtx)).map((c) => c.id)
      : allCharIds;
    return getDueCards(poolIds, srsState, { limit: isPremium ? 999 : FREE_HANJA_SRS_CARDS_PER_SESSION });
  }, [allCharIds, srsState, isPremium, packFilter, accessCtx]);

  const flashList = useMemo(() => {
    const dueSet = new Set(dueCharIds);
    return accessibleChars.filter((c) => dueSet.has(c.id));
  }, [accessibleChars, dueCharIds]);

  const currentFlash = flashList[flashIdx] || null;

  const handleToggleSave = useCallback((character) => {
    const result = toggleSavedHanja(userId, character, { maxItems: savedLimit });
    if (result.blocked) {
      showToast?.('Đã đủ 20 mục "chưa thuộc". Nâng cấp PREMIUM để lưu không giới hạn.', 'warning');
      onUpgradeClick?.();
      return;
    }
    setSavedItems(result.items);
    showToast?.(result.saved ? 'Đã lưu vào chưa thuộc' : 'Đã bỏ khỏi danh sách', 'info');
  }, [userId, savedLimit, showToast, onUpgradeClick]);

  const handleStartSrsSession = useCallback(async () => {
    if (isPremium) {
      setSrsSessionActive(true);
      setSrsSessionCardsDone(0);
      setFlashIdx(0);
      setSrsQuotaExhausted(false);
      return;
    }
    const result = await consume(FEATURE_KEYS.hanjaSrs);
    if (!result.success) {
      setSrsQuotaExhausted(true);
      return;
    }
    setSrsSessionActive(true);
    setSrsSessionCardsDone(0);
    setFlashIdx(0);
    setSrsQuotaExhausted(false);
  }, [isPremium, consume]);

  const handleSrsRate = useCallback(async (quality) => {
    if (!currentFlash) return;
    if (!isPremium && !srsSessionActive) return;

    try {
      await recordReview(userId, currentFlash.id, quality, {
        word: getDisplayWord(currentFlash),
        meaning: currentFlash.meaningVi || '',
      });
      setSrsState(loadSrsState(userId));
    } catch (err) {
      showToast?.(err?.message || 'Lỗi ghi nhận ôn tập', 'error');
      return;
    }

    const nextDone = srsSessionCardsDone + 1;
    if (!isPremium && nextDone >= FREE_HANJA_SRS_CARDS_PER_SESSION) {
      setSrsSessionActive(false);
      setSrsSessionCardsDone(0);
      setFlashIdx(0);
      showToast?.(`Hoàn thành phiên ${FREE_HANJA_SRS_CARDS_PER_SESSION} thẻ`, 'success');
      return;
    }

    setSrsSessionCardsDone(nextDone);
    setFlashIdx((i) => (i + 1) % Math.max(flashList.length, 1));
    showToast?.('Đã ghi nhận ôn tập', 'success');
  }, [currentFlash, isPremium, srsSessionActive, srsSessionCardsDone, userId, flashList.length, showToast]);

  const startTodayStudy = useCallback(async () => {
    if (todayStudySet.length === 0) {
      showToast?.('Không có từ cần ôn hôm nay trong pack TOPIK 100.', 'info');
      return;
    }
    setZone('review');
    setPackFilter(TOPIK100_PACK_ID);
    setFlashIdx(0);
    if (isPremium) {
      setSrsSessionActive(true);
      setSrsSessionCardsDone(0);
    } else {
      await handleStartSrsSession();
    }
  }, [todayStudySet.length, isPremium, showToast, handleStartSrsSession]);

  const startTodayStudy90 = useCallback(async () => {
    if (!premium90Accessible) {
      onUpgradeClick?.();
      return;
    }
    if (todayStudySet90.length === 0) {
      showToast?.('Không có từ cần ôn hôm nay trong pack 90 từ PREMIUM.', 'info');
      return;
    }
    setZone('review');
    setPackFilter(TOPIK_PREMIUM_90_PACK_ID);
    setFlashIdx(0);
    setSrsSessionActive(true);
    setSrsSessionCardsDone(0);
  }, [premium90Accessible, todayStudySet90.length, showToast, onUpgradeClick]);

  const goToLookupBrowse = useCallback(() => {
    setZone('library');
    setLibraryView('list');
    setPackFilter(TOPIK100_PACK_ID);
    setSrsQuotaExhausted(false);
  }, []);

  const browsePack = useCallback((packId) => {
    setPackFilter(packId);
    setSelectedCharId(null);
    setZone('library');
    setLibraryView('list');
  }, []);

  const openPackCharacter = useCallback((character, packId) => {
    setPackFilter(packId);
    setSelectedCharId(character.id);
    setZone('library');
    setLibraryView('list');
  }, []);

  const goToLibraryPacks = useCallback((packId) => {
    setPackFilter(packId || TOPIK100_PACK_ID);
    setZone('library');
    setLibraryView('packs');
    setSelectedCharId(null);
  }, []);

  const startQuiz = useCallback(async () => {
    if (!isPremium) {
      const result = await consume(FEATURE_KEYS.hanjaQuiz);
      if (!result.success) {
        showToast?.(result.message || 'Hết lượt quiz hôm nay.', 'warning');
        onUpgradeClick?.();
        return;
      }
    }
    const pool = savedFilter ? filterSavedCharacters(accessibleChars, savedItems) : accessibleChars;
    setQuizQuestions(generateQuizSession(pool.length ? pool : hanjaCharacters, 5));
    setQuizStarted(true);
  }, [isPremium, consume, accessibleChars, savedItems, savedFilter, showToast, onUpgradeClick]);

  const selectedChar = selectedCharId
    ? hanjaCharacters.find((c) => c.id === selectedCharId)
    : lookupResults[0] || null;

  const readingGroups = useMemo(() => {
    const pool = getAccessibleCharacters(accessCtx);
    return groupByReading(pool.length ? pool : hanjaCharacters);
  }, [accessCtx]);

  const switchZone = useCallback((id) => {
    setZone(id);
    setSelectedCharId(null);
    setQuizStarted(false);
  }, []);

  return (
    <div className="hanja-hub">
      <header className="hanja-hub-hero">
        <div className="hanja-hub-hero__top">
          <span className="hanja-hub-hero__icon" aria-hidden>漢</span>
          <div>
            <h2 className="hanja-hub-hero__title">Từ gốc Hán — TOPIK Đọc · Nghe</h2>
            <p className="hanja-hub-hero__desc">
              Luồng học: xem tiến độ → tra thư viện → ôn SRS → làm quiz.
              {' '}{stats.characters} từ · {stats.packs} pack.
            </p>
          </div>
        </div>
        <div className="hanja-hub-stats">
          <div className={`hanja-hub-stat${srsSummary.due > 0 ? ' hanja-hub-stat--warn' : ''}`}>
            <span className="hanja-hub-stat__num">{srsSummary.due}</span>
            <span className="hanja-hub-stat__label">Cần ôn hôm nay</span>
          </div>
          <div className="hanja-hub-stat hanja-hub-stat--accent">
            <span className="hanja-hub-stat__num">{topik100Progress.percent}%</span>
            <span className="hanja-hub-stat__label">TOPIK 100</span>
          </div>
          <div className="hanja-hub-stat">
            <span className="hanja-hub-stat__num">{srsSummary.streak || 0}</span>
            <span className="hanja-hub-stat__label">Streak (ngày)</span>
          </div>
          <div className={`hanja-hub-stat${savedItems.length > 0 ? ' hanja-hub-stat--warn' : ''}`}>
            <span className="hanja-hub-stat__num">{savedItems.length}</span>
            <span className="hanja-hub-stat__label">Chưa thuộc</span>
          </div>
        </div>
      </header>

      <nav className="hanja-hub-zones" aria-label="Khu vực học Hán Hàn">
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            className={`hanja-hub-zone${zone === z.id ? ' hanja-hub-zone--active' : ''}`}
            onClick={() => switchZone(z.id)}
          >
            <span className="hanja-hub-zone__icon">{z.icon}</span>
            <span className="hanja-hub-zone__label">{z.label}</span>
            <span className="hanja-hub-zone__hint">{z.hint}</span>
          </button>
        ))}
      </nav>

      {zone === 'home' && (
        <>
          <p className="hanja-hub-step-label">Bước 1 — Phiên học hôm nay</p>
          <div className="hanja-hub-cta">
            <button type="button" className="hanja-hub-cta__primary" onClick={startTodayStudy}>
              Ôn SRS · {Math.min(todayStudySet.length, 5) || 5} từ TOPIK 100
            </button>
            <button type="button" className="hanja-hub-cta__secondary" onClick={() => switchZone('review')}>
              Vào khu Ôn SRS
            </button>
            <button type="button" className="hanja-hub-cta__secondary" onClick={() => { switchZone('quiz'); }}>
              Làm Quiz
            </button>
          </div>

          <p className="hanja-hub-step-label">Bước 2 — Khóa học chính</p>
          <div className="hanja-hub-courses">
            <article className="hanja-hub-course hanja-hub-course--topik100">
              <div className="hanja-hub-course__head">
                <h3 className="hanja-hub-course__title">100 từ hay gặp TOPIK</h3>
                <span style={{ fontWeight: 800, color: 'var(--app-purple)' }}>
                  {topik100Progress.learned}/{topik100Progress.total}
                </span>
              </div>
              <p className="hanja-hub-course__meta">
                Đọc · Nghe · Tra cứu free · SRS {FREE_HANJA_SRS_DAILY} phiên/ngày
              </p>
              <div className="hanja-hub-course__progress">
                <div className="hanja-hub-course__progress-fill" style={{ width: `${topik100Progress.percent}%`, background: 'var(--app-purple)' }} />
              </div>
              <div className="hanja-hub-course__actions">
                <button type="button" className="practice-nav-btn" onClick={startTodayStudy}>Ôn hôm nay</button>
                <button type="button" className="hanja-hub-cta__secondary" onClick={() => browsePack(TOPIK100_PACK_ID)}>Tra cứu</button>
                <button type="button" className="hanja-hub-cta__secondary" onClick={() => goToLibraryPacks(TOPIK100_PACK_ID)}>Xem pack</button>
              </div>
            </article>

            <article className="hanja-hub-course hanja-hub-course--premium90">
              {!premium90Accessible && (
                <div className="hanja-hub-course__lock">
                  <div style={{ fontSize: '32px' }}>🔒</div>
                  <p style={{ margin: '8px 0', textAlign: 'center', fontSize: '0.88rem' }}>90 từ PREMIUM</p>
                  <button type="button" onClick={onUpgradeClick} className="app-btn-premium">⭐ Nâng cấp</button>
                </div>
              )}
              <div className="hanja-hub-course__head">
                <h3 className="hanja-hub-course__title">90 từ Động thái & Học thuật</h3>
                <span style={{ fontWeight: 800, color: '#d97706' }}>
                  {topik90Progress.learned}/{topik90Progress.total}
                </span>
              </div>
              <p className="hanja-hub-course__meta">Câu 51–53 · Đọc hiểu chuyên sâu</p>
              <div className="hanja-hub-course__progress">
                <div className="hanja-hub-course__progress-fill" style={{ width: `${topik90Progress.percent}%`, background: '#f59e0b' }} />
              </div>
              <div className="hanja-hub-course__actions">
                {premium90Accessible && (
                  <button type="button" className="practice-nav-btn" onClick={startTodayStudy90}>
                    Ôn {Math.min(todayStudySet90.length, 5) || 5} từ
                  </button>
                )}
                <button
                  type="button"
                  className="hanja-hub-cta__secondary"
                  disabled={!premium90Accessible}
                  onClick={() => (premium90Accessible ? browsePack(TOPIK_PREMIUM_90_PACK_ID) : onUpgradeClick?.())}
                >
                  Tra cứu
                </button>
              </div>
            </article>
          </div>

          <p className="hanja-hub-step-label">Bước 3 — Các pack khác</p>
          <div className="hanja-hub-pack-grid">
            {sortedPacks
              .filter((p) => p.packId !== TOPIK100_PACK_ID && p.packId !== TOPIK_PREMIUM_90_PACK_ID)
              .map((pack) => {
                if (isShowcasePack(pack.packId)) {
                  return (
                    <HanjaPackShowcase
                      key={pack.packId}
                      packId={pack.packId}
                      accessCtx={accessCtx}
                      srsState={srsState}
                      onOpenCharacter={(c) => openPackCharacter(c, pack.packId)}
                      onBrowsePack={browsePack}
                      onUpgradeClick={onUpgradeClick}
                    />
                  );
                }
                const accessible = canAccessPack(pack, accessCtx);
                const progress = getPackProgress(pack.packId, srsState);
                const previewChars = getCharactersForPack(pack.packId).slice(0, 3);
                const isPremiumPack = isPackAccessPremium(pack.access);
                const isSkuPack = isPackAccessSku(pack.access);
                const sku = isSkuPack ? getSkuFromAccess(pack.access) : null;
                const skuInfo = HANJA_PACK_SKUS.find((s) => s.sku === sku);
                return (
                  <div key={pack.packId} className="hanja-hub-pack-row">
                    {!accessible && (
                      <div className="hanja-hub-course__lock">
                        <div style={{ fontSize: '28px' }}>🔒</div>
                        <p style={{ margin: '6px 0', fontSize: '0.85rem' }}>
                          {isPremiumPack ? 'PREMIUM' : skuInfo ? skuInfo.titleVi : 'Pack khóa'}
                        </p>
                        <button type="button" onClick={onUpgradeClick} className="app-btn-premium" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          {isSkuPack ? 'Xem gói' : 'Nâng cấp'}
                        </button>
                      </div>
                    )}
                    <div className="hanja-hub-pack-row__head">
                      <h4 className="hanja-hub-pack-row__title">{pack.titleVi}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--app-text-muted)' }}>
                        {progress.learned}/{progress.total}
                      </span>
                    </div>
                    <div className="hanja-hub-course__progress" style={{ marginBottom: 10 }}>
                      <div className="hanja-hub-course__progress-fill" style={{ width: `${progress.percent}%`, background: 'var(--app-purple)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: '1rem', fontWeight: 600, opacity: accessible ? 1 : 0.5 }}>
                      {previewChars.map((c) => (
                        <span key={c.id}>{getDisplayWord(c)}</span>
                      ))}
                    </div>
                    {accessible && (
                      <button type="button" className="hanja-hub-cta__secondary" style={{ marginTop: 10 }} onClick={() => browsePack(pack.packId)}>
                        Mở thư viện
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {zone === 'library' && (
        <>
          <div className="hanja-hub-subtabs" role="tablist">
            {LIBRARY_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={libraryView === v.id}
                className={`hanja-hub-subtab${libraryView === v.id ? ' hanja-hub-subtab--active' : ''}`}
                onClick={() => { setLibraryView(v.id); setSelectedCharId(null); setSelectedReading(null); }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {libraryView === 'list' && (
            <>
              <div className={cardClass} style={{ padding: '16px' }}>
                <input
                  type="search"
                  className="hanja-hub-search"
                  placeholder="Tìm theo từ tiếng Hàn, âm gốc, nghĩa Việt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="hanja-hub-filters">
                  <select value={packFilter} onChange={(e) => setPackFilter(e.target.value)}>
                    <option value="">Tất cả pack truy cập được</option>
                    {hanjaPacks.map((p) => {
                      const locked = !canAccessPack(p, accessCtx);
                      return (
                        <option key={p.packId} value={p.packId} disabled={locked}>
                          {p.titleVi}{locked ? ' 🔒' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className={`hanja-hub-cta__secondary${savedFilter ? ' hanja-hub-chip--active' : ''}`}
                    onClick={() => setSavedFilter((v) => !v)}
                  >
                    {savedFilter ? '★ Chưa thuộc' : `☆ Chưa thuộc (${savedItems.length})`}
                  </button>
                </div>
                {packFilter === TOPIK100_PACK_ID && (
                  <SubgroupChipRow value={topicSubgroup} onChange={setTopicSubgroup} />
                )}
                {packFilter === TOPIK_PREMIUM_90_PACK_ID && (
                  <SubgroupChipRow value={topicSubgroup} onChange={setTopicSubgroup} chips={PREMIUM90_SUBGROUP_CHIPS} />
                )}
              </div>

              {vocabLinks.length > 0 && (
                <div className={cardClass} style={{ padding: '14px 16px' }}>
                  <p className="hanja-hub-step-label" style={{ marginBottom: 8 }}>Liên kết vocab câu 54</p>
                  <div className="hanja-hub-vocab-links">
                    {vocabLinks.map((link) => (
                      <button
                        key={`${link.charId}-${link.compound?.ko}`}
                        type="button"
                        className="hanja-hub-vocab-link"
                        onClick={() => { setSelectedCharId(link.charId); setLibraryView('list'); }}
                      >
                        {link.compound?.ko || link.vocabKo}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="hanja-hub-browse">
                <div className="hanja-hub-list">
                  {lookupResults.length === 0 ? (
                    <p style={{ color: 'var(--app-text-muted)', fontSize: '0.88rem' }}>Không tìm thấy.</p>
                  ) : (
                    lookupResults.map((c) => {
                      const hook = getMemoryHook(c);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`hanja-hub-list-item${selectedChar?.id === c.id ? ' hanja-hub-list-item--active' : ''}`}
                          onClick={() => setSelectedCharId(c.id)}
                        >
                          <div className="hanja-hub-list-item__ko">
                            {c.hanViet && <span style={{ marginRight: 6, color: 'var(--app-purple)' }}>{c.hanViet}</span>}
                            {getDisplayWord(c)}
                          </div>
                          <div className="hanja-hub-list-item__sub">
                            {c.reading}{hook?.hook ? ` · ${hook.emoji} ${hook.hook}` : ''}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedChar ? (
                  <HanjaCharacterCard
                    character={selectedChar}
                    saved={isHanjaSaved(userId, selectedChar.id)}
                    onToggleSave={() => handleToggleSave(selectedChar)}
                    onNavigatePack={(pid) => goToLibraryPacks(pid)}
                    enableBrowseFlip
                  />
                ) : (
                  <div className={cardClass} style={{ padding: '24px', color: 'var(--app-text-muted)', textAlign: 'center' }}>
                    Chọn một từ để xem chi tiết và lật thẻ
                  </div>
                )}
              </div>
            </>
          )}

          {libraryView === 'reading' && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--app-text-muted)', margin: 0 }}>
                Nhóm theo âm gốc Hán Hàn — phù hợp khi bạn đã biết âm đọc và muốn ôn cùng nhóm.
              </p>
              <div className="hanja-hub-reading-grid">
                {readingGroups.map((g) => (
                  <button
                    key={g.reading}
                    type="button"
                    className={`hanja-hub-reading-btn${selectedReading === g.reading ? ' hanja-hub-reading-btn--active' : ''}`}
                    onClick={() => setSelectedReading(g.reading === selectedReading ? null : g.reading)}
                  >
                    <div className="hanja-hub-reading-btn__sound">{g.reading}</div>
                    <div className="hanja-hub-reading-btn__count">{g.characters.length} từ</div>
                  </button>
                ))}
              </div>
              {selectedReading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {readingGroups.find((g) => g.reading === selectedReading)?.characters.map((c) => (
                    <HanjaCharacterCard
                      key={c.id}
                      character={c}
                      compact
                      saved={isHanjaSaved(userId, c.id)}
                      onToggleSave={() => handleToggleSave(c)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {libraryView === 'packs' && (
            <div className="hanja-hub-pack-grid">
              {sortedPacks.map((pack) => (
                isShowcasePack(pack.packId) ? (
                  <HanjaPackShowcase
                    key={pack.packId}
                    packId={pack.packId}
                    accessCtx={accessCtx}
                    srsState={srsState}
                    onOpenCharacter={(c) => openPackCharacter(c, pack.packId)}
                    onBrowsePack={browsePack}
                    onUpgradeClick={onUpgradeClick}
                  />
                ) : (
                  <div key={pack.packId} className="hanja-hub-pack-row">
                    <div className="hanja-hub-pack-row__head">
                      <h4 className="hanja-hub-pack-row__title">{pack.titleVi}</h4>
                      <button type="button" className="hanja-hub-cta__secondary" onClick={() => browsePack(pack.packId)}>
                        Tra cứu
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </>
      )}

      {zone === 'review' && (
        <>
          <p className="hanja-hub-step-label">Spaced repetition — ôn đúng nhịp để nhớ lâu</p>
          <PracticeQuotaBanner feature={srsFeature} isPremium={isPremium} periodLabel="hôm nay" />
          {!isPremium && srsQuotaExhausted && (
            <SrsQuotaSoftLanding onGoLookup={goToLookupBrowse} onUpgrade={onUpgradeClick} />
          )}
          {!isPremium && !srsQuotaExhausted && !srsSessionActive && srsFeature?.canUse !== false && (
            <div className={cardClass} style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--app-text-muted)', margin: '0 0 8px 0' }}>
                Mỗi phiên SRS: {FREE_HANJA_SRS_CARDS_PER_SESSION} thẻ · Free còn{' '}
                {Math.max(0, (srsFeature?.limit ?? FREE_HANJA_SRS_DAILY) - (srsFeature?.used || 0))}/
                {srsFeature?.limit ?? FREE_HANJA_SRS_DAILY} phiên hôm nay
              </p>
              <button type="button" onClick={handleStartSrsSession} className={navBtnClass} style={{ padding: '12px 24px' }}>
                Bắt đầu phiên SRS ({FREE_HANJA_SRS_CARDS_PER_SESSION} thẻ)
              </button>
            </div>
          )}
          {!isPremium && !srsQuotaExhausted && !srsSessionActive && srsFeature?.canUse === false && (
            <SrsQuotaSoftLanding onGoLookup={goToLookupBrowse} onUpgrade={onUpgradeClick} />
          )}
          {(isPremium || srsSessionActive) && !srsQuotaExhausted && (
            <>
              {!isPremium && srsSessionActive && (
                <p style={{ fontSize: '13px', color: 'var(--app-text-muted)', margin: 0 }}>
                  Phiên SRS: {srsSessionCardsDone}/{FREE_HANJA_SRS_CARDS_PER_SESSION} thẻ
                </p>
              )}
              {flashList.length === 0 ? (
                <div className={cardClass} style={{ padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
                  <p style={{ color: 'var(--app-text-muted)' }}>Không có chữ cần ôn hôm nay. Quay lại mai nhé!</p>
                  <button type="button" onClick={goToLookupBrowse} className={navBtnClass} style={{ marginTop: '12px' }}>
                    Tra cứu 100 từ TOPIK
                  </button>
                </div>
              ) : (
                <>
                  <SrsFlashcard character={currentFlash} onRate={handleSrsRate} />
                  <ItemNav
                    index={flashIdx}
                    total={flashList.length}
                    onPrev={() => setFlashIdx((i) => (i - 1 + flashList.length) % flashList.length)}
                    onNext={() => setFlashIdx((i) => (i + 1) % flashList.length)}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {zone === 'specialty' && (
        <>
          <p className="hanja-hub-step-label">Từ vựng chuyên ngành — FSRS (Free 50 / Pro 250 từ/ngành)</p>
          <div className="hanja-hub-chip-row" style={{ marginBottom: 12 }}>
            {SPECIALTY_LIST.map((sp) => (
              <button
                key={sp}
                type="button"
                className={`hanja-hub-chip${specialtyFilter === sp ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => { setSpecialtyFilter(sp); setSpecialtyIdx(0); }}
              >
                {sp}
              </button>
            ))}
          </div>
          {currentSpecialty && (
            <div className={cardClass} style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 700 }}>{currentSpecialty.word}</p>
              <p style={{ margin: '0 0 16px', color: 'var(--app-text-muted)' }}>{currentSpecialty.meaning}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className={navBtnClass} onClick={() => setSpecialtyIdx((i) => (i + 1) % specialtyPool.length)}>
                  Từ tiếp theo
                </button>
                <button
                  type="button"
                  className="app-btn-premium"
                  style={{ padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                  onClick={async () => {
                    const r = await createSpecializedCard(userId, currentSpecialty);
                    showToast?.(r.ok ? 'Đã lưu vào kho FSRS' : r.data?.message || 'Không lưu được', r.ok ? 'success' : 'error');
                  }}
                >
                  Lưu FSRS
                </button>
              </div>
            </div>
          )}
          {typingTarget && (
            <div className={cardClass} style={{ padding: '20px', marginTop: 16 }}>
              <p className="hanja-hub-step-label">Luyện gõ từ: {typingTarget.word}</p>
              <p style={{ color: 'var(--app-text-muted)', fontSize: 14 }}>{typingTarget.meaning}</p>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--app-text-muted)', marginTop: 12 }}>
            Streak: {loadStreak(userId).count} ngày · Thuật toán FSRS giúp giảm số thẻ ôn dư thừa mỗi ngày.
          </p>
        </>
      )}

      {zone === 'quiz' && (
        <>
          <p className="hanja-hub-step-label">Kiểm tra — 5 câu trắc nghiệm (tiếng Hàn, không chữ Hán)</p>
          <PracticeQuotaBanner feature={quizFeature} isPremium={isPremium} periodLabel="hôm nay" />
          {!quizStarted ? (
            <div className={cardClass} style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--app-text-muted)', marginBottom: '16px' }}>
                5 câu trắc nghiệm — từ tiếng Hàn và nghĩa Việt (không có chữ Hán).
              </p>
              <button type="button" onClick={startQuiz} className={navBtnClass} style={{ padding: '12px 24px' }}>
                Bắt đầu phiên quiz
              </button>
            </div>
          ) : (
            <QuizPanel
              questions={quizQuestions}
              onComplete={() => { setQuizStarted(false); setQuizQuestions(null); }}
              showToast={showToast}
            />
          )}
        </>
      )}

      {savedItems.length > 0 && zone !== 'library' && (
        <div className="hanja-hub-saved-bar">
          <div className="hanja-hub-saved-bar__title">Chưa thuộc ({savedItems.length})</div>
          <div className="hanja-hub-saved-tags">
            {savedItems.slice(0, 12).map((item) => (
              <span key={item.id} className="hanja-hub-saved-tag">
                <span style={{ fontWeight: 600 }}>{getDisplayLabel(item)}</span>
                <button
                  type="button"
                  onClick={() => { removeSavedHanja(userId, item.id); setSavedItems(loadSavedHanja(userId)); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--app-text-muted)' }}
                  aria-label="Xóa"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="hanja-hub-cta__secondary"
            style={{ marginTop: 10 }}
            onClick={() => { switchZone('library'); setLibraryView('list'); setSavedFilter(true); }}
          >
            Mở danh sách chưa thuộc
          </button>
        </div>
      )}
    </div>
  );
}
