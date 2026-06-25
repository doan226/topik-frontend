import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import {
  Award,
  Target,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Layers,
  BookOpen,
  Stethoscope,
  ListChecks,
  Sparkles,
  Bookmark,
  Download,
} from 'lucide-react';
import exportEssayImage from '../utils/exportEssayImage';
import '../styles/grading-report.css';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const AXES = [
  { key: 'ngu_phap', vi: 'Ngữ pháp', ko: '문법', legacy: ['ngôn_ngữ'] },
  { key: 'tu_vung', vi: 'Từ vựng', ko: '어휘', legacy: [] },
  { key: 'cau_truc', vi: 'Cấu trúc', ko: '구조', legacy: ['tổ_chức'] },
  { key: 'noi_dung', vi: 'Nội dung', ko: '내용', legacy: ['nội_dung'] },
];

const CHAR_RANGES = {
  53: { min: 200, max: 300 },
  54: { min: 600, max: 700 },
};

function readAxis(criteria, axis) {
  if (criteria[axis.key] != null) return Number(criteria[axis.key]) || 0;
  for (const legacyKey of axis.legacy) {
    if (criteria[legacyKey] != null) return Number(criteria[legacyKey]) || 0;
  }
  return 0;
}

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function DotRating({ score, max }) {
  const dots = [];
  for (let i = 0; i < max; i += 1) {
    dots.push(<span key={i} className={`gr-dot${i < score ? ' gr-dot--on' : ''}`} />);
  }
  return <div className="gr-dots">{dots}</div>;
}

function ScoreHero({ gradingResult, maxScore, questionType, radarData }) {
  const total = gradingResult.total_score || 0;
  const animated = useCountUp(total);
  const grade = gradingResult.grade_letter || '';
  const diagnosis = gradingResult.level_diagnosis || {};
  const charCount = Number(gradingResult.pre_validation?.koreanCharCount ?? 0);
  const range = CHAR_RANGES[questionType];
  const charOut = range && charCount > 0 && (charCount < range.min || charCount > range.max);

  const radarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMax: maxScore / 4,
        ticks: { display: false, stepSize: maxScore / 8 },
        grid: { color: 'rgba(128,128,128,0.25)' },
        angleLines: { color: 'rgba(128,128,128,0.25)' },
        pointLabels: { font: { size: 12, weight: '600' } },
      },
    },
  }), [maxScore]);

  return (
    <div className="gr-hero">
      <div className="gr-hero__left">
        <div className="gr-hero__score-row">
          <div className="gr-hero__score">
            <span className="gr-hero__score-num">{animated}</span>
            <span className="gr-hero__score-max">/ {maxScore} điểm</span>
          </div>
          {grade && <div className={`gr-grade gr-grade--${grade.replace('+', 'plus')}`}>{grade}</div>}
        </div>
        {(diagnosis.hien_tai || diagnosis.muc_tieu) && (
          <div className="gr-badges">
            {diagnosis.hien_tai && (
              <span className="gr-badge gr-badge--current">
                <Award size={14} /> Hiện tại: {diagnosis.hien_tai}
              </span>
            )}
            {diagnosis.muc_tieu && (
              <span className="gr-badge gr-badge--target">
                <Target size={14} /> Mục tiêu: {diagnosis.muc_tieu}
              </span>
            )}
          </div>
        )}
        <div className="gr-axis-list">
          {radarData.entries.map((e) => (
            <div key={e.key} className="gr-axis-row">
              <span className="gr-axis-label">{e.vi} <em>{e.ko}</em></span>
              <div className="progress-bar-track gr-axis-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${radarData.axisMax ? Math.min(100, (e.value / radarData.axisMax) * 100) : 0}%` }}
                />
              </div>
              <strong className="gr-axis-value">{e.value}</strong>
            </div>
          ))}
        </div>
        {range && charCount > 0 && (
          <div className={`gr-charcount${charOut ? ' gr-charcount--warn' : ''}`}>
            <FileText size={14} /> Số chữ: <strong>{charCount}</strong> ({range.min}-{range.max})
            {charOut && <AlertTriangle size={14} />}
          </div>
        )}
      </div>
      <div className="gr-hero__right">
        <div className="gr-radar">
          <Radar data={radarData.chart} options={radarOptions} />
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="gr-section">
      <h4 className="gr-section__title">
        {Icon && <Icon size={18} />} {title}
        {subtitle && <span className="gr-section__subtitle">{subtitle}</span>}
      </h4>
      {children}
    </section>
  );
}

