import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import examVisuals from '../../data/chart-53-exam-visuals.json';
import { resolveQuestionImageUrl } from '../utils/questionImageUrl';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CHART_HEIGHT = 340;

const palette = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

function buildChartData(chart) {
  return {
    labels: chart.labels,
    datasets: chart.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: chart.kind === 'pie'
        ? palette.slice(0, chart.labels.length)
        : palette[i % palette.length] + (chart.kind === 'line' ? '33' : 'cc'),
      borderColor: palette[i % palette.length],
      borderWidth: chart.kind === 'line' ? 2 : 1,
      tension: 0.25,
    })),
  };
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
    title: { display: false },
  },
};

function ChartBlock({ chart }) {
  const data = useMemo(() => buildChartData(chart), [chart]);
  const options = useMemo(() => ({
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      title: { display: true, text: chart.title, font: { size: 14, weight: 'bold' } },
    },
    scales: chart.kind === 'pie' ? undefined : {
      y: { beginAtZero: true, ticks: { font: { size: 11 } } },
      x: { ticks: { font: { size: 11 } } },
    },
  }), [chart]);

  const style = { height: CHART_HEIGHT, width: '100%' };

  if (chart.kind === 'line') {
    return <div style={style}><Line data={data} options={options} /></div>;
  }
  if (chart.kind === 'pie') {
    return <div style={style}><Pie data={data} options={options} /></div>;
  }
  return <div style={style}><Bar data={data} options={options} /></div>;
}

export default function Question53Chart({ questionId, imageUrl, compact = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedImg = resolveQuestionImageUrl(imageUrl);
  const showImg = resolvedImg && !imgFailed;

  const visual = !showImg ? examVisuals.visuals?.[String(questionId)] : null;
  const hasCharts = visual?.charts?.length > 0;

  if (!showImg && !hasCharts) return null;

  const pad = compact ? 12 : 16;
  const imgMaxH = compact ? 380 : 520;

  return (
    <div
      style={{
        marginBottom: compact ? 12 : 16,
        backgroundColor: '#fff',
        padding: pad,
        borderRadius: '10px',
        border: '2px solid #cbd5e1',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {showImg ? (
        <div style={{ textAlign: 'center' }}>
          <img
            src={resolvedImg}
            alt="Đề thi TOPIK câu 53"
            onError={() => setImgFailed(true)}
            style={{
              maxWidth: '100%',
              maxHeight: imgMaxH,
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '6px',
            }}
          />
        </div>
      ) : (
        <>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '12px' }}>
            📊 Biểu đồ đề bài
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {visual.charts.map((chart, i) => (
              <ChartBlock key={i} chart={chart} />
            ))}
            {visual.notes?.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>
                {visual.notes.map((n, j) => (
                  <li key={j}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
