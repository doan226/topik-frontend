import React, { useState, useMemo } from 'react';
import { vocabTopics, essayTemplates } from '../utils/contentData';

const TOPIC_KEYWORDS = [
  { topicId: 'youth', words: ['청소년', '청소년기'] },
  { topicId: 'birth-rate', words: ['출산', '출산율'] },
  { topicId: 'smoking', words: ['흡연', '담배'] },
  { topicId: 'aging', words: ['고령', '노령'] },
  { topicId: 'smart-device-addiction', words: ['스마트', '중독', '스마트폰'] },
  { topicId: 'plagiarism', words: ['표절'] },
  { topicId: 'history-education', words: ['역사', '역사 교육'] },
  { topicId: 'genetic-engineering', words: ['유전', '공학'] },
  { topicId: 'traditional-culture', words: ['전통', '전통문화'] },
  { topicId: 'global-warming', words: ['온난', '환경', '지구'] },
  { topicId: 'praise', words: ['칭찬'] },
  { topicId: 'early-education', words: ['조기', '교육'] },
  { topicId: 'debate-attitude', words: ['토론', '토론에'] },
  { topicId: 'art-education', words: ['예술', '예술 교육'] },
  { topicId: 'newspaper', words: ['신문'] },
  { topicId: 'cctv', words: ['감시', '카메라', 'CCTV'] },
  { topicId: 'happy-life', words: ['행복'] },
  { topicId: 'success', words: ['성공'] },
  { topicId: 'self-development', words: ['자기계발', '계발'] },
];

function guessTopic(prompt) {
  if (!prompt) return null;
  for (const { topicId, words } of TOPIC_KEYWORDS) {
    if (words.some((w) => prompt.includes(w))) {
      return vocabTopics.find((t) => t.topicId === topicId) || null;
    }
  }
  return null;
}

export default function Essay54Hints({ prompt }) {
  const [openSection, setOpenSection] = useState('vocab');
  const [pickedTopicId, setPickedTopicId] = useState('');
  const matchedTopic = useMemo(() => guessTopic(prompt), [prompt]);
  const displayTopic = matchedTopic || vocabTopics.find((t) => t.topicId === pickedTopicId);
  const questionTypes = essayTemplates.filter((i) => i.type === 'question-type');
  const openings = essayTemplates.filter((i) => i.type === 'opening');
  const bodyFormula = essayTemplates.find((i) => i.type === 'body-formula');
  const closing = essayTemplates.filter((i) => i.type === 'closing');

  const toggle = (key) => setOpenSection(openSection === key ? null : key);

  const sectionBtn = (key, label) => (
    <button
      type="button"
      onClick={() => toggle(key)}
      style={{
        padding: '8px 14px',
        borderRadius: '6px',
        border: openSection === key ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
        backgroundColor: openSection === key ? '#f5f3ff' : '#f8fafc',
        color: '#5b21b6',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '13px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '10px', textAlign: 'left' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#5b21b6', fontSize: '16px' }}>📝 Gợi ý câu 54 (Quyển Viết)</h4>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {sectionBtn('vocab', 'Từ vựng chủ đề')}
        {sectionBtn('types', '6 dạng câu hỏi')}
        {sectionBtn('open', 'Mở bài')}
        {sectionBtn('body', 'Thân bài')}
        {sectionBtn('close', 'Kết bài')}
      </div>

      {openSection === 'vocab' && (
        <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
          {!displayTopic && (
            <select
              value={pickedTopicId}
              onChange={(e) => setPickedTopicId(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px' }}
            >
              <option value="">— Chọn chủ đề —</option>
              {vocabTopics.filter((t) => t.terms?.length).map((t) => (
                <option key={t.topicId} value={t.topicId}>{t.topicKo}</option>
              ))}
            </select>
          )}
          {displayTopic ? (
            <>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{displayTopic.topicKo} — {displayTopic.topicVi}</p>
              {displayTopic.terms?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {displayTopic.terms.slice(0, 14).map((t, i) => (
                    <li key={i}><strong>{t.ko}</strong>: {t.vi}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#94a3b8' }}>Chủ đề này chưa có list từ.</p>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {vocabTopics.filter((t) => t.terms?.length).length} chủ đề có từ vựng — chọn dropdown hoặc viết đề có từ khóa Hàn
            </p>
          )}
        </div>
      )}

      {openSection === 'types' && (
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '14px' }}>
          {questionTypes.map((qt) => (
            <li key={qt.id} style={{ marginBottom: '8px' }}>
              <strong>{qt.labelKo}</strong> ({qt.labelVi})
            </li>
          ))}
        </ul>
      )}

      {openSection === 'open' && openings.map((o) => (
        <div key={o.id} style={{ marginBottom: '10px', fontSize: '13px' }}>
          <div style={{ fontWeight: 'bold', color: '#475569' }}>{o.labelVi}</div>
          {o.templates?.slice(0, 2).map((t, i) => (
            <div key={i} style={{ marginTop: '4px' }}><code>{t.ko}</code></div>
          ))}
        </div>
      ))}

      {openSection === 'body' && bodyFormula && (
        <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '14px' }}>
          {bodyFormula.steps?.map((s) => (
            <li key={s.step}>{s.vi}</li>
          ))}
        </ol>
      )}

      {openSection === 'close' && closing[0]?.templates?.slice(0, 4).map((t, i) => (
        <div key={i} style={{ fontSize: '13px', marginBottom: '4px' }}><strong>{t.ko}</strong> — {t.vi}</div>
      ))}
    </div>
  );
}
