import { useState } from 'react';
import { apiFetch } from '../api/client';

const STEPS = [
  {
    title: 'Chào mừng đến TOPIK AI',
    body: 'Bảng điều khiển là trung tâm theo dõi tiến độ — xem điểm, lộ trình và lỗi cá nhân tại đây sau mỗi lần luyện.',
  },
  {
    title: 'Luyện viết thống nhất',
    body: 'Mỗi câu 51–54 có 2 tab: Ôn lý thuyết (flashcard, pattern, quiz) và Làm đề OMR (đề thật + chấm AI).',
  },
  {
    title: 'Chấm AI + OMR + lưu nháp',
    body: 'Gõ bài tiếng Hàn — giấy ô li (원고지) cập nhật theo thời gian thực. Bài được lưu nháp tự động. Nhấn Chấm điểm AI để nhận rubric chi tiết.',
  },
  {
    title: 'Free vs Premium',
    body: 'FREE: 2 lượt chấm AI/ngày, câu 54 khóa. Gói Viết: chấm nhiều hơn, đề mở rộng, mini-test. Hán Hàn pack riêng (79k).',
  },
  {
    title: 'Hán Hàn & Đọc/Nghe',
    body: 'Mở rộng với 100 từ TOPIK (SRS), 11 pack Hán Hàn và module Đọc/Nghe tương tác — không ảnh hưởng tiến độ Viết.',
  },
];

const TARGET_LEVELS = [
  { value: '', label: 'Chưa xác định' },
  { value: 'TOPIK_II_3', label: 'TOPIK II cấp 3' },
  { value: 'TOPIK_II_4', label: 'TOPIK II cấp 4' },
  { value: 'TOPIK_II_5', label: 'TOPIK II cấp 5' },
  { value: 'TOPIK_II_6', label: 'TOPIK II cấp 6' },
];

export default function Onboarding({ userId, onComplete }) {
  const [step, setStep] = useState(0);
  const [examDate, setExamDate] = useState('');
  const [targetLevel, setTargetLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const storageKey = `topik_onboarding_done_${userId}`;

  const finish = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/learner/goals/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: examDate || null,
          targetLevel: targetLevel || null,
          onboardingCompleted: true,
        }),
      });
    } catch {
      /* offline — still mark local */
    }
    localStorage.setItem(storageKey, '1');
    setSaving(false);
    onComplete();
  };

  const isGoalsStep = step === STEPS.length;
  const isLast = isGoalsStep;

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-card">
        {!isGoalsStep ? (
          <>
            <p className="onboarding-step-label">
              HƯỚNG DẪN NHANH · {step + 1}/{STEPS.length + 1}
            </p>
            <h3 className="onboarding-step-title">{STEPS[step].title}</h3>
            <p className="onboarding-step-body">{STEPS[step].body}</p>
          </>
        ) : (
          <>
            <p className="onboarding-step-label">MỤC TIÊU CÁ NHÂN · {STEPS.length + 1}/{STEPS.length + 1}</p>
            <h3 className="onboarding-step-title">WED sẽ theo dõi lộ trình của bạn</h3>
            <p className="onboarding-step-body" style={{ marginBottom: 16 }}>
              Chọn ngày thi và mục tiêu (có thể bỏ qua và cập nhật sau).
            </p>
            <label style={{ display: 'block', marginBottom: 12, fontSize: '0.9rem' }}>
              Ngày thi dự kiến
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="exam-sidebar__select"
                style={{ display: 'block', width: '100%', marginTop: 6 }}
              />
            </label>
            <label style={{ display: 'block', fontSize: '0.9rem' }}>
              Mục tiêu TOPIK
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="exam-sidebar__select"
                style={{ display: 'block', width: '100%', marginTop: 6 }}
              >
                {TARGET_LEVELS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="onboarding-actions">
          <button type="button" onClick={finish} className="onboarding-btn-skip" disabled={saving}>
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="onboarding-btn-next app-btn-primary"
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : isLast ? 'Bắt đầu học' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(userId) {
  if (!userId) return false;
  return !localStorage.getItem(`topik_onboarding_done_${userId}`);
}

export function resetOnboarding(userId) {
  if (!userId) return;
  localStorage.removeItem(`topik_onboarding_done_${userId}`);
}
