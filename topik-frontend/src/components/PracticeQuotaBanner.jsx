import React from 'react';
import { formatQuotaLabel } from '../config/practiceFreeTier';

export default function PracticeQuotaBanner({ feature, isPremium, periodLabel }) {
  if (isPremium || !feature) return null;
  if (feature.limit === -1) return null;

  const exhausted = !feature.canUse;

  return (
    <div className={`quota-banner ${exhausted ? 'quota-banner--exhausted' : 'quota-banner--ok'}`}>
      {exhausted
        ? `Đã hết lượt miễn phí${periodLabel ? ` (${periodLabel})` : ''}. Nâng cấp PREMIUM để luyện không giới hạn.`
        : `FREE: ${formatQuotaLabel(feature)}${periodLabel ? ` · reset ${periodLabel}` : ''}`}
    </div>
  );
}

export function PremiumLockOverlay({ message, onUpgrade }) {
  return (
    <div className="practice-card premium-lock-overlay">
      <div className="premium-lock-overlay__icon">🔒</div>
      <p className="premium-lock-overlay__message">
        {message || 'Nội dung này dành cho PREMIUM.'}
      </p>
      {onUpgrade && (
        <button type="button" onClick={onUpgrade} className="app-btn-premium">
          ⭐ Nâng cấp PREMIUM
        </button>
      )}
    </div>
  );
}
