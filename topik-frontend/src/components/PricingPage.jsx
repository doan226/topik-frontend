import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { FALLBACK_SKUS, formatVnd, VIETQR_BASE } from './UpgradeModal';
import ThemeToggle from './ThemeToggle';
import '../styles/landing.css';

export default function PricingPage({ userId, onLoginClick, onUpgradeClick }) {
  const [skus, setSkus] = useState(FALLBACK_SKUS);
  const [selectedCode, setSelectedCode] = useState('TOPIKVIP');

  useEffect(() => {
    apiFetch('/api/v1/products/skus')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) setSkus(data);
      })
      .catch(() => {});
  }, []);

  const selected = skus.find((s) => s.code === selectedCode) || skus[1];
  const qrUrl = userId
    ? `${VIETQR_BASE}?amount=${selected.price}&addInfo=${encodeURIComponent(`${selected.code} ${userId}`)}&accountName=${encodeURIComponent('DOAN HONG ANH')}`
    : null;

  return (
    <div className="landing pricing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo">
            <span className="landing-logo-icon">T</span>
            TOPIK AI
          </Link>
          <nav className="landing-nav">
            <Link to="/" className="landing-nav-link">Trang chủ</Link>
            <ThemeToggle />
            {!userId && (
              <button type="button" className="landing-btn-login" onClick={onLoginClick}>
                Đăng nhập
              </button>
            )}
          </nav>
        </div>
      </header>

      <section className="pricing-hero">
        <h1>Bảng giá TOPIK AI</h1>
        <p>Chuyên sâu luyện viết TOPIK II (51–54) · OMR số · chấm AI có giới hạn công bằng theo gói</p>
      </section>

      <section className="pricing-grid">
        {skus.map((sku) => (
          <article
            key={sku.code}
            className={`pricing-card${selectedCode === sku.code ? ' pricing-card--selected' : ''}${sku.code === 'TOPIKALL' ? ' pricing-card--featured' : ''}`}
            onClick={() => setSelectedCode(sku.code)}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedCode(sku.code)}
            role="button"
            tabIndex={0}
          >
            {sku.code === 'TOPIKALL' && <span className="pricing-badge">Tiết kiệm nhất</span>}
            <h3>{sku.title}</h3>
            <p className="pricing-price">{formatVnd(sku.price)}</p>
            <p className="pricing-sub">{sku.subtitle}</p>
            <p className="pricing-code">Mã CK: <code>{sku.code} {'{userId}'}</code></p>
          </article>
        ))}
      </section>

      {userId ? (
        <section className="pricing-qr-section">
          <h2>Thanh toán — {selected.title}</h2>
          {qrUrl && <img src={qrUrl} alt="VietQR" className="pricing-qr-img" />}
          <p>
            Nội dung: <strong>{selected.code} {userId}</strong> · {formatVnd(selected.price)}
          </p>
          {onUpgradeClick && (
            <button type="button" className="landing-btn-primary" onClick={onUpgradeClick}>
              Mở modal thanh toán
            </button>
          )}
        </section>
      ) : (
        <section className="pricing-cta">
          <p>Đăng nhập để hiện mã QR cá nhân hoá theo userId.</p>
          <button type="button" className="landing-btn-primary" onClick={onLoginClick}>
            Đăng nhập để mua gói →
          </button>
        </section>
      )}

      <section className="pricing-free">
        <h3>Gói Free</h3>
        <ul>
          <li>2 lượt chấm AI / ngày</li>
          <li>Luyện pattern câu 51–52, 1 đề demo</li>
          <li>Hán Hàn: 100 từ TOPIK + 20 gốc âm tra cứu</li>
        </ul>
      </section>
    </div>
  );
}
