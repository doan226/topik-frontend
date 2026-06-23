import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { getUserId } from '../utils/userId';

export default function UserProfileBar({
  user,
  isPremium,
  onLogout,
  onUpgrade,
  onUserUpdate,
  showToast,
}) {
  const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const userId = getUserId(user);

  const toggleReminder = async () => {
    const next = !reminderEnabled;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/auth/preferences/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderEnabled: next }),
      });
      const data = await res.json();
      if (data.success) {
        setReminderEnabled(next);
        const updated = { ...user, reminderEnabled: next };
        localStorage.setItem('topik_user', JSON.stringify(updated));
        onUserUpdate(updated);
        showToast(next ? 'Đã bật email nhắc ôn tập (20h hàng ngày)' : 'Đã tắt email nhắc', 'success');
      } else {
        showToast(data.message || 'Không lưu được cài đặt', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi lưu cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <span style={{ color: '#666', marginRight: '8px' }}>Tài khoản:</span>
        <strong style={{ color: '#10b981' }}>{user.email || user.username || 'Học viên'}</strong>
        {isPremium ? (
          <span style={{ marginLeft: '10px', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef08a', color: '#a16207' }}>
            👑 PREMIUM
          </span>
        ) : (
          <span
            onClick={onUpgrade}
            onKeyDown={(e) => e.key === 'Enter' && onUpgrade()}
            role="button"
            tabIndex={0}
            title="Bấm để nâng cấp"
            style={{
              marginLeft: '10px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: '#e2e8f0',
              color: '#64748b',
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
            }}
          >
            🎓 FREE (Nâng cấp)
          </span>
        )}
        <label style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#64748b', cursor: saving ? 'wait' : 'pointer' }}>
          <input
            type="checkbox"
            checked={reminderEnabled}
            disabled={saving}
            onChange={toggleReminder}
            style={{ marginRight: '6px' }}
          />
          📧 Nhắc ôn tập qua email (20h)
        </label>
      </div>
      <button
        type="button"
        onClick={onLogout}
        style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
      >
        Đăng xuất
      </button>
    </div>
  );
}
