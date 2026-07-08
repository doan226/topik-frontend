import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAiExplain,
  fetchInteractiveQuestions,
  submitInteractiveAnswer,
} from '../modules/lib/apiClient';
import {
  buildAudioSegments,
  buildTimedExamSections,
  getNextLineMs,
  getNextSegmentOffset,
  getPrevLineMs,
  getPrevSegmentOffset,
  pickActiveGlobalLine,
  pickActiveLineIndex,
  pickActiveSegmentIndex,
  resolveTimedLines,
} from '../modules/lib/transcriptUtils';
import ListenAudioPlayer, { type PlaybackRate } from './ListenAudioPlayer';
import TranscriptPanel from './TranscriptPanel';
import WordLookupPopover from './WordLookupPopover';
import { getExamMeta, formatListenQuestionNo } from '../modules/lib/examMeta';
import { useTextSelectionLookup } from '../hooks/useTextSelectionLookup';
import { isValidMcqAnswer, isMissingOrPlaceholder, isPlaceholderContent, resolveCorrectAnswer } from '../modules/lib/examBankLoader';
import type { ListenMode, ListenSection } from '../utils/listenReadResume';

export interface ListenReadExamRoomProps {
  userId: number | string;
  isPremium: boolean;
  examId: string;
  section: ListenSection;
  listenMode: ListenMode;
  showTranscript: boolean;
  initialIndex?: number;
  showToast?: (msg: string, type?: string) => void;
  onUpgradeClick?: () => void;
  onBack: () => void;
  onResumeUpdate?: (state: {
    examId: string;
    section: ListenSection;
    listenMode: ListenMode;
    showTranscript: boolean;
    currentIndex: number;
  }) => void;
}

