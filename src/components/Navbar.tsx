import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { getUserId } from '../utils/userId';
import ThemeToggle from './ThemeToggle';
import type { TabId, WritingTabId } from '../navigation';
import { WRITING_TABS, WRITING_TAB_META } from '../navigation';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
  user: any;
  isPremium: boolean;
  onLogout: () => void;
  onUpgrade: () => void;
  onUserUpdate?: (user: any) => void;
  showToast?: (msg: string, type?: string) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  isPremium,
  onLogout,
  onUpgrade,
  onUserUpdate,
  showToast,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [writingOpen, setWritingOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const writingMenuRef = useRef<HTMLDivElement | null>(null);
  const userId = getUserId(user);

  const isWritingActive = WRITING_TABS.includes(activeTab as WritingTabId);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
      if (writingMenuRef.current && !writingMenuRef.current.contains(e.target as Node)) {
        setWritingOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        onUserUpdate?.(updated);
        showToast?.(next ? 'Đã bật email nhắc ôn tập (20h hàng ngày)' : 'Đã tắt email nhắc', 'success');
      } else {
        showToast?.(data.message || 'Không lưu được cài đặt', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi lưu cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const email = user?.email || user?.username || 'Học viên';
  const initial = email.charAt(0).toUpperCase();

  const goTab = (id: TabId) => {
    setActiveTab(id);
    setMenuOpen(false);
    setWritingOpen(false);
  };

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <div className="app-logo">
          <div className="app-logo-icon">✍️</div>
          <div className="app-logo-text">
            TOPIK <span>AI</span>
          </div>
        </div>

        <button type="button" className="app-nav-toggle" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
          ☰
        </button>

        <div className={`app-nav-links${menuOpen ? ' open' : ''}`}>
          <button
            type="button"
            className={`app-nav-link${activeTab === 'dashboard' ? ' active' : ''}`}
            onClick={() => goTab('dashboard')}
          >
            Bảng điều khiển
          </button>

          <div
            ref={writingMenuRef}
            className={`app-nav-group${writingOpen ? ' open' : ''}${isWritingActive ? ' has-active' : ''}`}
          >
            <button
              type="button"
              className={`app-nav-link app-nav-group-toggle${isWritingActive ? ' active' : ''}`}
              onClick={() => setWritingOpen((v) => !v)}
              aria-expanded={writingOpen}
              aria-haspopup="true"
            >
              Luyện viết <span className="app-nav-chevron" aria-hidden>▾</span>
            </button>
            <div className="app-nav-submenu">
              {WRITING_TABS.map((tabId) => (
                <button
                  key={tabId}
                  type="button"
                  className={`app-nav-sublink${activeTab === tabId ? ' active' : ''}`}
                  onClick={() => goTab(tabId)}
                >
                  {WRITING_TAB_META[tabId].label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`app-nav-link${activeTab === 'hanja' ? ' active' : ''}`}
            onClick={() => goTab('hanja')}
          >
            Hán Hàn
          </button>
          <button
            type="button"
            className={`app-nav-link${activeTab === 'listenread' ? ' active' : ''}`}
            onClick={() => goTab('listenread')}
          >
            Đọc/Nghe
          </button>
        </div>

        <div className="app-nav-actions">
          <ThemeToggle />

          {!isPremium && (
            <button type="button" className="app-btn-premium" onClick={onUpgrade}>
              ⭐ Premium
            </button>
          )}

          <div className="app-user-menu" ref={userMenuRef}>
            <button type="button" className="app-user-btn" onClick={() => setUserOpen((v) => !v)} aria-expanded={userOpen}>
              <span className="app-user-avatar">{initial}</span>
              <span className="app-user-email">{email}</span>
              <span aria-hidden>▾</span>
            </button>

            {userOpen && (
              <div className="app-user-dropdown">
                <div className="app-user-dropdown-header">
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>{email}</div>
                  {isPremium ? (
                    <span className="app-badge app-badge-premium">👑 PREMIUM</span>
                  ) : (
                    <span
                      className="app-badge app-badge-free"
                      role="button"
                      tabIndex={0}
                      onClick={onUpgrade}
                      onKeyDown={(e) => e.key === 'Enter' && onUpgrade?.()}
                    >
                      🎓 FREE — Nâng cấp
                    </span>
                  )}
                </div>

                <label className="app-toggle-row">
                  <input type="checkbox" checked={reminderEnabled} disabled={saving} onChange={toggleReminder} />
                  📧 Nhắc ôn tập qua email (20h)
                </label>

                <button type="button" className="app-btn-logout" onClick={onLogout}>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
