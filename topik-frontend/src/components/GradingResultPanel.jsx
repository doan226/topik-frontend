import React, { useState } from 'react';
import exportEssayImage from '../utils/exportEssayImage';

const TABS = [
  { id: 'score', label: 'Điểm' },
  { id: 'content', label: 'Nội dung' },
  { id: 'structure', label: 'Cấu trúc' },
  { id: 'language', label: 'Ngôn ngữ' },
];

function CriteriaBar({ label, score, maxPerCriterion }) {
  const pct = maxPerCriterion > 0 ? Math.min(100, (score / maxPerCriterion) * 100) : 0;
  return (
    <div className="grading-criteria-row">
      <div className="grading-criteria-label">
        <span>{label.replace(/_/g, ' ')}</span>
        <strong>{score} điểm</strong>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: pct >= 50 ? 'var(--app-success)' : 'var(--app-warning)',
          }}
        />
      </div>
    </div>
  );
}

function CompareColumns({ leftLabel, leftText, rightLabel, rightText }) {
  if (!leftText && !rightText) return null;
  return (
    <div className="grading-compare">
      <div className="grading-compare__col">
        <h6 className="grading-compare__label">{leftLabel}</h6>
        <div className="grading-compare__box">{leftText || '—'}</div>
      </div>
      <div className="grading-compare__col">
        <h6 className="grading-compare__label">{rightLabel}</h6>
        <div className="grading-compare__box grading-compare__box--sample">
          {rightText || '—'}
        </div>
      </div>
    </div>
  );
}

function getCriteriaKeysForTab(tabId, questionType) {
  const criteria = {
    score: [],
    content: [],
    structure: [],
    language: [],
  };

  if (questionType === 51 || questionType === 52) {
    criteria.content = ['ý_nghĩa_ngữ_cảnh'];
    criteria.language = ['ngữ_pháp_và_từ_vựng'];
  } else {
    criteria.content = ['nội_dung'];
    criteria.structure = ['tổ_chức'];
    criteria.language = ['ngôn_ngữ'];
  }

  return criteria[tabId] || [];
}

export function highlightErrors(text, grammarErrors) {
  if (!text || !grammarErrors?.length) return [{ text, highlight: false }];
  const segments = [];
  let remaining = text;
  const sorted = [...grammarErrors]
    .filter((e) => e.sai)
    .sort((a, b) => b.sai.length - a.sai.length);

  for (const err of sorted) {
    const idx = remaining.indexOf(err.sai);
    if (idx === -1) continue;
    if (idx > 0) segments.push({ text: remaining.slice(0, idx), highlight: false });
    segments.push({ text: err.sai, highlight: true, reason: err.lý_do });
    remaining = remaining.slice(idx + err.sai.length);
  }
  if (remaining) segments.push({ text: remaining, highlight: false });
  return segments.length ? segments : [{ text, highlight: false }];
}

