import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchInteractiveQuestions } from '../modules/lib/apiClient';
import { getExamMeta, formatListenQuestionNo } from '../modules/lib/examMeta';
import {
  topik1QuestionPoints,
  TOPIK1_TOTAL_TIME_SEC,
} from '../modules/lib/topik1ExamMeta';
import { isValidMcqAnswer, resolveCorrectAnswer } from '../modules/lib/examBankLoader';
import {
  buildAudioSegments,
  buildTimedExamSections,
  getNextSegmentOffset,
  getPrevSegmentOffset,
  pickActiveGlobalLine,
  pickActiveSegmentIndex,
} from '../modules/lib/transcriptUtils';
import ListenAudioPlayer, { type PlaybackRate } from './ListenAudioPlayer';
import TranscriptPanel from './TranscriptPanel';

interface Topik1MockExamRoomProps {
  userId: number | string;
  examId: string;
  hasAccess: boolean;
  showToast?: (msg: string, type?: string) => void;
  onBack: () => void;
}

interface ExamItem {
  globalNo: number;
  section: 'listening' | 'reading';
  question: any;
  content: any;
  points: number;
}

const LISTENING_COUNT = 30;
const TOTAL_COUNT = 70;

/** Đồng hồ đếm ngược cả bài thi; tự nộp khi hết giờ. */
function ExamCountdown({ totalSec, onTimeUp }: { totalSec: number; onTimeUp: () => void }) {
  const [left, setLeft] = useState(totalSec);
  const firedRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setLeft((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUp();
    }
  }, [left, onTimeUp]);
  const mm = Math.floor(left / 60);
  const ss = left % 60;
  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 800,
        padding: '6px 12px',
        borderRadius: 8,
        color: '#fff',
        background: left < 300 ? '#ef4444' : '#10b981',
      }}
    >
      ⏱️ {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
    </span>
  );
}

/** Tách 지시문 (chỉ dẫn) và phần 〈보기〉 ví dụ (nếu có) khỏi passage của câu Nghe. */
function splitInstruction(passage: unknown): { instruction: string; example: string } {
  const text = String(passage ?? '').trim();
  if (!text) return { instruction: '', example: '' };
  // Nếu có xuống dòng: dòng đầu là chỉ dẫn, phần còn lại coi như ví dụ 〈보기〉.
  const nl = text.indexOf('\n');
  if (nl > 0) {
    return { instruction: text.slice(0, nl).trim(), example: text.slice(nl + 1).trim() };
  }
  return { instruction: text, example: '' };
}

