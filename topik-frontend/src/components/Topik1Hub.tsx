import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TOPIK1_EXAMS, getTopik1ExamMeta } from '../modules/lib/topik1ExamMeta';
import {
  fetchInteractiveProgress,
  type ExamProgressRow,
  type RecentSession,
  type SectionProgress,
} from '../modules/lib/apiClient';
import ListenReadExamRoom from './ListenReadExamRoom';
import Topik1MockExamRoom from './Topik1MockExamRoom';
import {
  loadListenReadResume,
  saveListenReadResume,
  type ListenMode,
  type ListenSection,
} from '../utils/listenReadResume';
import { getExamMeta } from '../modules/lib/examMeta';

type Zone = 'home' | 'exams' | 'examDetail' | 'room' | 'mock';

const ZONES = [
  { id: 'home' as const, icon: '🏠', label: 'Tổng quan', hint: 'Tiếp tục & thống kê' },
  { id: 'exams' as const, icon: '📋', label: 'Chọn đề', hint: '10 kỳ TOPIK I' },
];

interface Topik1HubProps {
  userId: number | string;
  hasTopik1: boolean;
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

function emptySection(total: number): SectionProgress {
  return { answered: 0, correct: 0, total, lastAt: null };
}

export default function Topik1Hub({
  userId,
  hasTopik1,
  showToast,
  onUpgradeClick,
}: Topik1HubProps) {
  const [zone, setZone] = useState<Zone>('home');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [pendingSection, setPendingSection] = useState<ListenSection>('reading');
  const [pendingListenMode, setPendingListenMode] = useState<ListenMode>('single');
  const [pendingShowTranscript, setPendingShowTranscript] = useState(true);
  const [roomInitialIndex, setRoomInitialIndex] = useState(0);

  const [progressRows, setProgressRows] = useState<ExamProgressRow[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const resume = useMemo(() => {
    const saved = loadListenReadResume(userId);
    if (!saved || !saved.examId.startsWith('topik1-')) return null;
    return saved;
  }, [userId, zone]);

  const refreshProgress = useCallback(async () => {
    if (!userId) return;
    setLoadingProgress(true);
    try {
      const data = await fetchInteractiveProgress(userId);
      setProgressRows(data.exams.filter((e) => e.examId.startsWith('topik1-')));
      setRecentSessions(data.recentSessions.filter((s) => s.examId.startsWith('topik1-')));
    } finally {
      setLoadingProgress(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const requireAccess = useCallback(() => {
    if (hasTopik1) return true;
    showToast?.('Cần gói TOPIK I — mua pack để luyện đề cấp 1&2', 'info');
    onUpgradeClick?.();
    return false;
  }, [hasTopik1, showToast, onUpgradeClick]);

  const openExamDetail = (examId: string) => {
    if (!requireAccess()) return;
    setSelectedExamId(examId);
    setZone('examDetail');
  };

  const startRoom = (section: ListenSection, opts?: { index?: number }) => {
    if (!selectedExamId || !requireAccess()) return;
    setPendingSection(section);
    setRoomInitialIndex(opts?.index ?? 0);
    setZone('room');
  };

  const handleResume = () => {
    if (!resume || !requireAccess()) return;
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

  if (zone === 'mock' && selectedExamId) {
    return (
      <Topik1MockExamRoom
        userId={userId}
        examId={selectedExamId}
        hasAccess={hasTopik1}
        showToast={showToast}
        onBack={handleBackFromRoom}
      />
    );
  }

  if (zone === 'room' && selectedExamId) {
    return (
      <ListenReadExamRoom
        userId={userId}
        isPremium={hasTopik1}
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

  const selectedMeta = selectedExamId ? getTopik1ExamMeta(selectedExamId) : null;
  const selectedProgress = selectedExamId ? progressForExam(progressRows, selectedExamId) : null;

  return (
    <div className="hanja-hub">
      {!hasTopik1 && (
        <div className="practice-card" style={{ padding: 16, marginBottom: 16, borderColor: 'var(--app-purple)' }}>
          <strong>🔒 TOPIK I Pack</strong>
          <p style={{ margin: '8px 0 12px', fontSize: 14, color: 'var(--app-text-muted)' }}>
            Luyện ~20 bộ đề nghe–đọc TOPIK I cấp 1&2, giải thích tiếng Việt và ghi chú đáp án nhiễu.
          </p>
          <button type="button" className="app-btn-premium-action" onClick={onUpgradeClick}>
            Mua TOPIK I — 99.000đ
          </button>
        </div>
      )}

      <header className="hanja-hub-hero">
        <div className="hanja-hub-hero__top">
          <span className="hanja-hub-hero__icon" aria-hidden>
            📗
          </span>
          <div>
            <h2 className="hanja-hub-hero__title">Luyện Đọc · Nghe TOPIK I</h2>
            <p className="hanja-hub-hero__desc">
              Đề cấp 1&2 — giải thích tiếng Việt, ghi chú đáp án nhiễu, audio tương tác.
            </p>
          </div>
        </div>
        <div className="hanja-hub-stats">
          <div className="hanja-hub-stat hanja-hub-stat--accent">
            <span className="hanja-hub-stat__num">{TOPIK1_EXAMS.length}</span>
            <span className="hanja-hub-stat__label">Đề pilot</span>
          </div>
          <div className="hanja-hub-stat">
            <span className="hanja-hub-stat__num">{recentSessions.length}</span>
            <span className="hanja-hub-stat__label">Phiên gần đây</span>
          </div>
        </div>
      </header>

      <nav className="hanja-hub-zones" aria-label="Khu vực TOPIK I">
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
            {resume && hasTopik1 ? (
              <button type="button" className="hanja-hub-cta__primary" onClick={handleResume}>
                Tiếp tục {getExamMeta(resume.examId).title.replace('TOPIK I — ', 'Kỳ ')} —{' '}
                {resume.section === 'listening' ? 'Nghe' : 'Đọc'} (câu {resume.currentIndex + 1})
              </button>
            ) : (
              <button
                type="button"
                className="hanja-hub-cta__primary"
                onClick={() => (hasTopik1 ? setZone('exams') : requireAccess())}
              >
                {hasTopik1 ? 'Chọn đề TOPIK I' : 'Mở khóa TOPIK I Pack'}
              </button>
            )}
            <button
              type="button"
              className="hanja-hub-cta__secondary"
              onClick={() => setZone('exams')}
            >
              Danh sách đề
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
                    <strong>{getExamMeta(s.examId).title.replace('TOPIK I — ', 'Kỳ ')}</strong>
                    {' · '}
                    {s.section === 'listening' ? 'Nghe' : 'Đọc'}
                    {' · '}
                    {s.correct}/{s.answered} đúng
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {zone === 'exams' && (
        <>
          <p className="hanja-hub-step-label">Chọn kỳ thi TOPIK I</p>
          {loadingProgress && (
            <p style={{ fontSize: 14, color: 'var(--app-text-muted)' }}>Đang tải tiến độ…</p>
          )}
          <div className="hanja-hub-courses" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {TOPIK1_EXAMS.map((ex) => {
              const prog = progressForExam(progressRows, ex.examId);
              const listen = prog?.listening ?? emptySection(ex.listeningMcqCount);
              const read = prog?.reading ?? emptySection(ex.readingMcqCount);
              const locked = !hasTopik1;
              return (
                <article key={ex.examId} className={`hanja-hub-course${locked ? ' hanja-hub-course--locked' : ''}`}>
                  <div className="hanja-hub-course__head">
                    <h3 className="hanja-hub-course__title">
                      {ex.title.replace('TOPIK I — ', 'Kỳ ')}
                      {locked ? ' 🔒' : ''}
                    </h3>
                  </div>
                  <p className="hanja-hub-course__meta">
                    Nghe {listen.answered}/{listen.total} ({pct(listen)}%) · Đọc {read.answered}/{read.total} (
                    {pct(read)}%)
                  </p>
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
              const total =
                sec === 'listening' ? selectedMeta.listeningMcqCount : selectedMeta.readingMcqCount;
              const prog =
                (sec === 'listening' ? selectedProgress?.listening : selectedProgress?.reading) ??
                emptySection(total);
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

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              className="app-btn-premium-action"
              onClick={() => startRoom(pendingSection)}
            >
              Luyện từng phần — {pendingSection === 'listening' ? 'Nghe' : 'Đọc'}
            </button>
            <button
              type="button"
              className="practice-nav-btn"
              style={{ fontWeight: 700 }}
              onClick={() => {
                if (!requireAccess()) return;
                setZone('mock');
              }}
            >
              📝 Thi thử cả đề (Câu 1–70)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
