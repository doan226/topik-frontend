import React, { useState, useEffect, useRef, useMemo } from 'react';
import OMRGrid from '../OMRGrid.jsx';
import Timer from '../Timer.jsx';
import ExamRoomSidebar from './ExamRoomSidebar';
import GradingResultPanel from './GradingResultPanel';
import HighlightedTextarea from './HighlightedTextarea';
import WritingMicroGuide from './WritingMicroGuide';
import { apiFetch, apiUrl } from '../api/client';
import { getUserId } from '../utils/userId';
import { useDraftSave, loadDraft, clearDraft } from '../hooks/useDraft';
import { isExpansionQuestion, isOfficialQuestion } from '../utils/questionKey';
import Essay54Hints from './Essay54Hints';
import Question53Chart from './Question53Chart';
import { addMistakesFromGrading } from '../utils/mistakeCards';
import { saveRewriteScore } from '../utils/rewriteScores';
import {
  buildPreSubmitChecklist,
  countKoreanChars,
} from '../utils/wongojiUtils';
import RecentSubmissions from './RecentSubmissions';

/** Wongoji-style timer presets (seconds): Q51/52 ~10ph, Q53 ~10ph, Q54 ~35ph */
const OMR_TIME_LIMITS = {
  51: 600,
  52: 600,
  53: 600,
  54: 2100,
};

