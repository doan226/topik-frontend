import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EXAMS, canAccessExam, getExamMeta } from '../modules/lib/examMeta';
import {
  fetchInteractiveProgress,
  type ExamProgressRow,
  type RecentSession,
  type SectionProgress,
} from '../modules/lib/apiClient';
import ListenReadExamRoom from './ListenReadExamRoom';
import PassageSrsFlashcard from './PassageSrsFlashcard';
import PracticeQuotaBanner from './PracticeQuotaBanner';
import {
  loadListenReadResume,
  saveListenReadResume,
  type ListenMode,
  type ListenSection,
} from '../utils/listenReadResume';
import {
  cachePassageCard,
  formatPassageContext,
  getPassageDueCards,
  recordPassageReview,
  syncPassageCards,
  type PassageCard,
} from '../utils/passageVocab';
import { usePracticeQuota } from '../hooks/usePracticeQuota';
import {
  FEATURE_KEYS,
  FREE_PASSAGE_SRS_CARDS_PER_SESSION,
  FREE_PASSAGE_SRS_DAILY,
} from '../config/practiceFreeTier';

type Zone = 'home' | 'exams' | 'vocab' | 'examDetail' | 'room';

const ZONES = [
  { id: 'home' as const, icon: '🏠', label: 'Tổng quan', hint: 'Tiếp tục & thống kê' },
  { id: 'exams' as const, icon: '📋', label: 'Chọn đề', hint: '12 kỳ TOPIK II' },
  { id: 'vocab' as const, icon: '📚', label: 'Từ đã lưu', hint: 'Ôn SRS từ đề' },
];

interface ListenReadHubProps {
  userId: number | string;
  isPremium: boolean;
  hasWriting: boolean;
  showToast?: (msg: string, type?: string) => void;
  onUpgradeClick?: () => void;
}

function pct(progress: SectionProgress) {
  if (!progress?.total) return 0;
  return Math.round((progress.answered / progress.total) * 100);
}

function progressForExam(rows: ExamProgressRow[], examId: string): ExamProgressRow | null {
  return rows.find((e) => e.examId === examId) ?? null;
}

function emptySection(): SectionProgress {
  return { answered: 0, correct: 0, total: 50, lastAt: null };
}

