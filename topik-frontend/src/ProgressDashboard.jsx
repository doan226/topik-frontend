import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { apiFetch } from './api/client';
import MistakeCardsPanel from './components/MistakeCardsPanel';
import { listRewriteComparisons } from './utils/rewriteScores';
import { useTheme } from './hooks/useTheme';
import { getChartColors } from './utils/theme';
import { getHanjaStats, getAccessibleCharacters, getPackProgress, hanjaPacks, TOPIK100_PACK_ID, canAccessPack, isPackAccessPremium } from './utils/hanjaData';
import { loadSrsState, getSrsSummary, syncSrsFromServer } from './utils/hanjaSrs';
import { loadLocalUnlockedPacks } from './utils/hanjaPackUnlockStorage';
import PageHeader from './components/PageHeader';
import { getWritingTabForQuestion } from './navigation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const QUESTION_TYPES = [
  { num: 51, label: 'Câu 51', desc: 'Điền từ — ngữ pháp cơ bản', maxScore: 10, tab: 'writing51', badge: 'q51' },
  { num: 52, label: 'Câu 52', desc: 'Điền từ — từ vựng & ngữ cảnh', maxScore: 10, tab: 'writing52', badge: 'q52' },
  { num: 53, label: 'Câu 53', desc: 'Viết đoạn văn mô tả biểu đồ', maxScore: 30, tab: 'writing53', badge: 'q53' },
  { num: 54, label: 'Câu 54', desc: 'Viết luận — ý kiến cá nhân', maxScore: 50, tab: 'writing54', badge: 'q54' },
];

function getWeakestQuestionNum(profile, allHistory) {
  if (profile?.weakestQuestion) return profile.weakestQuestion;
  if (!allHistory?.length) return 51;
  let weakest = 51;
  let minAvg = Infinity;
  for (const qt of QUESTION_TYPES) {
    const items = allHistory.filter((i) => Number(i.question_number) === qt.num);
    if (!items.length) return qt.num;
    const avg = items.reduce((s, i) => s + (i.aiData?.total_score || 0), 0) / items.length;
    const ratio = avg / qt.maxScore;
    if (ratio < minAvg) {
      minAvg = ratio;
      weakest = qt.num;
    }
  }
  return weakest;
}