export default function GradingResultPanel({
  gradingResult,
  maxScore,
  sampleAnswer,
  questionType,
  studentText,
}) {
  const [activeTab, setActiveTab] = useState('score');

  if (!gradingResult) return null;

  const criteria = gradingResult.criteria_scores || {};
  const criteriaCount = Object.keys(criteria).length;
  const maxPerCriterion = criteriaCount > 0 ? maxScore / criteriaCount : maxScore;
  const structureMap = gradingResult.structure_map || {};
  const modelPhrases = gradingResult.model_phrases_to_learn || [];
  const rewriteTasks = gradingResult.rewrite_tasks || [];
  const compareRight = gradingResult.native_suggestion || sampleAnswer || '';

  const renderCriteriaForTab = (tabId) => {
    const keys = getCriteriaKeysForTab(tabId, questionType);
    const entries = keys
      .filter((k) => criteria[k] != null)
      .map((k) => [k, criteria[k]]);
    if (!entries.length) return null;
    return (
      <div className="grading-panel__rubric">
        {entries.map(([key, val]) => (
          <CriteriaBar key={key} label={key} score={Number(val)} maxPerCriterion={maxPerCriterion} />
        ))}
      </div>
    );
  };

  return (
    <div className="grading-panel">
      <h4 className="grading-panel__title">🤖 Kết quả chấm điểm từ AI:</h4>

      <div className="grading-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`grading-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'score' && (
        <div className="grading-tab-panel">
          <p className="grading-panel__score">
            Điểm số đạt được:{' '}
            <strong className="grading-panel__score-value">{gradingResult.total_score || 0}</strong> / {maxScore} điểm
          </p>
          {gradingResult.estimated_level && (
            <p className="grading-panel__level">
              Trình độ ước lượng: <strong>{gradingResult.estimated_level}</strong>
            </p>
          )}
          {gradingResult.score_justification && (
            <p className="grading-panel__justification">
              <strong>📋 Giải thích điểm:</strong> {gradingResult.score_justification}
            </p>
          )}
          {criteriaCount > 0 && (
            <div className="grading-panel__rubric">
              <h5 className="grading-panel__rubric-title">📊 Rubric theo tiêu chí</h5>
              {Object.entries(criteria).map(([key, val]) => (
                <CriteriaBar key={key} label={key} score={Number(val)} maxPerCriterion={maxPerCriterion} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'content' && (
        <div className="grading-tab-panel">
          {renderCriteriaForTab('content')}
          {gradingResult.content_issues?.length > 0 ? (
            <div style={{ marginBottom: '15px' }}>
              <h5 className="grading-panel__section-title grading-panel__section-title--warning">
                ⚠️ Lỗi nội dung / số liệu:
              </h5>
              <ul className="grading-panel__error-list">
                {gradingResult.content_issues.map((issue, i) => (
                  <li key={i} style={{ marginBottom: '6px', lineHeight: 1.5 }}>
                    <strong>{issue.vấn_đề}</strong>
                    {issue.gợi_ý && (
                      <>
                        <br />
                        <span className="theme-text-muted" style={{ fontSize: '14px' }}>→ {issue.gợi_ý}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="theme-text-muted" style={{ fontSize: '14px' }}>Không phát hiện lỗi nội dung.</p>
          )}
          <CompareColumns
            leftLabel="Bài của bạn"
            leftText={studentText}
            rightLabel="Bài mẫu / Gợi ý"
            rightText={compareRight}
          />
        </div>
      )}

      {activeTab === 'structure' && (
        <div className="grading-tab-panel">
          {renderCriteriaForTab('structure')}
          {Object.keys(structureMap).length > 0 && (
            <div className="grading-structure-map">
              <h5 className="grading-panel__section-title">📐 Cấu trúc bài</h5>
              {Object.entries(structureMap).map(([part, desc]) => (
                <div key={part} className="grading-structure-row">
                  <strong>{part.replace(/_/g, ' ')}</strong>
                  <span>{typeof desc === 'string' ? desc : JSON.stringify(desc)}</span>
                </div>
              ))}
            </div>
          )}
          {rewriteTasks.length > 0 && (
            <div className="grading-rewrite-tasks">
              <h5 className="grading-panel__section-title">✏️ Nhiệm vụ viết lại</h5>
              <ul className="grading-panel__error-list">
                {rewriteTasks.map((task, i) => (
                  <li key={i}>{typeof task === 'string' ? task : task.task || JSON.stringify(task)}</li>
                ))}
              </ul>
            </div>
          )}
          {!Object.keys(structureMap).length && !rewriteTasks.length && (
            <p className="theme-text-muted" style={{ fontSize: '14px' }}>
              Chưa có phân tích cấu trúc chi tiết từ AI.
            </p>
          )}
        </div>
      )}

      {activeTab === 'language' && (
        <div className="grading-tab-panel">
          {renderCriteriaForTab('language')}
          {gradingResult.grammar_errors?.length > 0 ? (
            <div style={{ marginBottom: '15px' }}>
              <h5 className="grading-panel__section-title grading-panel__section-title--error">
                ❌ Lỗi ngữ pháp phát hiện:
              </h5>
              <ul className="grading-panel__error-list">
                {gradingResult.grammar_errors.map((err, i) => (
                  <li key={i}>
                    {err.mức_độ && (
                      <span
                        className={`grading-severity ${err.mức_độ === 'nặng' ? 'grading-severity--heavy' : 'grading-severity--light'}`}
                      >
                        {err.mức_độ}
                      </span>
                    )}
                    <del className="theme-text-danger">{err.sai}</del> ➡️{' '}
                    <strong className="theme-text-success">{err.đúng}</strong>
                    <br />
                    <span className="theme-text-muted" style={{ fontSize: '14px' }}>({err.lý_do})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="theme-text-muted" style={{ fontSize: '14px' }}>Không phát hiện lỗi ngữ pháp.</p>
          )}
          {modelPhrases.length > 0 && (
            <div className="grading-model-phrases">
              <h5 className="grading-panel__section-title">📚 Cụm từ nên học</h5>
              <ul className="grading-panel__error-list">
                {modelPhrases.map((phrase, i) => (
                  <li key={i}>
                    <strong>{typeof phrase === 'string' ? phrase : phrase.ko || phrase.phrase}</strong>
                    {phrase.vi && <span className="theme-text-muted"> — {phrase.vi}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sampleAnswer && activeTab !== 'content' && (
        <div style={{ marginTop: '12px' }}>
          <details className="grading-panel__sample-details">
            <summary className="grading-panel__sample-btn">
              📖 Xem gợi ý đề (đáp án mẫu)
            </summary>
            <div className="grading-panel__sample-box">
              <strong>Câu {questionType} — Gợi ý:</strong>
              {'\n'}
              {sampleAnswer}
            </div>
          </details>
        </div>
      )}

      {studentText && (questionType === 53 || questionType === 54) && (
        <button
          type="button"
          className="grading-panel__sample-btn"
          style={{ marginTop: 12 }}
          onClick={() =>
            exportEssayImage({
              studentText,
              totalScore: gradingResult.total_score || 0,
              maxScore,
              questionType,
              filename: `topik-q${questionType}-${Date.now()}.png`,
            })
          }
        >
          📥 Xuất ảnh bài viết + điểm
        </button>
      )}
    </div>
  );
}