export default function ListenReadExamRoom({
  userId,
  isPremium,
  examId,
  section,
  listenMode,
  showTranscript,
  initialIndex = 0,
  showToast,
  onBack,
  onResumeUpdate,
}: ListenReadExamRoomProps) {
  const examMeta = useMemo(() => getExamMeta(examId), [examId]);
  const FULL_AUDIO_URL = examMeta.fullAudioUrl;
  const LISTENING_MCQ_COUNT = examMeta.listeningMcqCount;
  const LISTENING_SEGMENT_COUNT = examMeta.listeningAudioSegmentCount;

  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [explanation, setExplanation] = useState('');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isScrubbingRef = useRef(false);
  const { selectedText, anchor, handleMouseUp, clearSelection } = useTextSelectionLookup();

  useEffect(() => {
    if (!userId) return;
    setLoadingQuestions(true);
    fetchInteractiveQuestions(section, userId, examId)
      .then(setQuestions)
      .finally(() => setLoadingQuestions(false));
    setCurrentIndex(initialIndex);
    setSelected('');
    setSubmitted(false);
    setResult(null);
    setExplanation('');
    setCurrentTimeMs(0);
    setAudioDurationMs(0);
  }, [section, userId, examId, initialIndex]);

  useEffect(() => {
    onResumeUpdate?.({
      examId,
      section,
      listenMode,
      showTranscript,
      currentIndex,
    });
  }, [examId, section, listenMode, showTranscript, currentIndex, onResumeUpdate]);

  const question = questions[currentIndex];
  const content = question?.content_json || {};
  const options: string[] = content.options || [];

  const hasPlaceholderContent = useMemo(() => {
    if (!question) return false;
    const qn = Number(question.question_no ?? currentIndex + 1);
    const hasPassage = !isMissingOrPlaceholder(content.passage);
    const hasQuestion = !isMissingOrPlaceholder(content.question);
    if (section === 'reading') {
      if (!hasPassage && !hasQuestion && !content.image_url) return true;
      if (isPlaceholderContent(content.passage) || isPlaceholderContent(content.question)) return true;
      const opts = Array.isArray(content.options) ? content.options : [];
      if (opts.some((o: unknown) => isMissingOrPlaceholder(o))) return true;
      return false;
    }
    if (isPlaceholderContent(content.passage)) return true;
    if (qn >= 4) {
      const opts = Array.isArray(content.options) ? content.options : [];
      if (opts.length === 0 || opts.every((o: unknown) => isMissingOrPlaceholder(o))) return true;
    }
    return false;
  }, [question, content, section, currentIndex]);

  const answerChoices: string[] =
    options.length > 0
      ? options
      : section === 'listening' && (content.image_url || content.audio_url)
        ? ['', '', '', '']
        : [];

  const singleTimedLines = useMemo(
    () => resolveTimedLines(content.transcript, audioDurationMs),
    [content.transcript, audioDurationMs]
  );

  const { sections: fullSections, flatLines: fullFlatLines } = useMemo(
    () => buildTimedExamSections(questions, audioDurationMs),
    [questions, audioDurationMs]
  );

  const audioSegments = useMemo(() => buildAudioSegments(questions), [questions]);
  const activeSegmentIndex = useMemo(
    () => pickActiveSegmentIndex(audioSegments, currentTimeMs),
    [audioSegments, currentTimeMs]
  );

  const singleActiveLineIndex = useMemo(
    () => pickActiveLineIndex(singleTimedLines, currentTimeMs),
    [singleTimedLines, currentTimeMs]
  );

  const activeGlobalLine = useMemo(
    () => (listenMode === 'full' ? pickActiveGlobalLine(fullFlatLines, currentTimeMs) : null),
    [listenMode, fullFlatLines, currentTimeMs]
  );

  const fullActiveSectionIndex = activeGlobalLine?.sectionIndex ?? -1;
  const fullActiveLineIndex = activeGlobalLine?.lineIndex ?? -1;

  const audioSrc =
    section === 'listening'
      ? listenMode === 'full'
        ? FULL_AUDIO_URL
        : content.audio_url
      : '';

  const audioKey =
    listenMode === 'full'
      ? `full-${examId}-${audioSrc}`
      : `${listenMode}-${question?.id ?? 'single'}-${audioSrc}`;

  const seekToMs = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
    setCurrentTimeMs(ms);
  }, []);

  const seekAndPlay = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
    setCurrentTimeMs(ms);
    void audio.play().catch(() => {});
  }, []);

  const handleTimeUpdate = useCallback((timeMs: number) => {
    if (isScrubbingRef.current) return;
    setCurrentTimeMs(timeMs);
  }, []);

  const handleSeekStart = useCallback(() => {
    isScrubbingRef.current = true;
  }, []);

  const handleSeekEnd = useCallback(() => {
    isScrubbingRef.current = false;
  }, []);

  useEffect(() => {
    setSelected('');
    setSubmitted(false);
    setResult(null);
    setExplanation('');
    setCurrentTimeMs(0);
    setAudioDurationMs(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
  }, [listenMode, audioSrc]);

  useEffect(() => {
    if (listenMode !== 'single') return;
    setSelected('');
    setSubmitted(false);
    setResult(null);
    setExplanation('');
    setCurrentTimeMs(0);
    setAudioDurationMs(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
  }, [currentIndex, listenMode, audioSrc]);

  useEffect(() => {
    if (listenMode !== 'full' || !activeGlobalLine || questions.length === 0) return;
    const idx = questions.findIndex((q) => String(q.question_no) === activeGlobalLine.questionNo);
    if (idx >= 0) setCurrentIndex((prev) => (prev === idx ? prev : idx));
  }, [activeGlobalLine?.questionNo, listenMode, questions]);

  const handleSkipNext = useCallback(() => {
    if (listenMode === 'single') {
      const next = getNextLineMs(singleTimedLines, currentTimeMs);
      if (next != null) seekToMs(next);
      return;
    }
    const next = getNextSegmentOffset(audioSegments, currentTimeMs);
    if (next != null) seekAndPlay(next);
  }, [listenMode, singleTimedLines, audioSegments, currentTimeMs, seekToMs, seekAndPlay]);

  const handleSkipPrev = useCallback(() => {
    if (listenMode === 'single') {
      const prev = getPrevLineMs(singleTimedLines, currentTimeMs);
      if (prev != null) seekToMs(prev);
      return;
    }
    const prev = getPrevSegmentOffset(audioSegments, currentTimeMs);
    if (prev != null) seekAndPlay(prev);
  }, [listenMode, singleTimedLines, audioSegments, currentTimeMs, seekToMs, seekAndPlay]);

  const canSkipNext = useMemo(() => {
    if (listenMode === 'single') return getNextLineMs(singleTimedLines, currentTimeMs) != null;
    return getNextSegmentOffset(audioSegments, currentTimeMs) != null;
  }, [listenMode, singleTimedLines, audioSegments, currentTimeMs]);

  const canSkipPrev = useMemo(() => {
    if (listenMode === 'single') return getPrevLineMs(singleTimedLines, currentTimeMs) != null;
    return getPrevSegmentOffset(audioSegments, currentTimeMs) != null;
  }, [listenMode, singleTimedLines, audioSegments, currentTimeMs]);

  const handleSubmit = async () => {
    if (!question || !selected) return;

    if (hasPlaceholderContent) {
      showToast?.('Câu này đang cập nhật nội dung — chưa chấm được.', 'info');
      return;
    }

    const correctAnswer = resolveCorrectAnswer(question.correct_ans);
    if (isValidMcqAnswer(correctAnswer)) {
      const isCorrect = selected.trim() === correctAnswer;
      setSubmitted(true);
      setResult({ isCorrect, correctAnswer });
      showToast?.(isCorrect ? 'Chính xác!' : 'Chưa đúng', isCorrect ? 'success' : 'info');

      if (typeof question.id === 'number') {
        submitInteractiveAnswer(userId, question.id, selected).catch(() => {});
      }
      return;
    }

    if (typeof question.id === 'string' && String(question.id).startsWith('bank-')) {
      showToast?.('Câu này chưa có đáp án — đang cập nhật.', 'info');
      return;
    }

    const { ok, data } = await submitInteractiveAnswer(userId, question.id, selected);
    if (!ok) {
      showToast?.(data?.message || 'Nộp bài thất bại', 'error');
      return;
    }
    setSubmitted(true);
    setResult(data);
    showToast?.(data.isCorrect ? 'Chính xác!' : 'Chưa đúng', data.isCorrect ? 'success' : 'info');
  };

  const handleExplain = async () => {
    if (!question) return;
    if (hasPlaceholderContent) {
      showToast?.('Nội dung placeholder — chưa dùng được giải thích.', 'info');
      return;
    }

    if (question.explanationVi) {
      let text = question.explanationVi;
      const notes = question.distractorNotes;
      if (notes && selected) {
        const note = notes[selected.trim()];
        if (note) text += `\n\nĐáp án ${selected}: ${note}`;
      }
      setExplanation(text);
      showToast?.('Giải thích từ JSON — không tốn lượt AI.', 'success');
      return;
    }

    const distractorText = question.distractorNotes
      ? JSON.stringify(question.distractorNotes)
      : '';
    const { ok, data } = await fetchAiExplain({
      passage: content.passage || '',
      question: 'Chọn đáp án đúng',
      userAnswer: selected,
      correctAnswer: question.correct_ans || result?.correctAnswer || '',
      distractorNotes: distractorText,
    });
    if (ok && data.explanation) {
      setExplanation(String(data.explanation));
      if (data.source === 'gemini') {
        showToast?.('Giải thích bổ sung từ AI.', 'info');
      }
    } else if (data?.quotaExceeded) {
      showToast?.(data.message || 'Đã hết lượt giải thích AI hôm nay.', 'warning');
    }
  };

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
  const questionLabel = formatListenQuestionNo(String(question?.question_no ?? currentIndex + 1));
  const questionNo = String(question?.question_no ?? currentIndex + 1);

  const lookupContext = {
    examId,
    section,
    questionNo,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="practice-nav-btn" onClick={onBack}>
          ← Quay lại
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--app-text-muted)' }}>
          {examMeta.title} · {section === 'listening' ? 'Nghe' : 'Đọc'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>
          Bôi đen từ để tra &amp; lưu
        </span>
      </div>

      {loadingQuestions && (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--app-text-muted)', textAlign: 'center' }}>
          Đang tải đề {section === 'listening' ? 'nghe' : 'đọc'}…
        </p>
      )}

      {!loadingQuestions && questions.length === 0 && (
        <p style={{ margin: 0, fontSize: 14, color: '#dc2626', textAlign: 'center', padding: '16px' }}>
          Không tải được câu hỏi cho <strong>{examMeta.title}</strong>.
        </p>
      )}

      {((section === 'listening' && listenMode === 'single') || section === 'reading') &&
        questions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                gap: 8,
              }}
            >
              {questions.map((q, idx) => (
                <button
                  key={q?.id ?? idx}
                  type="button"
                  className={`hanja-hub-chip${idx === currentIndex ? ' hanja-hub-chip--active' : ''}`}
                  style={{ textAlign: 'center' }}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {section === 'reading'
                    ? String(q?.question_no ?? idx + 1)
                    : formatListenQuestionNo(String(q?.question_no ?? idx + 1))}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button type="button" className="practice-nav-btn" disabled={currentIndex === 0} onClick={goPrev}>
                {section === 'reading' ? '← Câu trước' : '← Đoạn trước'}
              </button>
              <span style={{ fontSize: 14, color: 'var(--app-text-muted)', textAlign: 'center' }}>
                Câu {questionLabel}
                <br />
                <span style={{ fontSize: 12 }}>
                  {section === 'reading'
                    ? `Câu ${currentIndex + 1}/${questions.length}`
                    : `Đoạn ${currentIndex + 1}/${questions.length} · ${LISTENING_MCQ_COUNT} câu`}
                </span>
              </span>
              <button
                type="button"
                className="practice-nav-btn"
                disabled={currentIndex >= questions.length - 1}
                onClick={goNext}
              >
                {section === 'reading' ? 'Câu sau →' : 'Đoạn sau →'}
              </button>
            </div>
          </div>
        )}

      {section === 'listening' && listenMode === 'full' && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
              gap: 8,
            }}
          >
            {audioSegments.map((seg) => (
              <button
                key={seg.segmentIndex}
                type="button"
                className={`hanja-hub-chip${seg.segmentIndex === activeSegmentIndex ? ' hanja-hub-chip--active' : ''}`}
                style={{ textAlign: 'center' }}
                onClick={() => seekAndPlay(seg.offsetMs)}
              >
                {formatListenQuestionNo(seg.questionNo)}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--app-text-muted)', textAlign: 'center' }}>
            Đoạn {activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : 1}/{LISTENING_SEGMENT_COUNT} ·{' '}
            {LISTENING_MCQ_COUNT} câu hỏi
          </p>
        </div>
      )}

      {section === 'listening' && audioSrc && (
        <ListenAudioPlayer
          ref={audioRef}
          src={audioSrc}
          audioKey={audioKey}
          playbackRate={playbackRate}
          currentTimeMs={currentTimeMs}
          durationMs={audioDurationMs}
          onSeek={seekToMs}
          onSeekStart={handleSeekStart}
          onSeekEnd={handleSeekEnd}
          onPlaybackRateChange={setPlaybackRate}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={setAudioDurationMs}
          onSkipPrev={handleSkipPrev}
          onSkipNext={handleSkipNext}
          canSkipPrev={canSkipPrev}
          canSkipNext={canSkipNext}
        />
      )}

      {section === 'listening' && showTranscript && listenMode === 'single' && (
        <TranscriptPanel
          mode="single"
          lines={singleTimedLines}
          activeLineIndex={singleActiveLineIndex}
          isLoading={loadingQuestions || !question || audioDurationMs <= 0}
          onLineClick={seekAndPlay}
          onTextMouseUp={handleMouseUp}
        />
      )}

      {section === 'listening' && showTranscript && listenMode === 'full' && (
        <TranscriptPanel
          mode="full"
          sections={fullSections}
          activeSectionIndex={fullActiveSectionIndex}
          activeLineIndex={fullActiveLineIndex}
          isLoading={loadingQuestions || audioDurationMs <= 0}
          subtitle={`${LISTENING_SEGMENT_COUNT} đoạn audio · ${LISTENING_MCQ_COUNT} câu hỏi`}
          onLineClick={seekAndPlay}
          onTextMouseUp={handleMouseUp}
        />
      )}

      {(listenMode === 'single' || section === 'reading') && (
        <>
          {hasPlaceholderContent && (
            <div
              className="practice-card"
              style={{
                padding: 12,
                borderColor: 'var(--app-warning, #c9a227)',
                background: 'rgba(201, 162, 39, 0.08)',
              }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>
                Nội dung câu này đang được cập nhật (placeholder). Bạn vẫn nghe/đọc được; chấm điểm và AI
                giải thích tạm khóa.
              </p>
            </div>
          )}

          <div
            className="practice-card"
            style={{ padding: 20, lineHeight: 1.7, cursor: 'text' }}
            onMouseUp={handleMouseUp}
          >
            {content.image_url && (
              <img
                src={content.image_url}
                alt={`Câu ${questionLabel}`}
                style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12, display: 'block' }}
              />
            )}
            {content.passage &&
              (content.passage.includes('<u>') ? (
                <p
                  style={{ margin: 0, whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: content.passage }}
                />
              ) : (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{content.passage}</p>
              ))}
            {section === 'reading' && content.question && (
              <p style={{ margin: content.passage ? '12px 0 0' : 0, fontWeight: 600 }}>{content.question}</p>
            )}
            {!content.image_url && !content.passage && !content.question && (
              <p style={{ margin: 0 }}>
                {questions.length === 0 ? 'Đang tải đề...' : 'Không có nội dung câu hỏi.'}
              </p>
            )}
          </div>

          {answerChoices.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {answerChoices.map((opt, idx) => {
                const val = String(idx + 1);
                let cls = 'practice-nav-btn';
                if (submitted && val === (result?.correctAnswer || question?.correct_ans)) cls += ' correct';
                else if (submitted && val === selected) cls += ' wrong';
                else if (selected === val) cls += ' selected';
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={submitted}
                    className={cls}
                    style={{ textAlign: 'left', padding: '12px 16px' }}
                    onClick={() => setSelected(val)}
                  >
                    {opt ? `${idx + 1}. ${opt}` : `Đáp án ${idx + 1}`}
                  </button>
                );
              })}
            </div>
          )}

          {!submitted && selected && !hasPlaceholderContent && (
            <button type="button" className="app-btn-premium-action" onClick={handleSubmit}>
              Nộp bài chấm điểm
            </button>
          )}

          {submitted && (
            <div className="practice-card" style={{ padding: 16 }}>
              <p style={{ margin: '0 0 8px' }}>
                {result?.isCorrect ? '✅ Đúng' : '❌ Sai'} — Đáp án: {result?.correctAnswer || 'Chưa cập nhật'}
              </p>
              <button type="button" className="practice-nav-btn" onClick={handleExplain}>
                Giải thích AI
              </button>
              {explanation && (
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, fontSize: 13 }}>{explanation}</pre>
              )}
            </div>
          )}
        </>
      )}

      {selectedText && anchor && (
        <WordLookupPopover
          word={selectedText}
          anchor={anchor}
          context={lookupContext}
          userId={userId}
          showToast={showToast}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
