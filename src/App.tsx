import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import PricingPage from './components/PricingPage';
import ProgressDashboard from './ProgressDashboard';
import WritingQuestionPage from './components/WritingQuestionPage';
import Toast from './components/Toast';
import UpgradeModal from './components/UpgradeModal';
import Onboarding, { shouldShowOnboarding } from './components/Onboarding';
import HanjaPractice from './components/HanjaPractice';
import ListenReadHub from './components/ListenReadHub';
import Topik1Hub from './components/Topik1Hub';
import PageHeader from './components/PageHeader';
import { useToast } from './hooks/useToast';
import { useQuestions } from './hooks/useQuestions';
import { useEntitlements } from './hooks/useEntitlements';
import { getUserId, normalizeUser } from './utils/userId';
import { apiFetch } from './api/client';
import { clearAuth, getToken, setToken } from './api/auth';
import type { TabId, NavIntent, WritingTabId, WritingMode } from './navigation';
import {
  WRITING_TABS,
  WRITING_TAB_META,
  isWritingTab,
  tabFromPath,
  pathForTab,
  writingModeFromPath,
  listenReadSubFromPath,
  pathForListenReadSub,
} from './navigation';

const REDIRECT_KEY = 'topik_redirect';

export default function App() {
  const { toasts, showToast, dismissToast } = useToast();
  const location = useLocation();
  const routerNavigate = useNavigate();

  const [user, setUser] = useState<any>(() => {
    try {
      if (!getToken()) return null;
      const savedUser = localStorage.getItem('topik_user');
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return normalizeUser(typeof parsed === 'object' ? parsed : { email: savedUser, userId: 1 });
    } catch {
      clearAuth();
      return null;
    }
  });

  const [writingModes, setWritingModes] = useState<Partial<Record<WritingTabId, WritingMode>>>({});
  const [writingTopik, setWritingTopik] = useState<Partial<Record<WritingTabId, number>>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);

  const { questions } = useQuestions();
  const userId = getUserId(user);
  const {
    hasWriting,
    hasHanja,
    hasTopik1,
    gradingLimitDaily,
    refreshEntitlements,
  } = useEntitlements(userId);

  const activeTab: TabId = tabFromPath(location.pathname) ?? 'dashboard';
  const listenReadSub = listenReadSubFromPath(location.pathname);

  const navigateTo = (tab: TabId, opts?: Omit<NavIntent, 'tab'>) => {
    if (isWritingTab(tab)) {
      if (opts?.writingMode) {
        setWritingModes((prev) => ({ ...prev, [tab]: opts.writingMode! }));
      }
      if (opts?.initialTopik != null) {
        setWritingTopik((prev) => ({ ...prev, [tab]: opts.initialTopik! }));
      }
    }
    routerNavigate(pathForTab(tab, opts?.writingMode));
  };

  const setActiveTab = (tab: TabId) => {
    const mode = isWritingTab(tab) ? writingModes[tab] : undefined;
    routerNavigate(pathForTab(tab, mode));
  };

  const getWritingPageProps = (tabId: WritingTabId) => {
    const pathMode = writingModeFromPath(location.pathname);
    return {
      questionType: WRITING_TAB_META[tabId].questionType,
      initialMode: pathMode ?? writingModes[tabId] ?? 'theory',
      initialTopik: writingTopik[tabId],
    };
  };

  useEffect(() => {
    if (user && userId && shouldShowOnboarding(userId)) {
      setShowOnboarding(true);
    }
  }, [user, userId]);

  useEffect(() => {
    if (user && (location.pathname === '/' || location.pathname === '')) {
      routerNavigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname, routerNavigate]);

  useEffect(() => {
    if (!user && location.pathname !== '/' && location.pathname !== '' && location.pathname !== '/pricing') {
      sessionStorage.setItem(REDIRECT_KEY, location.pathname);
      routerNavigate('/', { replace: true });
    }
  }, [user, location.pathname, routerNavigate]);

  const handleCheckPayment = async () => {
    setIsCheckingPayment(true);
    try {
      const response = await apiFetch(`/api/v1/payment/check-vip/${userId}`);
      const data = await response.json();

      if (data.hasWriting || data.role === 'PREMIUM_USER' || data.role === 'PREMIUM') {
        const updatedUser = { ...user, role: data.role || 'PREMIUM_USER' };
        setUser(updatedUser);
        localStorage.setItem('topik_user', JSON.stringify(updatedUser));
        setShowUpgradeModal(false);
        setShowPremiumSuccess(true);
        refreshEntitlements();
        showToast('Thanh toán thành công! Gói đã được kích hoạt.', 'success');
      } else {
        showToast('Chưa nhận được tiền. Vui lòng chờ ~5 giây rồi thử lại.', 'warning');
      }
    } catch (error) {
      console.error('Lỗi kiểm tra VIP:', error);
      showToast('Mất kết nối máy chủ kiểm tra thanh toán.', 'error');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handlePremiumSuccess = (role: string) => {
    const updatedUser = { ...user, role: role || 'PREMIUM_USER' };
    setUser(updatedUser);
    localStorage.setItem('topik_user', JSON.stringify(updatedUser));
    setShowUpgradeModal(false);
    setShowPremiumSuccess(true);
    refreshEntitlements();
    showToast('Chúc mừng! Gói của bạn đã được kích hoạt.', 'success');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    routerNavigate('/');
  };

  const handleLogin = (userData: unknown) => {
    const data = userData as Record<string, unknown>;
    if (data.token) setToken(String(data.token));
    const { token: _token, ...profile } = data;
    const normalized = normalizeUser(profile);
    localStorage.setItem('topik_user', JSON.stringify(normalized));
    setUser(normalized);
    const redirect = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    routerNavigate(redirect && redirect !== '/' ? redirect : '/dashboard');
    if (shouldShowOnboarding(getUserId(normalized))) {
      setShowOnboarding(true);
    }
  };

  if (!user) {
    return (
      <>
        <Routes>
          <Route
            path="/pricing"
            element={
              <PricingPage onLoginClick={() => routerNavigate('/')} />
            }
          />
          <Route
            path="*"
            element={<LandingPage onLogin={handleLogin} showToast={showToast} />}
          />
        </Routes>
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const isPremium = hasWriting;

  return (
    <div className="topik-app">
      {location.pathname === '/pricing' ? (
        <PricingPage
          userId={userId}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />
      ) : (
        <>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isPremium={isPremium}
        onLogout={handleLogout}
        onUpgrade={() => setShowUpgradeModal(true)}
        onUserUpdate={setUser}
        showToast={showToast}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {showOnboarding && (
        <Onboarding userId={userId} onComplete={() => setShowOnboarding(false)} />
      )}

      {showPremiumSuccess && (
        <div className="app-modal-overlay">
          <div className="app-modal-card app-modal-premium">
            <h2 className="app-modal-premium-title">👑 Chúc mừng PREMIUM!</h2>
            <ul className="app-modal-premium-list">
              <li>Ôn luyện câu 51–54 không giới hạn</li>
              <li>Chấm AI không giới hạn (kể cả câu 54)</li>
              <li>Đề mở rộng + mini-test không giới hạn</li>
              <li>Lưu &quot;chưa thuộc&quot; không giới hạn</li>
              <li>Hán Hàn: quiz &amp; SRS không giới hạn, mở full pack</li>
            </ul>
            <button type="button" className="app-btn-premium-action" onClick={() => setShowPremiumSuccess(false)}>
              Bắt đầu học
            </button>
          </div>
        </div>
      )}

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <ProgressDashboard
            userId={userId}
            isPremium={isPremium}
            hasHanja={hasHanja}
            showToast={showToast}
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onNavigate={navigateTo}
          />
        )}
        {WRITING_TABS.map((tabId) =>
          activeTab === tabId ? (
            <WritingQuestionPage
              key={tabId}
              user={user}
              isPremium={isPremium}
              hasWriting={hasWriting}
              questions={questions}
              showToast={showToast}
              onUpgradeClick={() => setShowUpgradeModal(true)}
              onShowHelp={() => setShowOnboarding(true)}
              {...getWritingPageProps(tabId)}
            />
          ) : null
        )}
        {activeTab === 'listenread' && (
          <>
            <PageHeader
              title="Luyện"
              highlight="Đọc & Nghe"
              subtitle="Audio tương tác, tra từ điển nhanh và chấm trắc nghiệm — không ảnh hưởng module Viết."
            />
            <nav className="hanja-hub-chip-row" style={{ marginBottom: 16 }} aria-label="Chọn cấp TOPIK">
              <button
                type="button"
                className={`hanja-hub-chip${listenReadSub === 'topik2' ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => routerNavigate(pathForListenReadSub('topik2'))}
              >
                TOPIK II
              </button>
              <button
                type="button"
                className={`hanja-hub-chip${listenReadSub === 'topik1' ? ' hanja-hub-chip--active' : ''}`}
                onClick={() => routerNavigate(pathForListenReadSub('topik1'))}
              >
                TOPIK I
              </button>
            </nav>
            {listenReadSub === 'topik1' ? (
              <Topik1Hub
                userId={userId}
                hasTopik1={hasTopik1}
                showToast={showToast}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            ) : (
              <ListenReadHub
                userId={userId}
                isPremium={isPremium}
                hasWriting={hasWriting}
                showToast={showToast}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}
          </>
        )}
        {activeTab === 'hanja' && (
          <>
            <PageHeader
              title="Học"
              highlight="Hán Hàn & Từ vựng"
              subtitle="FSRS ôn tập, 11 chuyên ngành, tra cứu pack và quiz — đồng bộ MySQL."
            />
            <HanjaPractice
              showToast={showToast}
              userId={userId}
              isPremium={hasHanja}
              hasHanja={hasHanja}
              onUpgradeClick={() => setShowUpgradeModal(true)}
            />
          </>
        )}
      </main>
        </>
      )}

      <UpgradeModal
        open={showUpgradeModal}
        userId={userId}
        isCheckingPayment={isCheckingPayment}
        onClose={() => setShowUpgradeModal(false)}
        onCheckPayment={handleCheckPayment}
        onPremiumSuccess={handlePremiumSuccess}
      />
    </div>
  );
}
