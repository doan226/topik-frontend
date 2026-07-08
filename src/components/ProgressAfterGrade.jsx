import { useMemo } from 'react';
import { getWritingTabForQuestion } from '../navigation';

const CRITERIA_LABELS = {
  ngu_phap: 'Ngữ pháp',
  tu_vung: 'Từ vựng',
  cau_truc: 'Cấu trúc',
  noi_dung: 'Nội dung',
};

export default function ProgressAfterGrade({
  gradingResult,
  questionType,
  profile,
  onRewrite,
  onNavigate,
  onReviewMistakes,
}) {
  const score = Number(gradingResult?.total_score) || 0;
  const maxScore = questionType === 51 || questionType === 52 ? 10 : questionType === 53 ? 30 : 50;

  const comparison = useMemo(() => {
    const recent = profile?.recentScores?.[String(questionType)] || [];
    if (recent.length < 2) return null;
    const prevScores = recent.slice(0, -1);
    const avg = prevScores.reduce((s, v) => s + v, 0) / prevScores.length;
    const delta = score - avg;
    return { avg: avg.toFixed(1), delta: delta.toFixed(1) };
  }, [profile, questionType, score]);

  const criteriaDelta = useMemo(() => {
    const trends = profile?.criteriaTrends || {};
    const current = gradingResult?.criteria_scores || {};
    return Object.keys(CRITERIA_LABELS)
      .map((key) => {
        const arr = trends[key] || [];
        if (!arr.length || current[key] == null) return null;
        const prevAvg = arr.reduce((s, v) => s + v, 0) / arr.length;
        const delta = Number(current[key]) - prevAvg;
        return { key, label: CRITERIA_LABELS[key], delta };
      })
      .filter(Boolean);
  }, [gradingResult, profile]);

  const newMilestones = (profile?.milestones || []).filter((m) => m.isNew);

  const rewriteTasks = gradingResult?.rewrite_tasks || [];

  return (
    <div className="progress-after-grade app-card">
      <h4 className="progress-after-grade__title">📊 WED theo dõi tiến bộ của bạn</h4>

      {comparison && (
        <p className="progress-after-grade__line">
          So với {profile.recentScores[String(questionType)].length - 1} bài trước (TB {comparison.avg}/{maxScore}):
          {' '}
          <strong style={{ color: Number(comparison.delta) >= 0 ? 'var(--app-success)' : 'var(--app-danger)' }}>
            {Number(comparison.delta) >= 0 ? '+' : ''}{comparison.delta}đ
          </strong>
        </p>
      )}

      {criteriaDelta.length > 0 && (
        <div className="progress-after-grade__criteria">
          {criteriaDelta.map(({ key, label, delta }) => (
            <span key={key} className="progress-after-grade__chip">
              {label} {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          ))}
        </div>
      )}

      {newMilestones.length > 0 && (
        <div className="progress-after-grade__milestones">
          {newMilestones.map((m) => (
            <span key={m.id} className="progress-after-grade__milestone">🎉 {m.label}</span>
          ))}
        </div>
      )}

      <div className="progress-after-grade__actions">
        {rewriteTasks.length > 0 && (
          <button type="button" className="app-btn-primary" onClick={onRewrite}>
            Viết lại ngay ({rewriteTasks.length} việc)
          </button>
        )}
        {(profile?.dueMistakes ?? 0) > 0 && (
          <button type="button" className="qtype-practice-link" onClick={onReviewMistakes}>
            Ôn {profile.dueMistakes} lỗi mới
          </button>
        )}
        <button
          type="button"
          className="qtype-practice-link"
          onClick={() => {
            const tab = getWritingTabForQuestion(profile?.weakestQuestion || questionType);
            if (tab) onNavigate?.(tab, { writingMode: 'omr' });
          }}
        >
          Làm đề tiếp theo →
        </button>
      </div>
    </div>
  );
}
