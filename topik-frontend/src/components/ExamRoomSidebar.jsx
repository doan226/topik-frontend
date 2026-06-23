import React, { useState } from 'react';
import RecentSubmissions from './RecentSubmissions';

export default function ExamRoomSidebar({
  bankMode,
  onSwitchOfficial,
  onSwitchExpansion,
  isPremium,
  officialSessions,
  selectedTopik,
  onSelectTopik,
  expansionSets,
  selectedExpansion,
  onSelectExpansion,
  quota,
  userId,
  questionNumber,
  viewingHistoryId,
  onSelectHistory,
  compact = false,
}) {
  const [historyOpen, setHistoryOpen] = useState(true);

  const handleTopikChange = (e) => {
    const num = Number(e.target.value);
    if (!Number.isNaN(num)) onSelectTopik(num);
  };

  return (
    <aside className="exam-sidebar">
      <div className="exam-bank-row">
        <button
          type="button"
          onClick={onSwitchOfficial}
          className={`exam-bank-btn exam-bank-btn--official${bankMode === 'official' ? ' active' : ''}`}
        >
          📋 Đề công bố
        </button>
        <button
          type="button"
          onClick={onSwitchExpansion}
          className={`exam-bank-btn exam-bank-btn--expansion${bankMode === 'expansion' ? ' active' : ''}${!isPremium ? ' locked' : ''}`}
        >
          {isPremium ? '👑' : '🔒'} Mở rộng
        </button>
      </div>

      {bankMode === 'official' ? (
        <>
          <label className="exam-sidebar__label" htmlFor="exam-topik-select">
            🎯 Chọn kỳ thi
          </label>
          <select
            id="exam-topik-select"
            className="exam-sidebar__select exam-sidebar__select--mobile"
            value={selectedTopik}
            onChange={handleTopikChange}
          >
            {officialSessions.map((topikNum) => (
              <option key={topikNum} value={topikNum}>
                Kỳ {topikNum}
              </option>
            ))}
          </select>
          <div className="exam-chip-row exam-sidebar__chips--desktop">
            {officialSessions.map((topikNum) => (
              <button
                key={topikNum}
                type="button"
                onClick={() => onSelectTopik(topikNum)}
                className={`exam-chip exam-chip--blue${selectedTopik === topikNum ? ' active' : ''}`}
              >
                Kỳ {topikNum}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <span className="exam-sidebar__label">📚 Đề mở rộng</span>
          <div className="exam-chip-row">
            {expansionSets.map((setNum) => (
              <button
                key={setNum}
                type="button"
                onClick={() => onSelectExpansion(setNum)}
                className={`exam-chip exam-chip--amber${selectedExpansion === setNum ? ' active' : ''}`}
              >
                #{setNum}
              </button>
            ))}
          </div>
          <p className="exam-room__hint">Đề luyện thêm — không phải đề TOPIK chính thức.</p>
        </>
      )}

      {quota && !isPremium && (
        <p className="exam-room__quota">
          Lượt chấm AI: <strong>{quota.gradingUsedToday}/{quota.gradingLimitDaily}</strong>
        </p>
      )}

      <div className="exam-sidebar__history">
        <button
          type="button"
          className="exam-sidebar__history-toggle exam-sidebar__history-toggle--mobile"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
        >
          📜 Bài đã nộp {historyOpen ? '▾' : '▸'}
        </button>
        <div className={`exam-sidebar__history-body${historyOpen ? ' open' : ''}`}>
          <p className="exam-sidebar__history-title exam-sidebar__history-title--desktop">📜 Bài đã nộp</p>
          <RecentSubmissions
            userId={userId}
            questionNumber={questionNumber}
            selectedId={viewingHistoryId}
            onSelect={onSelectHistory}
            compact={compact}
          />
        </div>
      </div>
    </aside>
  );
}