export default function ExamRoom({
  user,
  isPremium,
  hasWriting,
  questions,
  showToast,
  onUpgradeClick,
  fixedQuestionType,
  initialTopik,
  onSwitchToTheory,
  requireWizardReview = false,
  wizardStep = 3,
}) {
  const userId = getUserId(user);
  const writingAccess = hasWriting ?? isPremium;
  const [bankMode, setBankMode] = useState('official');
  const [selectedTopik, setSelectedTopik] = useState(initialTopik ?? 35);
  const [selectedExpansion, setSelectedExpansion] = useState(1);
  const [selectedType, setSelectedType] = useState(fixedQuestionType ?? 51);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [lastGradedText, setLastGradedText] = useState('');
  const [viewingHistory, setViewingHistory] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [quota, setQuota] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [rewriteVersion, setRewriteVersion] = useState(0);
  const lastSubmitRef = useRef('');

  const officialQuestions = useMemo(
    () => questions.filter((q) => isOfficialQuestion(q) && q.topik > 0),
    [questions]
  );
  const expansionQuestions = useMemo(
    () => questions.filter((q) => isExpansionQuestion(q)),
    [questions]
  );

  const officialSessions = useMemo(
    () => [...new Set(officialQuestions.map((q) => q.topik))].sort((a, b) => a - b),
    [officialQuestions]
  );

  useEffect(() => {
    if (officialSessions.length > 0 && !officialSessions.includes(selectedTopik)) {
      setSelectedTopik(officialSessions[0]);
    }
  }, [officialSessions, selectedTopik]);

  useEffect(() => {
    if (initialTopik != null && officialSessions.includes(initialTopik)) {
      setSelectedTopik(initialTopik);
    }
  }, [initialTopik, officialSessions]);

  useEffect(() => {
    if (fixedQuestionType != null) {
      setSelectedType(fixedQuestionType);
    }
  }, [fixedQuestionType]);

  const expansionSets = useMemo(
    () => [...new Set(expansionQuestions.map((q) => q.expansionSet))].sort((a, b) => a - b),
    [expansionQuestions]
  );

  const effectiveType = fixedQuestionType ?? selectedType;
  const isBlankQuestion = effectiveType === 51 || effectiveType === 52;

  const currentQuestion = useMemo(() => {
    if (bankMode === 'expansion') {
      return expansionQuestions.find(
        (q) => q.expansionSet === selectedExpansion && q.type === effectiveType
      );
    }
    return officialQuestions.find(
      (q) => q.topik === selectedTopik && q.type === effectiveType
    );
  }, [
    bankMode,
    officialQuestions,
    expansionQuestions,
    selectedTopik,
    selectedExpansion,
    effectiveType,
  ]);

  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || '') : '';

  useDraftSave(userId, currentQuestion?.id, currentAnswer);

  useEffect(() => {
    if (!userId || !currentQuestion) return;
    const saved = loadDraft(userId, currentQuestion.id);
    if (saved) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: saved }));
      setDraftSavedAt(Date.now());
    }
  }, [userId, currentQuestion?.id]);

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/v1/dashboard/quota/${userId}`)
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [userId, gradingResult]);

  useEffect(() => {
    if (currentAnswer && userId) {
      const t = setTimeout(() => setDraftSavedAt(Date.now()), 400);
      return () => clearTimeout(t);
    }
  }, [currentAnswer, userId]);

  const handleTextChange = (e) => {
    if (currentQuestion) {
      setViewingHistory(null);
      setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
    }
  };

  const handleOmrTextChange = (text) => {
    if (currentQuestion) {
      setViewingHistory(null);
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: text }));
    }
  };

  const handleSelectHistory = (item) => {
    setViewingHistory(item);
    let aiData = {};
    try {
      aiData = JSON.parse(item.ai_feedback_json || '{}');
    } catch {
      aiData = {};
    }
    setGradingResult(aiData);
    if (currentQuestion) {
      setAnswers({ ...answers, [currentQuestion.id]: item.content || '' });
    }
    setLastGradedText(item.content || '');
  };

  const preSubmitItems = useMemo(
    () =>
      buildPreSubmitChecklist(
        effectiveType,
        currentAnswer,
        currentQuestion?.prompt
      ),
    [effectiveType, currentAnswer, currentQuestion?.prompt]
  );

  const checklistReady = preSubmitItems.every((item) => item.ok || !item.warn);

  const submitGrading = async () => {
    setIsLoading(true);
    setGradingResult(null);
    setViewingHistory(null);

    const topikSession =
      bankMode === 'expansion' ? 900 + selectedExpansion : selectedTopik;

    try {
      const response = await apiFetch('/api/v1/topik/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: currentAnswer,
          questionNumber: effectiveType,
          userId,
          topikSession,
          questionId: currentQuestion?.id ?? null,
          questionPrompt: currentQuestion?.prompt ?? '',
          referenceAnswer: currentQuestion?.answer ?? '',
        }),
      });

      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('Phản hồi không hợp lệ từ server');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Mất kết nối với server Backend!');
      }

      if (typeof data === 'string') {
        data = JSON.parse(data.replace(/```json/g, '').replace(/```/g, '').trim());
      }

      if (data.quotaExceeded) {
        showToast(data.native_suggestion || 'Đã hết lượt chấm hôm nay.', 'warning');
        if (data.native_suggestion?.includes('PREMIUM')) {
          onUpgradeClick();
        }
        return;
      }

      if (data.apiError) {
        showToast(data.native_suggestion || 'Lỗi kết nối AI. Vui lòng thử lại sau.', 'error');
        setGradingResult(data);
        return;
      }

      setGradingResult(data);
      setLastGradedText(currentAnswer);
      lastSubmitRef.current = currentAnswer;
      clearDraft(userId, currentQuestion.id);
      if (data.grammar_errors?.length) {
        addMistakesFromGrading(userId, data.grammar_errors, effectiveType);
      }
      const maxScore = effectiveType === 51 || effectiveType === 52 ? 10 : effectiveType === 53 ? 30 : 50;
      saveRewriteScore(userId, {
        questionId: String(currentQuestion?.id ?? `${effectiveType}-${topikSession}`),
        questionType: effectiveType,
        version: rewriteVersion + 1,
        score: Number(data.total_score) || 0,
        maxScore,
      });
      showToast('AI đã chấm điểm xong bài làm của bạn!', 'success');

      apiFetch(`/api/v1/dashboard/quota/${userId}`)
        .then((r) => r.json())
        .then(setQuota)
        .catch(() => {});
    } catch (error) {
      console.error('Lỗi kết nối API:', error);
      showToast(`Không thể chấm điểm: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      setShowChecklist(false);
    }
  };

  const handleScoreAI = () => {
    if (!currentAnswer.trim()) {
      showToast('Vui lòng nhập bài làm trước khi nộp chấm điểm!', 'warning');
      return;
    }

    if (effectiveType === 54 && !writingAccess) {
      showToast('Câu 54 cần gói Viết (WRITING). Vui lòng nâng cấp tài khoản.', 'warning');
      onUpgradeClick();
      return;
    }

    if (gradingResult && currentAnswer === lastGradedText) {
      showToast('Bạn chưa sửa bài — hãy chỉnh sửa trước khi chấm lại.', 'info');
      return;
    }

    if (!writingAccess && quota && !quota.canGrade) {
      showToast(
        `FREE: đã dùng ${quota.gradingUsedToday}/${quota.gradingLimitDaily} lượt chấm hôm nay. Nâng cấp gói Viết để 15–20 lượt/ngày.`,
        'warning'
      );
      onUpgradeClick();
      return;
    }

    if (requireWizardReview && wizardStep < 4) {
      showToast('Hoàn thành bước Review trong wizard trước khi chấm AI.', 'warning');
      return;
    }

    setShowChecklist(true);
  };

  const handleRewriteV2 = () => {
    if (!currentQuestion) return;
    const tasks = gradingResult?.rewrite_tasks || [];
    setAnswers({ ...answers, [currentQuestion.id]: '' });
    setGradingResult(null);
    setLastGradedText('');
    setRewriteVersion((v) => v + 1);
    setViewingHistory(null);
    if (tasks.length) {
      showToast(`Viết lại bản 2 — ${tasks.length} nhiệm vụ cần cải thiện`, 'info');
    } else {
      showToast('Bắt đầu viết lại bản 2 — áp dụng gợi ý từ AI', 'info');
    }
  };

  const switchToOfficial = () => {
    setBankMode('official');
    setGradingResult(null);
    setViewingHistory(null);
  };

  const switchToExpansion = () => {
    if (!writingAccess) {
      onUpgradeClick();
      return;
    }
    setBankMode('expansion');
    setGradingResult(null);
    setViewingHistory(null);
  };

  const selectTopik = (topikNum) => {
    setSelectedTopik(topikNum);
    setGradingResult(null);
    setViewingHistory(null);
  };

  const selectExpansion = (setNum) => {
    setSelectedExpansion(setNum);
    setGradingResult(null);
    setViewingHistory(null);
  };

  const canResubmit = !gradingResult || currentAnswer !== lastGradedText;
  const showHighlights = Boolean(gradingResult?.grammar_errors?.length && !viewingHistory);
  const koreanCharCount = countKoreanChars(currentAnswer);
  const rewriteTasks = gradingResult?.rewrite_tasks || [];

  const examTitle = currentQuestion
    ? isExpansionQuestion(currentQuestion)
      ? `Đề mở rộng ${currentQuestion.expansionSet} (luyện thêm)`
      : `TOPIK II lần thứ ${currentQuestion.topik} (제${currentQuestion.topik}회 — đề công bố)`
    : '';

  const sidebarProps = {
    bankMode,
    onSwitchOfficial: switchToOfficial,
    onSwitchExpansion: switchToExpansion,
    isPremium: writingAccess,
    officialSessions,
    selectedTopik,
    onSelectTopik: selectTopik,
    expansionSets,
    selectedExpansion,
    onSelectExpansion: selectExpansion,
    quota,
    userId,
    questionNumber: effectiveType,
    viewingHistoryId: viewingHistory?.id,
    onSelectHistory: handleSelectHistory,
    compact: true,
  };

  const mainContent = currentQuestion ? (
    <>
      {viewingHistory && (
        <p className="exam-room__history-note">
          📖 Đang xem bài đã chấm — chỉnh sửa ô trên để làm bài mới
        </p>
      )}

      <div className="exam-room__prompt-panel">
        {effectiveType === 54 && (
          <Essay54Hints prompt={currentQuestion.prompt} />
        )}
        <div className="exam-room__prompt-header">
          <h3 className="exam-room__prompt-title">
            ▶ {examTitle} — Câu {currentQuestion.type}
          </h3>
          <span className="exam-room__score-badge">
            Điểm tối đa: {currentQuestion.maxScore} điểm
          </span>
        </div>
        {!isExpansionQuestion(currentQuestion) && (
          <p className="exam-room__source">
            Nguồn: đề TOPIK công bố (국립국제교육원 / 기출)
          </p>
        )}
        {currentQuestion.type === 53 ? (
          <Question53Chart
            questionId={currentQuestion.id}
            imageUrl={currentQuestion.imageUrl}
            compact
          />
        ) : null}
        {!(currentQuestion.type === 53 && currentQuestion.imageUrl) && currentQuestion.prompt && (
          <div className={`exam-room__prompt-text${currentQuestion.type === 53 ? ' exam-room__prompt-text--offset' : ''}`}>
            {currentQuestion.prompt}
          </div>
        )}
        {currentQuestion.type !== 53 && currentQuestion.imageUrl && (
          <div className="exam-room__image-wrap">
            <img
              src={apiUrl(currentQuestion.imageUrl)}
              alt="Biểu đồ minh họa"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div className="exam-room__timer">
        <div className="exam-room__timer-label">⏱️ Thời gian làm bài:</div>
        <Timer
          key={currentQuestion.id}
          timeLimit={currentQuestion.timeLimit ?? OMR_TIME_LIMITS[effectiveType] ?? 900}
        />
      </div>

      <WritingMicroGuide questionType={effectiveType} />

      <div className="exam-room__write-block">
        <div className="exam-room__write-header">
          <label className="exam-room__write-label">✏️ Nhập bài làm tiếng Hàn:</label>
          <span className="exam-room__write-meta">
            {draftSavedAt && !viewingHistory && (
              <span className="exam-room__draft-saved">✓ Đã lưu nháp</span>
            )}
            <strong className="exam-room__char-count">{koreanCharCount}</strong> ký tự Hàn
          </span>
        </div>
        {!isBlankQuestion && (
          <HighlightedTextarea
            value={currentAnswer}
            onChange={handleTextChange}
            disabled={isLoading}
            placeholder="Hãy viết câu trả lời bằng tiếng Hàn tại đây..."
            grammarErrors={gradingResult?.grammar_errors}
            showHighlights={showHighlights}
          />
        )}
      </div>

      <OMRGrid
        key={`${currentQuestion.id}-${rewriteVersion}`}
        text={currentAnswer}
        questionType={effectiveType}
        onTextChange={handleOmrTextChange}
        hideMainTextarea={isBlankQuestion}
      />

      <p className="omr-scroll-hint">
        📱 Trên điện thoại: vuốt ngang để xem đủ lưới 원고지
      </p>

      {rewriteTasks.length > 0 && gradingResult && (
        <div className="exam-room__rewrite-banner app-card">
          <h4>✏️ Viết lại bản 2</h4>
          <p className="theme-text-muted" style={{ fontSize: '14px', margin: '0 0 10px' }}>
            AI gợi ý {rewriteTasks.length} việc cần cải thiện:
          </p>
          <ul className="grading-panel__error-list" style={{ marginBottom: '12px' }}>
            {rewriteTasks.map((task, i) => (
              <li key={i}>{typeof task === 'string' ? task : task.task || JSON.stringify(task)}</li>
            ))}
          </ul>
          <button type="button" className="app-btn-primary" onClick={handleRewriteV2}>
            🔄 Viết lại bản 2
          </button>
        </div>
      )}

      <GradingResultPanel
        gradingResult={gradingResult}
        maxScore={currentQuestion.maxScore}
        sampleAnswer={currentQuestion.answer}
        questionType={currentQuestion.type}
        studentText={currentAnswer}
      />

      {showChecklist && (
        <div className="pre-submit-overlay" role="dialog" aria-modal="true">
          <div className="pre-submit-modal app-card">
            <h4>📋 Kiểm tra trước khi chấm AI</h4>
            <ul className="pre-submit-list">
              {preSubmitItems.map((item) => (
                <li
                  key={item.id}
                  className={`pre-submit-item${item.ok ? ' ok' : item.warn ? ' warn' : ''}`}
                >
                  <span>{item.ok ? '✓' : item.warn ? '⚠' : '○'}</span>
                  {item.label}
                </li>
              ))}
            </ul>
            {!checklistReady && (
              <p className="pre-submit-note">
                Một số mục chưa đạt — bạn vẫn có thể nộp, nhưng điểm có thể bị trừ.
              </p>
            )}
            <div className="pre-submit-actions">
              <button type="button" className="practice-nav-btn" onClick={() => setShowChecklist(false)}>
                Quay lại sửa
              </button>
              <button
                type="button"
                className="app-btn-primary"
                onClick={submitGrading}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Đang phân tích...' : '🚀 Xác nhận chấm AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="exam-room__submit-row exam-room__submit-sticky">
        <button
          type="button"
          onClick={handleScoreAI}
          disabled={isLoading || !canResubmit}
          className="app-btn-primary exam-room__submit-btn"
        >
          {isLoading
            ? '⏳ Đang phân tích...'
            : gradingResult && !canResubmit
              ? '✓ Đã chấm — sửa bài để chấm lại'
              : '🚀 Chấm điểm AI'}
        </button>
      </div>
    </>
  ) : (
    <p className="exam-room__error">
      ⚠️ Không thể tải dữ liệu câu hỏi.
    </p>
  );

  return (
    <div className="exam-room">
      {onSwitchToTheory && (
        <p className="exam-room__theory-banner">
          Muốn ôn lý thuyết trước?{' '}
          <button type="button" className="exam-room__theory-link" onClick={onSwitchToTheory}>
            Chuyển sang tab Ôn lý thuyết ↑
          </button>
        </p>
      )}

      {!writingAccess && quota && (
        <p className="exam-room__quota exam-room__quota--free">
          Gói FREE: <strong>{quota.gradingUsedToday}/{quota.gradingLimitDaily}</strong> lượt chấm AI hôm nay.
          {' '}Nâng cấp <strong>gói Viết</strong> để 15–20 lượt/ngày.
        </p>
      )}

      {fixedQuestionType ? (
        <div className="exam-layout">
          <ExamRoomSidebar {...sidebarProps} />
          <div className="exam-main">{mainContent}</div>
        </div>
      ) : (
        <>
          <div className="exam-room__header">
            <div className="exam-bank-row">
              <button
                type="button"
                onClick={switchToOfficial}
                className={`exam-bank-btn exam-bank-btn--official${bankMode === 'official' ? ' active' : ''}`}
              >
                📋 Đề công bố TOPIK
              </button>
              <button
                type="button"
                onClick={switchToExpansion}
                className={`exam-bank-btn exam-bank-btn--expansion${bankMode === 'expansion' ? ' active' : ''}${!writingAccess ? ' locked' : ''}`}
              >
                {writingAccess ? '👑' : '🔒'} Đề mở rộng (Premium)
              </button>
            </div>
            {bankMode === 'official' ? (
              <div className="exam-select-row">
                <span className="exam-select-label">🎯 Chọn kỳ:</span>
                <div className="exam-chip-row">
                  {officialSessions.map((topikNum) => (
                    <button
                      key={topikNum}
                      type="button"
                      onClick={() => selectTopik(topikNum)}
                      className={`exam-chip exam-chip--blue${selectedTopik === topikNum ? ' active' : ''}`}
                    >
                      Kỳ {topikNum}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="exam-select-row">
                <span className="exam-select-label">📚 Mở rộng:</span>
                <div className="exam-chip-row">
                  {expansionSets.map((setNum) => (
                    <button
                      key={setNum}
                      type="button"
                      onClick={() => selectExpansion(setNum)}
                      className={`exam-chip exam-chip--amber${selectedExpansion === setNum ? ' active' : ''}`}
                    >
                      #{setNum}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="exam-select-row">
              <span className="exam-select-label">🧩 Chọn câu:</span>
              <div className="exam-chip-row">
                {[51, 52, 53, 54].map((typeNum) => (
                  <button
                    key={typeNum}
                    type="button"
                    onClick={() => {
                      if (typeNum === 54 && !writingAccess) {
                        onUpgradeClick();
                        return;
                      }
                      setSelectedType(typeNum);
                      setGradingResult(null);
                      setViewingHistory(null);
                    }}
                    className={`exam-chip exam-chip--green${selectedType === typeNum ? ' active' : ''}`}
                  >
                    Câu {typeNum}
                  </button>
                ))}
              </div>
            </div>
            {quota && !writingAccess && (
              <p className="exam-room__quota">
                Lượt chấm AI hôm nay: <strong>{quota.gradingUsedToday}/{quota.gradingLimitDaily}</strong>
              </p>
            )}
          </div>
          <RecentSubmissions
            userId={userId}
            questionNumber={effectiveType}
            selectedId={viewingHistory?.id}
            onSelect={handleSelectHistory}
          />
          {mainContent}
        </>
      )}
    </div>
  );
}
