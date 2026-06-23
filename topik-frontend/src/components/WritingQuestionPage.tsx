import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from './PageHeader';
import PatternPractice from './PatternPractice';
import Chart53Practice from './Chart53Practice';
import Essay54Practice from './Essay54Practice';
import Essay54Wizard from './Essay54Wizard';
import ExamRoom from './ExamRoom';
import type { QuestionType, WritingMode } from '../navigation';
import { WRITING_TAB_META, getWritingTabForQuestion } from '../navigation';

interface WritingQuestionPageProps {
  questionType: QuestionType;
  user: any;
  isPremium: boolean;
  hasWriting?: boolean;
  questions: any[];
  showToast: (msg: string, type?: string) => void;
  onUpgradeClick: () => void;
  initialMode?: WritingMode;
  initialTopik?: number;
  onShowHelp?: () => void;
}

export default function WritingQuestionPage({
  questionType,
  user,
  isPremium,
  hasWriting,
  questions,
  showToast,
  onUpgradeClick,
  initialMode = 'theory',
  initialTopik,
  onShowHelp,
}: WritingQuestionPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<WritingMode>(initialMode);
  const [wizardStep, setWizardStep] = useState(1);
  const tabId = getWritingTabForQuestion(questionType);
  const meta = tabId ? WRITING_TAB_META[tabId] : null;

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode, questionType]);

  const goMode = (next: WritingMode) => {
    setMode(next);
    navigate(next === 'omr' ? `/writing/${questionType}/omr` : `/writing/${questionType}`);
  };

  if (!meta) return null;

  const userId = user?.userId ?? user?.id ?? 1;
  const writingAccess = hasWriting ?? isPremium;

  const examRoom = (
    <ExamRoom
      user={user}
      isPremium={isPremium}
      hasWriting={writingAccess}
      questions={questions}
      showToast={showToast}
      onUpgradeClick={onUpgradeClick}
      fixedQuestionType={questionType}
      initialTopik={initialTopik}
      onSwitchToTheory={() => goMode('theory')}
      requireWizardReview={questionType === 54}
      wizardStep={wizardStep}
    />
  );

  return (
    <>
      <div className="writing-page-header-row">
        <PageHeader title={meta.title} highlight={meta.highlight} subtitle={meta.subtitle} />
        {onShowHelp && (
          <button type="button" className="writing-help-btn" onClick={onShowHelp} title="Hướng dẫn">
            ?
          </button>
        )}
      </div>

      <div className="sub-tabs">
        <button
          type="button"
          className={`sub-tab${mode === 'theory' ? ' active' : ''}`}
          onClick={() => goMode('theory')}
        >
          📚 Ôn lý thuyết
        </button>
        <button
          type="button"
          className={`sub-tab${mode === 'omr' ? ' active' : ''}`}
          onClick={() => goMode('omr')}
        >
          ✍️ Làm đề OMR
        </button>
      </div>

      <div className={mode === 'theory' ? '' : 'exam-mode-hidden'} aria-hidden={mode !== 'theory'}>
        {(questionType === 51 || questionType === 52) && (
          <PatternPractice
            questionType={questionType}
            showToast={showToast}
            userId={userId}
            isPremium={writingAccess}
            onUpgradeClick={onUpgradeClick}
          />
        )}
        {questionType === 53 && (
          <Chart53Practice
            questions={questions}
            userId={userId}
            isPremium={writingAccess}
            onUpgradeClick={onUpgradeClick}
          />
        )}
        {questionType === 54 && (
          <Essay54Practice
            showToast={showToast}
            userId={userId}
            isPremium={writingAccess}
            onUpgradeClick={onUpgradeClick}
          />
        )}
      </div>

      <div className={mode === 'omr' ? '' : 'exam-mode-hidden'} aria-hidden={mode !== 'omr'}>
        {questionType === 54 ? (
          <Essay54Wizard onStepChange={setWizardStep}>
            {examRoom}
          </Essay54Wizard>
        ) : (
          examRoom
        )}
      </div>
    </>
  );
}
