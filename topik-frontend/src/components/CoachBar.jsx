import { useMemo, useState } from 'react';
import { listDrafts } from '../hooks/useDraft';
import { getWritingTabForQuestion } from '../navigation';

const COLLAPSE_KEY = 'topik_coach_bar_collapsed';

export default function CoachBar({ user, profile, onNavigate }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const displayName = profile?.displayName || user?.username || user?.email || 'bạn';
  const streak = profile?.writingStreak?.count ?? 0;
  const weakest = profile?.weakestQuestion ?? 51;
  const dueMistakes = profile?.dueMistakes ?? 0;
  const action = profile?.nextBestAction;
  const daysAway = profile?.daysSinceLastActivity ?? 0;

  const draftHint = useMemo(() => {
    const userId = user?.userId ?? user?.id;
    const drafts = listDrafts(userId);
    return drafts[0] || null;
  }, [user]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const handleAction = () => {
    if (!action) return;
    if (action.type === 'review_mistakes') {
      onNavigate?.('dashboard');
      return;
    }
    const tab = action.tab || getWritingTabForQuestion(action.question || weakest);
    onNavigate?.(tab, { writingMode: action.writingMode || 'omr' });
  };

  if (!profile) return null;

  return (
    <div className={`coach-bar${collapsed ? ' coach-bar--collapsed' : ''}`}>
      <div className="coach-bar__content">
        {!collapsed && (
          <>
            <span className="coach-bar__greeting">Chào {displayName}!</span>
            {streak > 0 && (
              <span className="coach-bar__pill coach-bar__pill--streak">🔥 {streak} ngày</span>
            )}
            <span className="coach-bar__pill">Câu {weakest} yếu nhất</span>
            {dueMistakes > 0 && (
              <span className="coach-bar__pill coach-bar__pill--warn">{dueMistakes} lỗi cần ôn</span>
            )}
            {daysAway >= 3 && daysAway < 999 && (
              <span className="coach-bar__pill">Vắng {daysAway} ngày — quay lại nhé!</span>
            )}
            {draftHint && (
              <span className="coach-bar__pill coach-bar__pill--draft">
                Đang viết dở đề {draftHint.questionId}
              </span>
            )}
          </>
        )}
        {action && (
          <button type="button" className="coach-bar__cta app-btn-primary" onClick={handleAction}>
            {action.label || 'Luyện ngay'}
          </button>
        )}
      </div>
      <button
        type="button"
        className="coach-bar__toggle"
        onClick={toggleCollapse}
        aria-label={collapsed ? 'Mở coach bar' : 'Thu gọn coach bar'}
      >
        {collapsed ? '▾' : '▴'}
      </button>
    </div>
  );
}
