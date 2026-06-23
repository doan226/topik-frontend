import React, { useState } from 'react';
import { apiFetch } from './api/client';
import { setToken } from './api/auth';
import './styles/auth-theme.css';

function AuthScreen({ onLogin, showToast, variant = 'full' }) {
  const isModal = variant === 'modal';
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isVerifying) {
      if (!otpCode.trim()) return setError('Vui lòng nhập mã xác thực gồm 6 chữ số!');
      setLoading(true);
      try {
        const response = await apiFetch('/api/v1/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, code: otpCode }),
        });
        const data = await response.json();

        if (data.success) {
          showToast?.('Xác thực thành công! Hãy đăng nhập.', 'success');
          setIsVerifying(false);
          setIsLogin(true);
          setPassword('');
        } else {
          setError(data.message || 'Mã xác thực không chính xác!');
        }
      } catch {
        setError('Lỗi xác thực mã. Vui lòng thử lại!');
      }
      setLoading(false);
      return;
    }

    if (!username.trim() || !password.trim()) {
      return setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
    }
    if (!isLogin && !email.trim()) {
      return setError('Vui lòng nhập email để nhận thông báo ôn tập!');
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const payload = { username, password };
      if (!isLogin) payload.email = email;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          if (data.token) setToken(data.token);
          onLogin(data);
        } else {
          showToast?.('Đăng ký thành công! Kiểm tra email để lấy mã OTP.', 'success');
          setIsVerifying(true);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối đến máy chủ. Vui lòng kiểm tra Backend!');
    }
    setLoading(false);
  };

  return (
    <div className={`auth-screen-wrap${isModal ? ' modal' : ''}`}>
      <div className={`auth-screen-card${isModal ? '' : ' full'}`}>
        <div className="auth-screen-header">
          <h2 className="auth-screen-title">TOPIK AI MASTER</h2>
          <p className="auth-screen-sub">
            {isVerifying ? 'Xác thực tài khoản' : isLogin ? 'Đăng nhập để tiếp tục' : 'Đăng ký nhận nhắc ôn tập'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-screen-form">
          {error && <div className="auth-screen-error">{error}</div>}

          {isVerifying ? (
            <div>
              <label className="auth-screen-label">Mã OTP (6 số):</label>
              <input
                type="text"
                className="auth-screen-input otp"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Nhập mã từ email..."
                maxLength={6}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="auth-screen-label">Tên đăng nhập:</label>
                <input
                  type="text"
                  className="auth-screen-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username..."
                />
              </div>
              {!isLogin && (
                <div>
                  <label className="auth-screen-label">Email:</label>
                  <input
                    type="email"
                    className="auth-screen-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email..."
                  />
                </div>
              )}
              <div>
                <label className="auth-screen-label">Mật khẩu:</label>
                <input
                  type="password"
                  className="auth-screen-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password..."
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`auth-screen-submit${isVerifying ? ' verify' : ''}`}
          >
            {loading ? '⌛ Đang xử lý...' : isVerifying ? '✅ XÁC NHẬN' : isLogin ? '🔑 ĐĂNG NHẬP' : '📝 ĐĂNG KÝ'}
          </button>
        </form>

        {!isVerifying && (
          <div className="auth-screen-switch">
            {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <span
              className="auth-screen-switch-link"
              onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (setIsLogin(!isLogin), setError(''), setPassword(''))}
              role="button"
              tabIndex={0}
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthScreen;