function MiniTestQuestion({ test, index, answers, setAnswers, revealed, setRevealed }) {
  const key = `q${index}`;
  const selected = answers[key];
  const correctIdx = test.options.findIndex(
    (o) => o.startsWith(test.correct_answer?.charAt(0)) || o.includes(test.correct_answer)
  );
  const correct = correctIdx >= 0 ? correctIdx : 0;

  const pick = (idx) => {
    if (revealed[key]) return;
    setAnswers({ ...answers, [key]: idx });
    setRevealed({ ...revealed, [key]: true });
  };

  return (
    <div className="mini-q">
      <p className="mini-q-text">Q{index + 1}: {test.question}</p>
      <div className="mini-q-options">
        {test.options.map((opt, i) => {
          let cls = 'mini-q-opt';
          if (revealed[key]) {
            if (i === correct) cls += ' correct';
            else if (i === selected) cls += ' wrong';
          } else if (selected === i) {
            cls += ' selected';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={revealed[key]}
              onClick={() => pick(i)}
              className={cls}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed[key] && (
        <div className="mini-q-explain">
          <strong>Giải thích:</strong> {test.explanation}
        </div>
      )}
    </div>
  );
}

export default function ProgressDashboard({
  userId,
  isPremium,
  hasHanja,
  profile,
  showToast,
  onUpgradeClick,
  onNavigate,
}) {
  const [allHistory, setAllHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState(51);
  const [viewMode, setViewMode] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [miniTest, setMiniTest] = useState(null);
  const [miniAnswers, setMiniAnswers] = useState({});
  const [miniRevealed, setMiniRevealed] = useState({});
  const [quota, setQuota] = useState(null);
  const learningPath = profile
    ? {
        recommendation: profile.recommendation,
        weeklyGoal: profile.weeklyGoal,
        progress: profile.weeklyProgress,
      }
    : null;
  const [srsTick, setSrsTick] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        await syncSrsFromServer(userId);
        if (!cancelled) setSrsTick((n) => n + 1);
      } catch {
        /* offline — keep local cache */
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/v1/dashboard/${userId}`);
        if (!response.ok) throw new Error('Không thể đồng bộ dữ liệu từ máy chủ.');

        const data = await response.json();
        const processedData = data.map((item) => {
          let aiData = { total_score: 0, grammar_errors: [] };
          try {
            aiData = JSON.parse(item.ai_feedback_json || '{}');
          } catch (e) {
            console.error('Lỗi cấu trúc JSON', e);
          }
          return { ...item, aiData };
        });
        setAllHistory(processedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchHistory();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/v1/dashboard/quota/${userId}`)
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, [userId, miniTest, profile]);

  const filteredHistory = allHistory.filter((item) => Number(item.question_number) === activeSubTab);
  const rewriteComparisons = useMemo(
    () => listRewriteComparisons(userId, activeSubTab),
    [userId, activeSubTab, allHistory]
  );
  const currentErrors = filteredHistory.flatMap((item) => item.aiData.grammar_errors || []);
  const chartData = [...filteredHistory].slice(0, 10).reverse();
  const maxScoreForType = activeSubTab === 51 || activeSubTab === 52 ? 10 : activeSubTab === 53 ? 30 : 50;
  const avgScore =
    filteredHistory.length > 0
      ? (
          filteredHistory.reduce((sum, item) => sum + (item.aiData.total_score || 0), 0) /
          filteredHistory.length
        ).toFixed(1)
      : 0;

  const totalSubmissions = allHistory.length;

  const hanjaProgress = useMemo(() => {
    const unlockedPackIds = loadLocalUnlockedPacks(userId);
    const accessCtx = { hasHanja: hasHanja ?? isPremium, isPremium, unlockedPackIds };
    const accessible = getAccessibleCharacters(accessCtx);
    const charIds = accessible.map((c) => c.id);
    const srsState = loadSrsState(userId);
    const summary = getSrsSummary(userId, charIds);
    const topik100 = getPackProgress(TOPIK100_PACK_ID, srsState);
    const packRows = hanjaPacks
      .filter((p) => p.charIds?.length)
      .map((p) => ({
        packId: p.packId,
        titleVi: p.titleVi,
        locked: !canAccessPack(p, accessCtx),
        isPremiumPack: isPackAccessPremium(p.access),
        ...getPackProgress(p.packId, srsState),
      }))
      .sort((a, b) => {
        if (a.packId === TOPIK100_PACK_ID) return -1;
        if (b.packId === TOPIK100_PACK_ID) return 1;
        return 0;
      });
    return { summary, packRows, topik100, stats: getHanjaStats(), accessCtx };
  }, [userId, isPremium, hasHanja, srsTick]);

  const chartColors = useMemo(() => getChartColors(), [theme]);

  const lineChartData = useMemo(() => ({
    labels: chartData.map((_, i) => `Lần ${i + 1}`),
    datasets: [
      {
        label: `Điểm / ${maxScoreForType}`,
        data: chartData.map((item) => item.aiData.total_score || 0),
        borderColor: chartColors.accent,
        backgroundColor: chartColors.accentFill,
        tension: 0.3,
        fill: true,
      },
    ],
  }), [chartData, maxScoreForType, chartColors]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (ctx) => {
            const item = chartData[ctx.dataIndex];
            return item?.created_at ? `Ngày: ${item.created_at}` : '';
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: maxScoreForType,
        ticks: { stepSize: maxScoreForType <= 10 ? 2 : 5, color: chartColors.tick },
        grid: { color: chartColors.grid },
      },
      x: {
        ticks: { color: chartColors.tick },
        grid: { color: chartColors.gridX },
      },
    },
  }), [chartData, maxScoreForType, chartColors]);

  const criteriaKeys = chartData.length
    ? Object.keys(chartData[chartData.length - 1]?.aiData?.criteria_scores || {})
    : [];
  const radarBarData = criteriaKeys.length
    ? {
        labels: criteriaKeys.map((k) => k.replace(/_/g, ' ')),
        datasets: [
          {
            label: 'Bài mới nhất',
            data: criteriaKeys.map(
              (k) => chartData[chartData.length - 1].aiData.criteria_scores[k] || 0
            ),
            backgroundColor: chartColors.success,
          },
        ],
      }
    : null;

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: chartColors.tick }, grid: { color: chartColors.grid } },
      x: { ticks: { color: chartColors.tick }, grid: { display: false } },
    },
  }), [chartColors]);

  const criteriaCompareBarData = useMemo(() => {
    if (!chartData.length || !profile?.criteriaTrends) return null;
    const latest = chartData[chartData.length - 1]?.aiData?.criteria_scores || {};
    const keys = ['ngu_phap', 'tu_vung', 'cau_truc', 'noi_dung'].filter(
      (k) => latest[k] != null || (profile.criteriaTrends[k]?.length > 0)
    );
    if (!keys.length) return null;
    return {
      labels: keys.map((k) => k.replace(/_/g, ' ')),
      datasets: [
        {
          label: 'Bài mới nhất',
          data: keys.map((k) => latest[k] || 0),
          backgroundColor: chartColors.accent,
        },
        {
          label: 'TB gần đây',
          data: keys.map((k) => {
            const arr = profile.criteriaTrends[k] || [];
            if (!arr.length) return 0;
            return arr.reduce((s, v) => s + v, 0) / arr.length;
          }),
          backgroundColor: chartColors.success,
        },
      ],
    };
  }, [chartData, profile, chartColors]);

  const barCompareOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { color: chartColors.tick } } },
    scales: {
      y: { beginAtZero: true, ticks: { color: chartColors.tick }, grid: { color: chartColors.grid } },
      x: { ticks: { color: chartColors.tick }, grid: { display: false } },
    },
  }), [chartColors]);

  const handleGenerateTest = async () => {
    if (currentErrors.length === 0) {
      showToast(`Chưa có lỗi sai cho Câu ${activeSubTab} để tạo bài tập!`, 'warning');
      return;
    }

    if (!isPremium && quota && !quota.canMiniTest) {
      showToast('FREE: 1 mini-test/tuần. Nâng cấp PREMIUM để không giới hạn.', 'warning');
      onUpgradeClick?.();
      return;
    }

    setIsGenerating(true);
    setMiniTest(null);
    setMiniAnswers({});
    setMiniRevealed({});

    try {
      const errorHistoryText = currentErrors
        .map((err) => `Sai: ${err.sai} -> Đúng: ${err.đúng} (Lý do: ${err.lý_do})`)
        .join('\n');

      const response = await apiFetch('/api/v1/dashboard/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorHistory: errorHistoryText, userId }),
      });

      if (!response.ok) throw new Error('Yêu cầu tạo bài tập bị từ chối.');
      let data = await response.json();
      if (typeof data === 'string') {
        data = JSON.parse(data.replace(/```json/g, '').replace(/```/g, '').trim());
      }
      if (data.quotaExceeded) {
        showToast(data.analysis || 'Hết lượt mini-test tuần này.', 'warning');
        onUpgradeClick?.();
        return;
      }
      setMiniTest(data);
      setViewMode('detail');
      showToast('Đã tạo bài tập khắc phục!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Hệ thống AI đang bận, vui lòng thử lại sau.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectQuestion = (num) => {
    setActiveSubTab(num);
    setMiniTest(null);
    setViewMode('detail');
  };

  const getCountFor = (num) => allHistory.filter((i) => Number(i.question_number) === num).length;

  const getAvgFor = (num) => {
    const items = allHistory.filter((i) => Number(i.question_number) === num);
    if (!items.length) return 0;
    return (
      items.reduce((s, i) => s + (i.aiData?.total_score || 0), 0) / items.length
    ).toFixed(1);
  };

  const weakestQ = getWeakestQuestionNum(profile, allHistory);
  const weakestTab = getWritingTabForQuestion(weakestQ);

  const startLearningPath = (qNum, mode = 'theory') => {
    const tab = getWritingTabForQuestion(qNum);
    if (tab) onNavigate?.(tab, { writingMode: mode });
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <h3>⏳ Đang tải tiến trình học tập...</h3>
      </div>
    );
  }
  if (error) {
    return (
      <div className="app-error">
        <h3>⚠️ {error}</h3>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Chinh phục"
        highlight="TOPIK Viết"
        subtitle={
          <>
            Theo dõi tiến độ 4 dạng câu viết, phân tích lỗi AI và luyện tập có mục tiêu trước kỳ thi.
            {totalSubmissions > 0 && (
              <span> · Đã nộp <strong>{totalSubmissions}</strong> bài</span>
            )}
          </>
        }
      />

      <div className="dashboard-hero-actions">
        <button
          type="button"
          className="app-btn-primary"
          onClick={() => weakestTab && onNavigate?.(weakestTab, { writingMode: 'omr' })}
        >
          🚀 Luyện OMR ngay — Câu {weakestQ}
        </button>
      </div>

      <div className="sub-tabs">
        <button
          type="button"
          className={`sub-tab${viewMode === 'overview' ? ' active' : ''}`}
          onClick={() => setViewMode('overview')}
        >
          📋 Tổng quan
        </button>
        <button
          type="button"
          className={`sub-tab${viewMode === 'detail' ? ' active' : ''}`}
          onClick={() => setViewMode('detail')}
        >
          📊 Phân tích chi tiết
        </button>
      </div>

      {learningPath ? (
        <div className="learning-path-card">
          <h3 className="learning-path-title">🗺️ Lộ trình cá nhân</h3>
          <p className="learning-path-rec">{learningPath.recommendation}</p>
          <p className="learning-path-goal">{learningPath.weeklyGoal}</p>
          {(profile?.writingStreak?.count ?? 0) > 0 && (
            <p className="learning-path-rec" style={{ color: 'var(--app-accent)', fontWeight: 700 }}>
              🔥 Streak viết: {profile.writingStreak.count} ngày
            </p>
          )}
          {learningPath.progress && (
            <div className="progress-grid">
              {[51, 52, 53, 54].map((q) => {
                const p = learningPath.progress[`q${q}`] || { done: 0, target: 3, percent: 0 };
                return (
                  <button
                    key={q}
                    type="button"
                    className="learning-path-progress-btn"
                    onClick={() => startLearningPath(q, p.percent < 50 ? 'omr' : 'theory')}
                  >
                    <div className="progress-item-label">
                      <span>Câu {q}</span>
                      <span>{p.done}/{p.target}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${p.percent}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            className="app-btn-primary"
            style={{ marginTop: '14px' }}
            onClick={() => startLearningPath(weakestQ, 'omr')}
          >
            Bắt đầu luyện — Câu {weakestQ}
          </button>
        </div>
      ) : (
        <div className="learning-path-card">
          <h3 className="learning-path-title">🗺️ Bắt đầu lộ trình</h3>
          <p className="learning-path-rec">Chưa có dữ liệu lộ trình — hãy làm bài OMR để AI phân tích tiến độ.</p>
          <button
            type="button"
            className="app-btn-primary"
            onClick={() => onNavigate?.('writing51', { writingMode: 'omr' })}
          >
            Bắt đầu với Câu 51
          </button>
        </div>
      )}

      {profile?.criteriaHeatmap && (
        <div className="learning-path-card">
          <h3 className="learning-path-title">🎯 Heatmap rubric (TB theo câu)</h3>
          <div className="criteria-heatmap">
            {['q51', 'q52', 'q53', 'q54'].map((qKey) => (
              <div key={qKey} className="criteria-heatmap__row">
                <span className="criteria-heatmap__label">{qKey.replace('q', 'Câu ')}</span>
                {['ngu_phap', 'tu_vung', 'cau_truc', 'noi_dung'].map((crit) => {
                  const val = profile.criteriaHeatmap[qKey]?.[crit] ?? 0;
                  const pct = Math.min(100, Math.round((val / 10) * 100));
                  return (
                    <span
                      key={crit}
                      className="criteria-heatmap__cell"
                      style={{ opacity: 0.35 + (pct / 100) * 0.65 }}
                      title={`${crit}: ${val.toFixed(1)}`}
                    >
                      {val > 0 ? val.toFixed(1) : '—'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="learning-path-card">
        <h3 className="learning-path-title">漢 100 từ hay gặp TOPIK</h3>
        <p className="learning-path-rec">
          Free: tra cứu không giới hạn · SRS 5 phiên/ngày
          {hanjaProgress.summary.streak > 0 && (
            <span style={{ color: 'var(--app-accent)', fontWeight: 700 }}> · 🔥 Streak {hanjaProgress.summary.streak} ngày</span>
          )}
        </p>
        <div className="progress-grid">
          <div>
            <div className="progress-item-label">
              <span>100 từ TOPIK đã thuộc</span>
              <span>{hanjaProgress.topik100.learned}/{hanjaProgress.topik100.total}</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${hanjaProgress.topik100.percent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="progress-item-label">
              <span>Cần ôn hôm nay (tất cả pack)</span>
              <span>{hanjaProgress.summary.due} chữ</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${hanjaProgress.summary.due > 0 ? 100 : 0}%`,
                  background: 'var(--app-warning, #f59e0b)',
                }}
              />
            </div>
          </div>
        </div>
        {hanjaProgress.packRows.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {hanjaProgress.packRows.map((row) => (
              <div key={row.packId} style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                {row.locked && row.isPremiumPack ? '🔒 ' : ''}
                {row.titleVi}: {row.learned}/{row.total} ({row.percent}%)
                {row.packId === 'topik-intermediate' && row.locked && ' — PREMIUM'}
              </div>
            ))}
          </div>
        )}
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--app-text-muted)' }}>
          {hanjaProgress.stats.characters} chữ trong ngân hàng · Free: 120 từ (100 TOPIK + 20 gốc âm)
        </p>
        <button
          type="button"
          className="qtype-practice-link"
          style={{ marginTop: '12px' }}
          onClick={() => onNavigate?.('hanja')}
        >
          Mở Hán Hàn →
        </button>
      </div>

      {(viewMode === 'overview' || viewMode === 'detail') && (
        <div className="qtype-grid">
          {QUESTION_TYPES.map((qt) => {
            const count = getCountFor(qt.num);
            const avg = getAvgFor(qt.num);
            const isSelected = activeSubTab === qt.num;
            return (
              <article
                key={qt.num}
                className={`qtype-card${isSelected && viewMode === 'detail' ? ' selected' : ''}`}
              >
                <button
                  type="button"
                  className="qtype-card-main"
                  onClick={() => selectQuestion(qt.num)}
                >
                  <span className={`qtype-badge ${qt.badge}`}>{qt.label}</span>
                  <p className="qtype-desc">{qt.desc}</p>
                  <div className="qtype-stats">
                    <span>📝 {count} bài</span>
                    <span>·</span>
                    <span>TB: {avg}/{qt.maxScore}đ</span>
                  </div>
                  <div className="qtype-status">
                    {count === 0 ? 'Chưa bắt đầu' : count < 3 ? 'Đang luyện tập' : '✓ Đã có tiến độ'}
                  </div>
                </button>
                <div className="qtype-footer">
                  <button
                    type="button"
                    className="qtype-practice-link"
                    onClick={() => onNavigate?.(qt.tab, { writingMode: 'theory' })}
                  >
                    Ôn lý thuyết →
                  </button>
                  <button
                    type="button"
                    className="qtype-practice-link qtype-practice-link--omr"
                    onClick={() => onNavigate?.(qt.tab, { writingMode: 'omr' })}
                  >
                    Làm đề OMR →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <MistakeCardsPanel userId={userId} historyRows={allHistory} onNavigate={onNavigate} />

      {viewMode === 'detail' && (
        <>
          <div className="analysis-panel">
            <div className="analysis-header">
              <div>
                <h3 className="analysis-title">🎯 Phân tích Câu {activeSubTab}</h3>
                <p className="analysis-meta">
                  {filteredHistory.length} bài · TB: <strong>{avgScore}</strong>/{maxScoreForType}đ
                  {!isPremium && quota && (
                    <span> · Mini-test: {quota.miniTestUsedWeek}/{quota.miniTestLimitWeekly}/tuần</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="app-btn-primary"
                onClick={handleGenerateTest}
                disabled={isGenerating || currentErrors.length === 0}
              >
                {isGenerating ? '⏳ Đang tạo...' : `🚀 Tạo bài tập Câu ${activeSubTab}`}
              </button>
            </div>

            {rewriteComparisons.length > 0 && (
              <div className="rewrite-compare-panel app-card" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 12px' }}>✏️ So sánh viết lại (v1 → v2)</h4>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                  {rewriteComparisons.map(({ questionId, v1, v2, delta }) => (
                    <li key={questionId}>
                      Đề <code>{questionId}</code>: {v1.score}/{v1.maxScore} → {v2.score}/{v2.maxScore}
                      {' '}
                      <strong style={{ color: delta >= 0 ? 'var(--app-success)' : 'var(--app-danger)' }}>
                        ({delta >= 0 ? '+' : ''}{delta}đ)
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {miniTest && !miniTest.quotaExceeded && (
              <div className="mini-test-box">
                <h4 style={{ margin: '0 0 8px', color: 'var(--app-purple-text)' }}>🔑 {miniTest.main_weakness}</h4>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--app-text-muted)' }}>
                  <strong>Chiến lược:</strong> {miniTest.analysis}
                </p>
                {miniTest.mini_test?.map((test, index) => (
                  <MiniTestQuestion
                    key={index}
                    test={test}
                    index={index}
                    answers={miniAnswers}
                    setAnswers={setMiniAnswers}
                    revealed={miniRevealed}
                    setRevealed={setMiniRevealed}
                  />
                ))}
              </div>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>Chưa có bài cho Câu {activeSubTab}</p>
              <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                Làm bài trên phiếu OMR để AI chấm và lưu tiến độ.
              </p>
              <button
                type="button"
                className="app-btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  const tab = getWritingTabForQuestion(activeSubTab);
                  if (tab) onNavigate?.(tab, { writingMode: 'omr' });
                }}
              >
                Làm đề OMR — Câu {activeSubTab}
              </button>
            </div>
          ) : (
            <div className="charts-row">
              <div className="chart-card">
                <h3>📈 Tiến trình 10 bài gần nhất</h3>
                <div className="chart-wrap">
                  <Line data={lineChartData} options={lineOptions} />
                </div>
                {radarBarData && (
                  <div className="chart-wrap-sm">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--app-text-muted)', margin: '0 0 8px' }}>
                      Rubric bài mới nhất
                    </h4>
                    <Bar
                      data={radarBarData}
                      options={barOptions}
                    />
                  </div>
                )}
                {criteriaCompareBarData && (
                  <div className="chart-wrap-sm">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--app-text-muted)', margin: '0 0 8px' }}>
                      So sánh bài mới vs TB gần đây
                    </h4>
                    <Bar data={criteriaCompareBarData} options={barCompareOptions} />
                  </div>
                )}
              </div>

              <div className="chart-card" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <h3>🧠 Sổ lỗi ({currentErrors.length})</h3>
                {currentErrors.length === 0 ? (
                  <p style={{ color: 'var(--app-text-muted)', fontSize: '0.85rem' }}>Chưa có lỗi ghi nhận 🎉</p>
                ) : (
                  currentErrors.map((err, index) => (
                    <div key={index} className="error-item">
                      <div className="wrong">{err.sai}</div>
                      <div className="right">{err.đúng}</div>
                      <div className="reason">{err.lý_do}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
