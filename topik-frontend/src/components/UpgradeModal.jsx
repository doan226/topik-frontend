import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';

const VIETQR_BASE =
  'https://img.vietqr.io/image/Vietinbank-104877193050-compact2.png';

const FALLBACK_SKUS = [
  { code: 'TOPIKVIET', price: 89000, title: 'Viết 90 ngày', subtitle: 'Chấm AI 15 lượt/ngày · Câu 51–54' },
  { code: 'TOPIKVIP', price: 129000, title: 'Viết trọn đời', subtitle: 'Chấm AI 20 lượt/ngày · Câu 51–54' },
  { code: 'TOPIKI', price: 99000, title: 'TOPIK I Pack', subtitle: '~20 bộ đề cấp 1&2 + giải thích' },
  { code: 'TOPIKHANJA', price: 79000, title: 'Hán Hàn Pack', subtitle: '90 từ + intermediate · SRS unlimited' },
  { code: 'TOPIKALL', price: 189000, title: 'All-in', subtitle: 'Viết + TOPIK I + Hán Hàn' },
];

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
}

export default function UpgradeModal({
  open,
  userId,
  isCheckingPayment,
  onClose,
  onCheckPayment,
  onPremiumSuccess,
  initialSku = 'TOPIKVIP',
}) {
  const [skus, setSkus] = useState(FALLBACK_SKUS);
  const [selectedCode, setSelectedCode] = useState(initialSku);

  useEffect(() => {
    if (!open) return;
    apiFetch('/api/v1/products/skus')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) setSkus(data);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;

    const check = async () => {
      try {
        const res = await apiFetch(`/api/v1/payment/check-vip/${userId}`);
        const data = await res.json();
        if (data.hasWriting || data.role === 'PREMIUM_USER' || data.role === 'PREMIUM') {
          onPremiumSuccess(data.role || 'PREMIUM_USER', data);
        }
      } catch {
        /* silent poll */
      }
    };

    const pollRef = setInterval(check, 5000);
    return () => clearInterval(pollRef);
  }, [open, userId, onPremiumSuccess]);

  const selected = useMemo(
    () => skus.find((s) => s.code === selectedCode) || skus[1] || skus[0],
    [skus, selectedCode]
  );

  if (!open) return null;

  const qrUrl = `${VIETQR_BASE}?amount=${selected.price}&addInfo=${encodeURIComponent(`${selected.code} ${userId}`)}&accountName=${encodeURIComponent('DOAN HONG ANH')}`;

  return (
    <div className="upgrade-modal-overlay">
      <div className="upgrade-modal-card">
        <h2 className="upgrade-modal-title">Chọn gói TOPIK AI</h2>
        <p className="upgrade-modal-desc">
          Quét VietQR — hệ thống tự kiểm tra mỗi 5 giây. Ghi đúng nội dung chuyển khoản.
        </p>

        <div className="upgrade-modal-skus">
          {skus.map((sku) => (
            <button
              key={sku.code}
              type="button"
              className={`upgrade-modal-sku${selected.code === sku.code ? ' active' : ''}`}
              onClick={() => setSelectedCode(sku.code)}
            >
              <strong>{sku.title}</strong>
              <span>{formatVnd(sku.price)}</span>
              <small>{sku.subtitle}</small>
            </button>
          ))}
        </div>

        <div className="upgrade-modal-qr">
          <img src={qrUrl} alt="Mã QR thanh toán" className="upgrade-modal-qr-img" />
          <div className="upgrade-modal-qr-meta">
            <div>
              <span>Số tiền:</span>
              <strong>{formatVnd(selected.price)}</strong>
            </div>
            <div className="upgrade-modal-qr-code">
              <span>Nội dung:</span>
              <strong>{selected.code} {userId}</strong>
            </div>
          </div>
        </div>

        <p className="upgrade-modal-poll">⏳ Đang tự động kiểm tra thanh toán...</p>

        <div className="upgrade-modal-actions">
          <button type="button" className="upgrade-modal-btn-cancel" onClick={onClose}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="upgrade-modal-btn-confirm"
            onClick={onCheckPayment}
            disabled={isCheckingPayment}
          >
            {isCheckingPayment ? 'Đang kiểm tra...' : 'Tôi đã chuyển tiền'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { FALLBACK_SKUS, formatVnd, VIETQR_BASE };