export default function Topik1MockExamRoom({
  userId,
  examId,
  hasAccess,
  showToast,
  onBack,
}: Topik1MockExamRoomProps) {
  const examMeta = useMemo(() => getExamMeta(examId), [examId]);
  const sessionLabel = examMeta.title.replace('TOPIK I — ', '');

  const [listeningQs, setListeningQs] = useState<any[]>([]);
  const [readingQs, setReadingQs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentNo, setCurrentNo] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetchInteractiveQuestions('listening', userId, examId),
      fetchInteractiveQuestions('reading', userId, examId),
    ])
      .then(([listen, read]) => {
        setListeningQs(listen);
        setReadingQs(read);
      })
      .finally(() => setLoading(false));
    setCurrentNo(1);
    setAnswers({});
    setFlagged(new Set());
    setSubmitted(false);
    setShowConfirm(false);
  }, [examId, userId]);

  const items = useMemo(() => {
    const map = new Map<number, ExamItem>();
    for (const q of listeningQs) {
      const no = Number(q?.question_no);
      if (!Number.isFinite(no)) continue;
      map.set(no, {
        globalNo: no,
        section: 'listening',
        question: q,
        content: q?.content_json || {},
        points: topik1QuestionPoints(no),
      });
    }
    for (const q of readingQs) {
      const readingNo = Number(q?.question_no);
      if (!Number.isFinite(readingNo)) continue;
      const globalNo = LISTENING_COUNT + readingNo;
      map.set(globalNo, {
        globalNo,
        section: 'reading',
        question: q,
        content: q?.content_json || {},
        points: topik1QuestionPoints(globalNo),
      });
    }
    return map;
  }, [listeningQs, readingQs]);

  const phase: 'listening' | 'reading' = currentNo <= LISTENING_COUNT ? 'listening' : 'reading';
  const currentItem = items.get(currentNo) ?? null;
  const content = currentItem?.content ?? {};

  // ----- Audio nghe cả đề -----
  const { sections: fullSections, flatLines: fullFlatLines } = useMemo(
    () => buildTimedExamSections(listeningQs, audioDurationMs),
    [listeningQs, audioDurationMs]
  );
  const audioSegments = useMemo(() => buildAudioSegments(listeningQs), [listeningQs]);
  const activeSegmentIndex = useMemo(
    () => pickActiveSegmentIndex(audioSegments, currentTimeMs),
    [audioSegments, currentTimeMs]
  );
  const activeGlobalLine = useMemo(
    () => (phase === 'listening' ? pickActiveGlobalLine(fullFlatLines, currentTimeMs) : null),
    [phase, fullFlatLines, currentTimeMs]
  );
  const fullActiveSectionIndex = activeGlobalLine?.sectionIndex ?? -1;
  const fullActiveLineIndex = activeGlobalLine?.lineIndex ?? -1;

  const seekToMs = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
    setCurrentTimeMs(ms);
  }, []);

  const seekAndPlay = useCallback(
    (ms: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = ms / 1000;
      setCurrentTimeMs(ms);
      void audio.play().catch(() => {});
    },
    []
  );

  const handleTimeUpdate = useCallback((ms: number) => {
    if (isScrubbingRef.current) return;
    setCurrentTimeMs(ms);
  }, []);

  const handleSkipNext = useCallback(() => {
    const next = getNextSegmentOffset(audioSegments, currentTimeMs);
    if (next != null) seekAndPlay(next);
  }, [audioSegments, currentTimeMs, seekAndPlay]);

  const handleSkipPrev = useCallback(() => {
    const prev = getPrevSegmentOffset(audioSegments, currentTimeMs);
    if (prev != null) seekAndPlay(prev);
  }, [audioSegments, currentTimeMs, seekAndPlay]);

  // ----- Điều hướng câu -----
  const goToQuestion = useCallback(
    (no: number) => {
      setCurrentNo(no);
      const it = items.get(no);
      if (it && it.section === 'listening') {
        const off = Number(it.content?.exam_offset_ms);
        if (Number.isFinite(off)) seekToMs(off);
      }
    },
    [items, seekToMs]
  );

  const goPrev = () => goToQuestion(Math.max(1, currentNo - 1));
  const goNext = () => goToQuestion(Math.min(TOTAL_COUNT, currentNo + 1));

  const toggleFlag = (no: number) =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });

  const selectAnswer = (no: number, val: string) =>
    setAnswers((prev) => ({ ...prev, [no]: val }));

  // ----- Nhóm đoạn văn dùng chung (câu Đọc theo cặp) -----
  const sharedPassageGroup = useMemo(() => {
    if (phase !== 'reading' || !currentItem) return [] as number[];
    const passage = String(currentItem.content?.passage ?? '').trim();
    if (!passage) return [];
    const group: number[] = [];
    for (let no = LISTENING_COUNT + 1; no <= TOTAL_COUNT; no++) {
      const it = items.get(no);
      if (it && String(it.content?.passage ?? '').trim() === passage) group.push(no);
    }
    return group.length > 1 ? group : [];
  }, [phase, currentItem, items]);

  // ----- Chấm điểm -----
  const scoreResult = useMemo(() => {
    let listeningScore = 0;
    let readingScore = 0;
    let listeningCorrect = 0;
    let readingCorrect = 0;
    for (let no = 1; no <= TOTAL_COUNT; no++) {
      const it = items.get(no);
      if (!it) continue;
      const correct = resolveCorrectAnswer(it.question?.correct_ans);
      const user = answers[no];
      const isCorrect = isValidMcqAnswer(correct) && user === correct;
      if (it.section === 'listening') {
        if (isCorrect) {
          listeningScore += it.points;
          listeningCorrect += 1;
        }
      } else if (isCorrect) {
        readingScore += it.points;
        readingCorrect += 1;
      }
    }
    return {
      listeningScore,
      readingScore,
      total: listeningScore + readingScore,
      listeningCorrect,
      readingCorrect,
    };
  }, [items, answers]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const handleSubmit = useCallback(() => {
    setShowConfirm(false);
    setSubmitted(true);
    const audio = audioRef.current;
    if (audio) audio.pause();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ====== RENDER ======
  if (!hasAccess) {
    return (
      <div className="practice-card" style={{ padding: 20 }}>
        <p style={{ margin: 0 }}>Cần gói TOPIK I để vào phòng thi thử.</p>
        <button type="button" className="practice-nav-btn" style={{ marginTop: 12 }} onClick={onBack}>
          ← Quay lại
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <ResultScreen
        examTitle={examMeta.title}
        items={items}
        answers={answers}
        result={scoreResult}
        onReview={(no) => {
          setSubmitted(false);
          goToQuestion(no);
        }}
        onBack={onBack}
      />
    );
  }

  const segCount = examMeta.listeningAudioSegmentCount;
  const instr = splitInstruction(content.passage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button type="button" className="practice-nav-btn" onClick={onBack}>
          ← Thoát
        </button>
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          TOPIK I · {sessionLabel} ·{' '}
          {phase === 'listening' ? '듣기 (Câu 1–30)' : '읽기 (Câu 31–70)'}
        </span>
        <ExamCountdown totalSec={TOPIK1_TOTAL_TIME_SEC} onTimeUp={handleSubmit} />
      </div>

      {loading && (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--app-text-muted)', textAlign: 'center' }}>
          Đang tải đề thi…
        </p>
      )}

      {/* Audio + transcript (phần Nghe) */}
      {phase === 'listening' && examMeta.fullAudioUrl && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
              gap: 8,
            }}
          >
            {audioSegments.map((seg) => (
              <button
                key={seg.segmentIndex}
                type="button"
                className={`hanja-hub-chip${
                  seg.segmentIndex === activeSegmentIndex ? ' hanja-hub-chip--active' : ''
                }`}
                style={{ textAlign: 'center' }}
                onClick={() => seekAndPlay(seg.offsetMs)}
              >
                {formatListenQuestionNo(seg.questionNo)}
              </button>
            ))}
          </div>
          <ListenAudioPlayer
            ref={audioRef}
            src={examMeta.fullAudioUrl}
            audioKey={`mock-full-${examId}`}
            playbackRate={playbackRate}
            currentTimeMs={currentTimeMs}
            durationMs={audioDurationMs}
            onSeek={seekToMs}
            onSeekStart={() => {
              isScrubbingRef.current = true;
            }}
            onSeekEnd={() => {
              isScrubbingRef.current = false;
            }}
            onPlaybackRateChange={setPlaybackRate}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={setAudioDurationMs}
            onSkipPrev={handleSkipPrev}
            onSkipNext={handleSkipNext}
            canSkipPrev={getPrevSegmentOffset(audioSegments, currentTimeMs) != null}
            canSkipNext={getNextSegmentOffset(audioSegments, currentTimeMs) != null}
          />
          <TranscriptPanel
            mode="full"
            sections={fullSections}
            activeSectionIndex={fullActiveSectionIndex}
            activeLineIndex={fullActiveLineIndex}
            isLoading={loading || audioDurationMs <= 0}
            subtitle={`${segCount} đoạn audio · ${LISTENING_COUNT} câu hỏi (nghe cả đề)`}
            onLineClick={seekAndPlay}
          />
        </>
      )}

      {/* Khối câu hỏi */}
      {currentItem && (
        <div className="practice-card" style={{ padding: 20, lineHeight: 1.7 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <strong style={{ fontSize: 16 }}>
              Câu {currentNo}
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--app-text-muted)' }}>
                {' '}
                ({currentItem.points}점)
              </span>
            </strong>
            <button
              type="button"
              className={`hanja-hub-chip${flagged.has(currentNo) ? ' hanja-hub-chip--active' : ''}`}
              onClick={() => toggleFlag(currentNo)}
            >
              {flagged.has(currentNo) ? '★ Đã đánh dấu' : '☆ Đánh dấu'}
            </button>
          </div>

          {/* 지시문 */}
          {instr.instruction && (
            <p
              style={{
                margin: '0 0 12px',
                padding: '8px 12px',
                background: 'var(--app-surface-2)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ※ {instr.instruction}
            </p>
          )}
          {instr.example && (
            <div
              style={{
                margin: '0 0 12px',
                padding: '10px 14px',
                border: '1px dashed var(--app-border)',
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 700 }}>〈보기〉</span>
              {'\n'}
              {instr.example}
            </div>
          )}

          {sharedPassageGroup.length > 1 && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--app-purple-text)' }}>
              Câu {sharedPassageGroup[0]}–{sharedPassageGroup[sharedPassageGroup.length - 1]} dùng chung đoạn văn dưới đây.
            </p>
          )}

          {content.image_url && (
            <img
              src={content.image_url}
              alt={`Câu ${currentNo}`}
              style={{ maxWidth: '100%', borderRadius: 8, margin: '0 0 12px', display: 'block' }}
            />
          )}

          {/* Đoạn văn / câu hỏi (phần Đọc) */}
          {phase === 'reading' && content.passage &&
            (String(content.passage).includes('<u>') ? (
              <p
                style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: content.passage }}
              />
            ) : (
              <p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{content.passage}</p>
            ))}
          {phase === 'reading' && content.question && (
            <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{content.question}</p>
          )}

          {/* Đáp án */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(content.options && content.options.length > 0
              ? content.options
              : ['', '', '', '']
            ).map((opt: string, idx: number) => {
              const val = String(idx + 1);
              const isSelected = answers[currentNo] === val;
              return (
                <button
                  key={val}
                  type="button"
                  className={`practice-nav-btn${isSelected ? ' selected' : ''}`}
                  style={{ textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => selectAnswer(currentNo, val)}
                >
                  {opt ? `${idx + 1}. ${opt}` : `Đáp án ${idx + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Điều hướng */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" className="practice-nav-btn" disabled={currentNo === 1} onClick={goPrev}>
          ← Câu trước
        </button>
        {phase === 'listening' ? (
          <button
            type="button"
            className="app-btn-premium-action"
            onClick={() => goToQuestion(LISTENING_COUNT + 1)}
          >
            Sang 읽기 →
          </button>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>
            Đã làm {answeredCount}/{TOTAL_COUNT}
          </span>
        )}
        <button
          type="button"
          className="practice-nav-btn"
          disabled={currentNo >= TOTAL_COUNT}
          onClick={goNext}
        >
          Câu sau →
        </button>
      </div>

      {/* Bảng 70 câu */}
      <QuestionPalette
        currentNo={currentNo}
        answers={answers}
        flagged={flagged}
        onSelect={goToQuestion}
      />

      <button
        type="button"
        className="app-btn-premium-action"
        style={{ marginTop: 4 }}
        onClick={() => setShowConfirm(true)}
      >
        Nộp bài
      </button>

      {showConfirm && (
        <div className="pre-submit-overlay" role="dialog" aria-modal="true">
          <div className="pre-submit-modal practice-card" style={{ padding: 20, maxWidth: 420 }}>
            <h4 style={{ margin: '0 0 8px' }}>Nộp bài thi?</h4>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--app-text-muted)' }}>
              Bạn đã làm <strong>{answeredCount}/{TOTAL_COUNT}</strong> câu
              {answeredCount < TOTAL_COUNT
                ? ` — còn ${TOTAL_COUNT - answeredCount} câu chưa trả lời.`
                : '.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="practice-nav-btn" onClick={() => setShowConfirm(false)}>
                Tiếp tục làm
              </button>
              <button type="button" className="app-btn-premium-action" onClick={handleSubmit}>
                Nộp & xem điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionPalette({
  currentNo,
  answers,
  flagged,
  onSelect,
}: {
  currentNo: number;
  answers: Record<number, string>;
  flagged: Set<number>;
  onSelect: (no: number) => void;
}) {
  const renderGroup = (label: string, from: number, to: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 6 }}>
        {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((no) => {
          const answered = answers[no] != null;
          const isCurrent = no === currentNo;
          const isFlagged = flagged.has(no);
          return (
            <button
              key={no}
              type="button"
              onClick={() => onSelect(no)}
              title={isFlagged ? 'Đã đánh dấu' : undefined}
              style={{
                position: 'relative',
                padding: '8px 0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isCurrent ? 800 : 500,
                cursor: 'pointer',
                border: isCurrent
                  ? '2px solid var(--app-purple-text)'
                  : '1px solid var(--app-border)',
                background: answered ? 'var(--app-purple)' : 'var(--app-surface)',
                color: answered ? '#fff' : 'var(--app-text)',
              }}
            >
              {no}
              {isFlagged && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 4,
                    fontSize: 9,
                    color: answered ? '#fff' : 'var(--app-purple-text)',
                  }}
                >
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="practice-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>Bảng câu hỏi</span>
      {renderGroup('듣기 · Câu 1–30', 1, 30)}
      {renderGroup('읽기 · Câu 31–70', 31, 70)}
    </div>
  );
}

function ResultScreen({
  examTitle,
  items,
  answers,
  result,
  onReview,
  onBack,
}: {
  examTitle: string;
  items: Map<number, ExamItem>;
  answers: Record<number, string>;
  result: {
    listeningScore: number;
    readingScore: number;
    total: number;
    listeningCorrect: number;
    readingCorrect: number;
  };
  onReview: (no: number) => void;
  onBack: () => void;
}) {
  const rows: ExamItem[] = [];
  for (let no = 1; no <= TOTAL_COUNT; no++) {
    const it = items.get(no);
    if (it) rows.push(it);
  }

  const ScoreCard = ({ label, score, correct, total }: { label: string; score: number; correct: number; total: number }) => (
    <div className="practice-card" style={{ padding: 16, textAlign: 'center', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--app-purple-text)' }}>{score}</div>
      <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>
        {correct}/{total} câu đúng
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button type="button" className="practice-nav-btn" onClick={onBack}>
          ← Về danh sách đề
        </button>
        <strong>{examTitle} · Kết quả</strong>
        <span />
      </div>

      <div className="practice-card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>Tổng điểm</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--app-purple-text)' }}>
          {result.total}
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--app-text-muted)' }}> / 200</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <ScoreCard label="듣기 (Nghe)" score={result.listeningScore} correct={result.listeningCorrect} total={30} />
        <ScoreCard label="읽기 (Đọc)" score={result.readingScore} correct={result.readingCorrect} total={40} />
      </div>

      <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700 }}>Chi tiết từng câu</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((it) => {
          const correct = resolveCorrectAnswer(it.question?.correct_ans);
          const user = answers[it.globalNo];
          const isCorrect = isValidMcqAnswer(correct) && user === correct;
          return (
            <div
              key={it.globalNo}
              className="practice-card"
              style={{ padding: '12px 16px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong>
                  Câu {it.globalNo} {isCorrect ? '✅' : '❌'}
                </strong>
                <span style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>
                  Bạn chọn: {user || '—'} · Đáp án: {isValidMcqAnswer(correct) ? correct : '—'} · {it.points}점
                </span>
              </div>
              {it.section === 'listening' && it.content?.audio_url && (
                <audio
                  controls
                  preload="none"
                  src={it.content.audio_url}
                  style={{ width: '100%', marginTop: 8, height: 36 }}
                />
              )}
              {it.question?.explanationVi && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--app-text-muted)' }}>
                  {it.question.explanationVi}
                </p>
              )}
              <button
                type="button"
                className="practice-nav-btn"
                style={{ marginTop: 8 }}
                onClick={() => onReview(it.globalNo)}
              >
                Xem lại câu này →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