export default function ListenReadHub({
  userId,
  isPremium,
  hasWriting,
  showToast,
  onUpgradeClick,
}: ListenReadHubProps) {
  const [zone, setZone] = useState<Zone>('home');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [pendingSection, setPendingSection] = useState<ListenSection>('reading');
  const [pendingListenMode, setPendingListenMode] = useState<ListenMode>('single');
  const [pendingShowTranscript, setPendingShowTranscript] = useState(true);
  const [roomInitialIndex, setRoomInitialIndex] = useState(0);

  const [progressRows, setProgressRows] = useState<ExamProgressRow[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [passageCards, setPassageCards] = useState<PassageCard[]>([]);
  const [vocabFilter, setVocabFilter] = useState<'all' | 'due' | string>('all');
  const [srsSessionActive, setSrsSessionActive] = useState(false);
  const [srsSessionDone, setSrsSessionDone] = useState(0);
  const [flashIdx, setFlashIdx] = useState(0);

  const resume = useMemo(() => loadListenReadResume(userId), [userId, zone]);
  const { getFeature, consume, refresh: refreshQuota } = usePracticeQuota(userId, isPremium);
  const passageSrsFeature = getFeature(FEATURE_KEYS.passageSrs);

  const refreshProgress = useCallback(async () => {
    if (!userId) return;
    setLoadingProgress(true);
    try {
      const data = await fetchInteractiveProgress(userId);
      setProgressRows(data.exams);
      setRecentSessions(data.recentSessions);
    } finally {
      setLoadingProgress(false);
    }
  }, [userId]);

  const refreshVocab = useCallback(async () => {
    if (!userId) return;
    const cards = await syncPassageCards(userId);
    cards.forEach((c) => cachePassageCard(userId, c));
    setPassageCards(cards);
  }, [userId]);

  useEffect(() => {
    refreshProgress();
    refreshVocab();
  }, [refreshProgress, refreshVocab]);

  const dueCards = useMemo(() => getPassageDueCards(passageCards), [passageCards]);

  const filteredVocab = useMemo(() => {
    if (vocabFilter === 'due') return dueCards;
    if (vocabFilter !== 'all') {
      return passageCards.filter((c) => c.specialty?.startsWith(vocabFilter));
    }
    return passageCards;
  }, [passageCards, dueCards, vocabFilter]);

  const srsQueue = useMemo(() => {
    const due = getPassageDueCards(passageCards, FREE_PASSAGE_SRS_CARDS_PER_SESSION);
    return due.length > 0 ? due : passageCards.slice(0, FREE_PASSAGE_SRS_CARDS_PER_SESSION);
  }, [passageCards]);

  const currentFlash = srsQueue[flashIdx];

  const openExamDetail = (examId: string) => {
    const meta = getExamMeta(examId);
    if (!canAccessExam(meta, hasWriting)) {
      showToast?.('Đề này cần gói Viết — nâng cấp để mở khóa', 'info');
      onUpgradeClick?.();
      return;
    }
    setSelectedExamId(examId);
    setZone('examDetail');
  };

  const startRoom = (section: ListenSection, opts?: { index?: number }) => {
    if (!selectedExamId) return;
    const meta = getExamMeta(selectedExamId);
    if (!canAccessExam(meta, hasWriting)) {
      showToast?.('Đề này cần gói Viết — nâng cấp để mở khóa', 'info');
      onUpgradeClick?.();
      return;
    }
    setPendingSection(section);
    setRoomInitialIndex(opts?.index ?? 0);
    setZone('room');
  };

  const handleResume = () => {
    if (!resume) return;
    const meta = getExamMeta(resume.examId);
    if (!canAccessExam(meta, hasWriting)) {
      showToast?.('Đề này cần gói Viết — nâng cấp để mở khóa', 'info');
      onUpgradeClick?.();
      return;
    }
    setSelectedExamId(resume.examId);
    setPendingSection(resume.section);
    setPendingListenMode(resume.listenMode);
    setPendingShowTranscript(resume.showTranscript);
    setRoomInitialIndex(resume.currentIndex);
    setZone('room');
  };

  const handleResumeUpdate = useCallback(
    (state: {
      examId: string;
      section: ListenSection;
      listenMode: ListenMode;
      showTranscript: boolean;
      currentIndex: number;
    }) => {
      saveListenReadResume(userId, { ...state, updatedAt: new Date().toISOString() });
    },
    [userId]
  );

  const handleBackFromRoom = () => {
    refreshProgress();
    setZone('examDetail');
  };

  const startSrsSession = async () => {
    if (!isPremium && passageSrsFeature?.canUse === false) {
      showToast?.('Hết lượt ôn từ đề hôm nay', 'info');
      return;
    }
    if (!isPremium) {
      const ok = await consume(FEATURE_KEYS.passageSrs);
      if (!ok?.success) {
        showToast?.('Hết lượt ôn từ đề hôm nay', 'info');
        return;
      }
      await refreshQuota();
    }
    if (srsQueue.length === 0) {
      showToast?.('Chưa có từ nào để ôn — lưu từ khi làm đề', 'info');
      return;
    }
    setSrsSessionActive(true);
    setSrsSessionDone(0);
    setFlashIdx(0);
  };

  const handleSrsRate = async (rating: number) => {
    if (!currentFlash) return;
    try {
      await recordPassageReview(userId, currentFlash.id, rating);
      setSrsSessionDone((n) => n + 1);
      if (!isPremium && srsSessionDone + 1 >= FREE_PASSAGE_SRS_CARDS_PER_SESSION) {
        setSrsSessionActive(false);
        showToast?.('Hết thẻ trong phiên — quay lại mai hoặc nâng cấp', 'info');
      } else if (flashIdx >= srsQueue.length - 1) {
        setSrsSessionActive(false);
        showToast?.('Xong phiên ôn!', 'success');
      } else {
        setFlashIdx((i) => i + 1);
      }
      await refreshVocab();
    } catch (e) {
      showToast?.(e instanceof Error ? e.message : 'Lỗi ôn tập', 'error');
    }
  };

  if (zone === 'room' && selectedExamId) {
    return (
      <ListenReadExamRoom
        userId={userId}
        isPremium={isPremium}
        examId={selectedExamId}
        section={pendingSection}
        listenMode={pendingListenMode}
        showTranscript={pendingShowTranscript}
        initialIndex={roomInitialIndex}
        showToast={showToast}
        onUpgradeClick={onUpgradeClick}
        onBack={handleBackFromRoom}
        onResumeUpdate={handleResumeUpdate}
      />
    );
  }

  const selectedMeta = selectedExamId ? getExamMeta(selectedExamId) : null;
  const selectedProgress = selectedExamId ? progressForExam(progressRows, selectedExamId) : null;

  return (
    <div className="hanja-hub">
      <header className="hanja-hub-hero">
        <div className="hanja-hub-hero__top">
          <span className="hanja-hub-hero__icon" aria-hidden>
            🎧
          </span>
          <div>
            <h2 className="hanja-hub-hero__title">Luyện Đọc · Nghe TOPIK II</h2>
            <p className="hanja-hub-hero__desc">
              Chọn đề → làm bài → bôi đen từ cần học → ôn SRS trong tab Từ đã lưu.
            </p>
          </div>
        </div>
        <div className="hanja-hub-stats">
          <div className="hanja-hub-stat hanja-hub-stat--accent">
            <span className="hanja-hub-stat__num">{passageCards.length}</span>
            <span className="hanja-hub-stat__label">Từ đã lưu</span>
          </div>
          <div className={`hanja-hub-stat${dueCards.length > 0 ? ' hanja-hub-stat--warn' : ''}`}>
            <span className="hanja-hub-stat__num">{dueCards.length}</span>
            <span className="hanja-hub-stat__label">Cần ôn hôm nay</span>
          </div>
          <div className="hanja-hub-stat">
            <span className="hanja-hub-stat__num">{EXAMS.length}</span>
            <span className="hanja-hub-stat__label">Đề có sẵn</span>
          </div>
          <div className="hanja-hub-stat">
            <span className="hanja-hub-stat__num">{recentSessions.length}</span>
            <span className="hanja-hub-stat__label">Phiên gần đây</span>
          </div>
        </div>
      </header>

      <nav className="hanja-hub-zones" aria-label="Khu vực Đọc Nghe">
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            className={`hanja-hub-zone${zone === z.id ? ' hanja-hub-zone--active' : ''}`}
            onClick={() => setZone(z.id)}
          >
            <span className="hanja-hub-zone__icon">{z.icon}</span>
            <span className="hanja-hub-zone__label">{z.label}</span>
            <span className="hanja-hub-zone__hint">{z.hint}</span>
          </button>
        ))}
      </nav>

      {zone === 'home' && (
        <>
          <p className="hanja-hub-step-label">Bước 1 — Tiếp tục hoặc chọn đề mới</p>
          <div className="hanja-hub-cta">
            {resume ? (
              <button type="button" className="hanja-hub-cta__primary" onClick={handleResume}>
                Tiếp tục {getExamMeta(resume.examId).title.replace('TOPIK II — ', 'Kỳ ')} —{' '}
                {resume.section === 'listening' ? 'Nghe' : 'Đọc'} (câu {resume.currentIndex + 1})
              </button>
            ) : (
              <button type="button" className="hanja-hub-cta__primary" onClick={() => setZone('exams')}>
                Chọn đề TOPIK II
              </button>
            )}
            <button type="button" className="hanja-hub-cta__secondary" onClick={() => setZone('exams')}>
              Danh sách đề
            </button>
            <button
              type="button"
              className="hanja-hub-cta__secondary"
              onClick={() => setZone('vocab')}
              disabled={passageCards.length === 0}
            >
              Ôn {dueCards.length || passageCards.length} từ đã lưu
            </button>
          </div>

          {recentSessions.length > 0 && (
            <>
              <p className="hanja-hub-step-label">Lịch sử gần đây</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSessions.slice(0, 5).map((s, i) => (
                  <button
                    key={`${s.examId}-${s.section}-${i}`}
                    type="button"
                    className="practice-card"
                    style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => openExamDetail(s.examId)}
                  >
                    <strong>{getExamMeta(s.examId).title.replace('TOPIK II — ', 'Kỳ ')}</strong>
                    {' · '}
                    {s.section === 'listening' ? 'Nghe' : 'Đọc'}
                    {' · '}
                    {s.correct}/{s.answered} đúng
                    {s.lastAt && (
                      <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>
                        {' '}
                        · {new Date(s.lastAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {zone === 'exams' && (
        <>
          <p className="hanja-hub-step-label">Chọn kỳ thi — xem tiến độ trước khi vào đề</p>
          {loadingProgress && (
            <p style={{ fontSize: 14, color: 'var(--app-text-muted)' }}>Đang tải tiến độ…</p>
          )}
          <div className="hanja-hub-courses" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {EXAMS.map((ex) => {
              const prog = progressForExam(progressRows, ex.examId);
              const listen = prog?.listening ?? emptySection();
              const read = prog?.reading ?? emptySection();
              const locked = !canAccessExam(ex, hasWriting);
              const inProgress =
                (listen.answered > 0 && listen.answered < listen.total) ||
                (read.answered > 0 && read.answered < read.total);
              return (
                <article key={ex.examId} className={`hanja-hub-course${locked ? ' hanja-hub-course--locked' : ''}`}>
                  <div className="hanja-hub-course__head">
                    <h3 className="hanja-hub-course__title">
                      {ex.title.replace('TOPIK II — ', 'Kỳ ')}
                      {locked ? ' 🔒' : ex.tier === 'free' ? ' · Free' : ''}
                    </h3>
                    {inProgress && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-warning)' }}>Đang làm</span>
                    )}
                  </div>
                  <p className="hanja-hub-course__meta">
                    Nghe {listen.answered}/{listen.total} ({pct(listen)}%) · Đọc {read.answered}/{read.total} (
                    {pct(read)}%)
                  </p>
                  <div className="hanja-hub-course__progress">
                    <div
                      className="hanja-hub-course__progress-fill"
                      style={{
                        width: `${Math.max(pct(listen), pct(read))}%`,
                        background: 'var(--app-purple)',
                      }}
                    />
                  </div>
                  <div className="hanja-hub-course__actions">
                    <button
                      type="button"
                      className="practice-nav-btn"
                      onClick={() => openExamDetail(ex.examId)}
                    >
                      {locked ? 'Mở khóa →' : 'Vào đề →'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {zone === 'examDetail' && selectedExamId && selectedMeta && (
        <>
          <button type="button" className="practice-nav-btn" onClick={() => setZone('exams')} style={{ alignSelf: 'flex-start' }}>
            ← Danh sách đề
          </button>
          <h3 style={{ margin: '8px 0' }}>{selectedMeta.title}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {(['listening', 'reading'] as ListenSection[]).map((sec) => {
              const prog = (sec === 'listening' ? selectedProgress?.listening : selectedProgress?.reading) ?? emptySection();
              return (
                <button
                  key={sec}
                  type="button"
                  className="practice-card"
                  style={{
                    padding: 20,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border:
                      pendingSection === sec
                        ? '2px solid var(--app-purple)'
                        : '1px solid var(--app-border)',
                  }}
                  onClick={() => setPendingSection(sec)}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{sec === 'listening' ? '🎧' : '📖'}</div>
                  <strong>{sec === 'listening' ? 'Luyện Nghe' : 'Luyện Đọc'}</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--app-text-muted)' }}>
                    {prog.answered}/{prog.total} câu · {prog.correct} đúng
                  </p>
                </button>
              );
            })}
          </div>

          {pendingSection === 'listening' && (
            <div className="hanja-hub-chip-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className={`hanja-hub-chip${pendingListenMode === 'full' ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => setPendingListenMode('full')}
              >
                Nghe cả đề
              </button>
              <button
                type="button"
                className={`hanja-hub-chip${pendingListenMode === 'single' ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => setPendingListenMode('single')}
              >
                Nghe từng đoạn
              </button>
              <button
                type="button"
                className={`hanja-hub-chip${pendingShowTranscript ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => setPendingShowTranscript(true)}
              >
                Có transcript
              </button>
              <button
                type="button"
                className={`hanja-hub-chip${!pendingShowTranscript ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => setPendingShowTranscript(false)}
              >
                Ẩn transcript
              </button>
            </div>
          )}

          {recentSessions.filter((s) => s.examId === selectedExamId).length > 0 && (
            <>
              <p className="hanja-hub-step-label" style={{ marginTop: 16 }}>
                Lịch sử đề này
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentSessions
                  .filter((s) => s.examId === selectedExamId)
                  .slice(0, 8)
                  .map((s, i) => (
                    <div key={i} className="practice-card" style={{ padding: '10px 14px', fontSize: 13 }}>
                      {s.section === 'listening' ? 'Nghe' : 'Đọc'} · {s.correct}/{s.answered} đúng
                      {s.lastAt && ` · ${new Date(s.lastAt).toLocaleString('vi-VN')}`}
                    </div>
                  ))}
              </div>
            </>
          )}

          <button
            type="button"
            className="app-btn-premium-action"
            style={{ marginTop: 16 }}
            onClick={() => startRoom(pendingSection)}
          >
            Bắt đầu làm — {pendingSection === 'listening' ? 'Nghe' : 'Đọc'}
          </button>
        </>
      )}

      {zone === 'vocab' && (
        <>
          <p className="hanja-hub-step-label">Từ vựng bạn tự chọn khi làm đề</p>
          <PracticeQuotaBanner feature={passageSrsFeature} isPremium={isPremium} periodLabel="hôm nay" />

          <div className="hanja-hub-chip-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`hanja-hub-chip${vocabFilter === 'all' ? ' hanja-hub-chip--active' : ''}`}
              onClick={() => setVocabFilter('all')}
            >
              Tất cả ({passageCards.length})
            </button>
            <button
              type="button"
              className={`hanja-hub-chip${vocabFilter === 'due' ? ' hanja-hub-chip--active' : ''}`}
              onClick={() => setVocabFilter('due')}
            >
              Cần ôn ({dueCards.length})
            </button>
          </div>

          {!srsSessionActive && (
            <div className="practice-card" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
              <p style={{ margin: '0 0 12px', color: 'var(--app-text-muted)' }}>
                Phiên SRS: {FREE_PASSAGE_SRS_CARDS_PER_SESSION} thẻ
                {!isPremium &&
                  ` · Free còn ${Math.max(0, (passageSrsFeature?.limit ?? FREE_PASSAGE_SRS_DAILY) - (passageSrsFeature?.used || 0))}/${passageSrsFeature?.limit ?? FREE_PASSAGE_SRS_DAILY} phiên/ngày`}
              </p>
              <button type="button" className="practice-nav-btn" onClick={startSrsSession} disabled={passageCards.length === 0}>
                Bắt đầu ôn từ đề
              </button>
            </div>
          )}

          {srsSessionActive && currentFlash && (
            <>
              <p style={{ fontSize: 13, color: 'var(--app-text-muted)', margin: '0 0 8px' }}>
                Phiên: {srsSessionDone}/{FREE_PASSAGE_SRS_CARDS_PER_SESSION} thẻ
              </p>
              <PassageSrsFlashcard card={currentFlash} onRate={handleSrsRate} />
            </>
          )}

          {passageCards.length === 0 ? (
            <div className="practice-card" style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--app-text-muted)', margin: 0 }}>
                Chưa có từ nào. Vào đề, bôi đen từ trong passage/transcript và bấm &quot;Lưu để ôn&quot;.
              </p>
              <button type="button" className="practice-nav-btn" style={{ marginTop: 12 }} onClick={() => setZone('exams')}>
                Chọn đề
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {(vocabFilter === 'due' ? dueCards : filteredVocab).map((card) => (
                <div key={card.id} className="practice-card" style={{ padding: '12px 16px' }}>
                  <strong>{card.word}</strong>
                  <span style={{ color: 'var(--app-text-muted)' }}> — {card.meaning}</span>
                  {card.specialty && (
                    <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 4 }}>
                      {formatPassageContext(card.specialty)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
