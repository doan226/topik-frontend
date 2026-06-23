import React, { useState } from 'react';

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

export default function Onboarding({ userId, onComplete }) {
  const [step, setStep] = useState(0);
  const storageKey = `topik_onboarding_done_${userId}`;

  const finish = () => {
    localStorage.setItem(storageKey, '1');
    onComplete();
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-card">
        <p className="onboarding-step-label">
          HƯỚNG DẪN NHANH · {step + 1}/{STEPS.length}
        </p>
        <h3 className="onboarding-step-title">{STEPS[step].title}</h3>
        <p className="onboarding-step-body">{STEPS[step].body}</p>
        <div className="onboarding-actions">
          <button type="button" onClick={finish} className="onboarding-btn-skip">
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="onboarding-btn-next app-btn-primary"
          >
            {isLast ? 'Bắt đầu học' : 'Tiếp theo'}
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