function DetailedCriteriaGrid({ items }) {
  if (!items?.length) return null;
  return (
    <Section icon={ListChecks} title="Tiêu chí chi tiết">
      <div className="gr-criteria-grid">
        {items.map((c, i) => (
          <div key={i} className="gr-criteria-card">
            <div className="gr-criteria-card__head">
              <span className="gr-criteria-card__name">{c.ten || c.ten_ko}</span>
              {c.ten_ko && c.ten && <span className="gr-criteria-card__ko">{c.ten_ko}</span>}
            </div>
            <DotRating score={Number(c.diem) || 0} max={Number(c.toi_da) || 5} />
            <span className="gr-criteria-card__score">{Number(c.diem) || 0}/{Number(c.toi_da) || 5}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function LevelDiagnosis({ diagnosis, roadmap }) {
  const hasDesc = diagnosis?.mo_ta;
  if (!hasDesc && !roadmap?.length) return null;
  return (
    <Section icon={Stethoscope} title="Chẩn đoán cấp độ TOPIK">
      {hasDesc && <p className="gr-diagnosis-text">{diagnosis.mo_ta}</p>}
      {roadmap?.length > 0 && (
        <>
          <p className="gr-roadmap-title">Lộ trình cải thiện:</p>
          <ol className="gr-roadmap">
            {roadmap.map((step, i) => (
              <li key={i}><span className="gr-roadmap__num">{i + 1}</span>{typeof step === 'string' ? step : JSON.stringify(step)}</li>
            ))}
          </ol>
        </>
      )}
    </Section>
  );
}

function ParagraphAnalysis({ items }) {
  if (!items?.length) return null;
  return (
    <Section icon={Layers} title="Phân tích từng đoạn">
      <div className="gr-paragraphs">
        {items.map((p, i) => (
          <details key={i} className="gr-paragraph">
            <summary className="gr-paragraph__summary">
              <span className="gr-paragraph__name">{p.phan}</span>
              {p.trich_dan && <span className="gr-paragraph__quote">{p.trich_dan}</span>}
              {p.diem != null && (
                <span className="gr-paragraph__score">{p.diem}/{p.toi_da ?? '—'}</span>
              )}
            </summary>
            {p.nhan_xet && <p className="gr-paragraph__note">{p.nhan_xet}</p>}
          </details>
        ))}
      </div>
    </Section>
  );
}

function SwotGrid({ swot }) {
  if (!swot) return null;
  const quadrants = [
    { key: 'S', label: 'Điểm mạnh', cls: 'gr-swot--s', icon: CheckCircle2 },
    { key: 'W', label: 'Điểm yếu', cls: 'gr-swot--w', icon: AlertTriangle },
    { key: 'O', label: 'Cơ hội', cls: 'gr-swot--o', icon: Lightbulb },
    { key: 'T', label: 'Rủi ro', cls: 'gr-swot--t', icon: AlertTriangle },
  ];
  const hasAny = quadrants.some((q) => (swot[q.key] || []).length > 0);
  if (!hasAny) return null;
  return (
    <Section icon={Sparkles} title="Phân tích SWOT">
      <div className="gr-swot-grid">
        {quadrants.map((q) => {
          const list = swot[q.key] || [];
          return (
            <div key={q.key} className={`gr-swot ${q.cls}`}>
              <h6 className="gr-swot__title"><q.icon size={14} /> {q.label} ({list.length})</h6>
              <ul className="gr-swot__list">
                {list.length ? list.map((x, i) => <li key={i}>{x}</li>) : <li className="gr-muted">—</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function EmergencyFix({ grammarErrors, contentIssues }) {
  const groups = [
    { label: 'Ngữ pháp', items: (grammarErrors || []).map((e) => ({ bad: e.sai, good: e.đúng, reason: e.lý_do, level: e.mức_độ })) },
    { label: 'Nội dung', items: (contentIssues || []).map((c) => ({ bad: c.vấn_đề, good: c.gợi_ý })) },
  ];
  const [active, setActive] = useState(0);
  const hasAny = groups.some((g) => g.items.length > 0);
  if (!hasAny) return null;
  const current = groups[active];
  return (
    <Section icon={Stethoscope} title="Ứng cứu nhanh">
      <div className="gr-fix-tabs">
        {groups.map((g, i) => (
          <button
            key={g.label}
            type="button"
            className={`gr-fix-tab${active === i ? ' active' : ''}`}
            onClick={() => setActive(i)}
          >
            {g.label} ({g.items.length})
          </button>
        ))}
      </div>
      <ul className="gr-fix-list">
        {current.items.length === 0 && <li className="gr-muted">Không phát hiện vấn đề ở mục này.</li>}
        {current.items.map((it, i) => (
          <li key={i} className="gr-fix-item">
            {it.level && (
              <span className={`gr-sev${it.level === 'nặng' ? ' gr-sev--heavy' : ' gr-sev--light'}`}>{it.level}</span>
            )}
            {it.bad && <del className="gr-bad">{it.bad}</del>}
            {it.good && <> ➡ <strong className="gr-good">{it.good}</strong></>}
            {it.reason && <div className="gr-fix-reason">{it.reason}</div>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function SampleAnswers({ sampleAnswers, fallback }) {
  const basic = sampleAnswers?.co_ban || fallback || '';
  const advanced = sampleAnswers?.nang_cao || '';
  const tabs = [];
  if (basic) tabs.push({ label: 'Cơ bản (5급)', text: basic });
  if (advanced) tabs.push({ label: 'Nâng cao (6급)', text: advanced });
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;
  return (
    <Section icon={BookOpen} title="Bài mẫu">
      <div className="gr-fix-tabs">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            className={`gr-fix-tab${active === i ? ' active' : ''}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="gr-sample-box">{tabs[active]?.text}</div>
    </Section>
  );
}

function ModelPhrases({ phrases, savedIds, onSave }) {
  if (!phrases?.length) return null;
  return (
    <Section icon={BookOpen} title="Cụm từ nên học">
      <ul className="gr-phrases">
        {phrases.map((p, i) => {
          const ko = typeof p === 'string' ? p : (p.ko || p.phrase || '');
          const vi = typeof p === 'string' ? '' : (p.vi || '');
          const id = `phrase-${i}-${ko}`;
          const saved = savedIds?.has(id);
          return (
            <li key={i} className="gr-phrase">
              <div>
                <strong>{ko}</strong>
                {vi && <span className="gr-muted"> — {vi}</span>}
              </div>
              {onSave && ko && (
                <button
                  type="button"
                  className={`gr-save-btn${saved ? ' saved' : ''}`}
                  onClick={() => onSave({ id, ko, vi })}
                >
                  <Bookmark size={13} /> {saved ? 'Đã lưu' : 'Lưu ôn tập'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SimilarQuestions({ items }) {
  if (!items?.length) return null;
  return (
    <Section icon={FileText} title="Đề tương tự đã ra">
      <div className="gr-similar">
        {items.map((q, i) => (
          <div key={i} className="gr-similar__item">
            <span className="gr-similar__tag">{q.ky_thi || `Đề ${i + 1}`}</span>
            <span className="gr-similar__text">{q.de_bai || (typeof q === 'string' ? q : '')}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function NextTasks({ tasks }) {
  if (!tasks?.length) return null;
  return (
    <Section icon={ListChecks} title="Nhiệm vụ tiếp theo">
      <ol className="gr-roadmap">
        {tasks.map((t, i) => (
          <li key={i}>
            <span className="gr-roadmap__num">{i + 1}</span>
            {typeof t === 'string' ? t : (t.task || JSON.stringify(t))}
          </li>
        ))}
      </ol>
    </Section>
  );
}

export default function Essay54ReportCard({
  gradingResult,
  maxScore,
  sampleAnswer,
  questionType,
  studentText,
  userId,
  onSavePhrase,
  savedPhraseIds,
}) {
  if (!gradingResult) return null;

  if (gradingResult.apiError || gradingResult.quotaExceeded) {
    return (
      <div className="gr-report gr-report--error">
        <AlertTriangle size={18} />
        <span>{gradingResult.native_suggestion || 'Không thể chấm điểm lúc này. Vui lòng thử lại.'}</span>
      </div>
    );
  }

  const criteria = gradingResult.criteria_scores || {};
  const axisMax = maxScore / 4;
  const radarEntries = AXES.map((a) => ({ ...a, value: readAxis(criteria, a) }));
  const radarData = {
    axisMax,
    entries: radarEntries,
    chart: {
      labels: radarEntries.map((e) => e.ko),
      datasets: [
        {
          label: 'Điểm',
          data: radarEntries.map((e) => e.value),
          backgroundColor: 'rgba(139, 92, 246, 0.25)',
          borderColor: 'rgba(139, 92, 246, 0.9)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        },
      ],
    },
  };

  const nextTasks = gradingResult.rewrite_tasks?.length
    ? gradingResult.rewrite_tasks
    : gradingResult.roadmap;

  return (
    <div className="gr-report">
      <h3 className="gr-report__heading"><Sparkles size={20} /> Báo cáo chấm điểm AI</h3>

      <ScoreHero
        gradingResult={gradingResult}
        maxScore={maxScore}
        questionType={questionType}
        radarData={radarData}
      />

      {gradingResult.score_justification && (
        <Section icon={Lightbulb} title="Nhận xét chung">
          <p className="gr-diagnosis-text">{gradingResult.score_justification}</p>
        </Section>
      )}

      <DetailedCriteriaGrid items={gradingResult.detailed_criteria} />
      <LevelDiagnosis diagnosis={gradingResult.level_diagnosis} roadmap={gradingResult.roadmap} />
      <ParagraphAnalysis items={gradingResult.paragraph_analysis} />
      <SwotGrid swot={gradingResult.swot} />
      <EmergencyFix
        grammarErrors={gradingResult.grammar_errors}
        contentIssues={gradingResult.content_issues}
      />
      <SampleAnswers
        sampleAnswers={gradingResult.sample_answers}
        fallback={gradingResult.native_suggestion || sampleAnswer}
      />
      <ModelPhrases
        phrases={gradingResult.model_phrases_to_learn}
        savedIds={savedPhraseIds}
        onSave={userId ? onSavePhrase : null}
      />
      <NextTasks tasks={nextTasks} />
      <SimilarQuestions items={gradingResult.similar_questions} />

      {studentText && (questionType === 53 || questionType === 54) && (
        <button
          type="button"
          className="gr-export-btn"
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
          <Download size={15} /> Xuất ảnh bài viết + điểm
        </button>
      )}
    </div>
  );
}
