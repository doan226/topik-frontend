import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { FEATURE_KEYS, LIMITS } from '../config/practiceFreeTier';

const FEATURE_MAP = {
  [FEATURE_KEYS.exercise51]: 'exercise51',
  [FEATURE_KEYS.exercise52]: 'exercise52',
  [FEATURE_KEYS.chart53Exam]: 'chart53',
  [FEATURE_KEYS.quiz54]: 'quiz54',
  [FEATURE_KEYS.hanjaQuiz]: 'hanjaQuiz',
  [FEATURE_KEYS.hanjaSrs]: 'hanjaSrs',
  [FEATURE_KEYS.passageSrs]: 'passageSrs',
};

export function usePracticeQuota(userId, isPremium) {
  const [quota, setQuota] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setQuota(null);
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/dashboard/quota/${userId}`);
      if (res.ok) {
        setQuota(await res.json());
      }
    } catch {
      /* offline — use local fallbacks */
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh, isPremium]);

  const getFeature = useCallback((featureKey) => {
    const block = quota?.practice?.[FEATURE_MAP[featureKey]];
    if (block) return block;
    if (isPremium) {
      return { used: 0, limit: -1, canUse: true, featureKey };
    }
    const fallbackLimits = {
      [FEATURE_KEYS.exercise51]: LIMITS.exercise51Weekly,
      [FEATURE_KEYS.exercise52]: LIMITS.exercise52Weekly,
      [FEATURE_KEYS.chart53Exam]: LIMITS.chart53Weekly,
      [FEATURE_KEYS.quiz54]: LIMITS.quiz54Daily,
      [FEATURE_KEYS.hanjaQuiz]: LIMITS.hanjaQuizDaily,
      [FEATURE_KEYS.hanjaSrs]: LIMITS.hanjaSrsDaily,
      [FEATURE_KEYS.passageSrs]: LIMITS.passageSrsDaily,
    };
    const limit = fallbackLimits[featureKey] ?? 0;
    return { used: 0, limit, canUse: true, featureKey };
  }, [quota, isPremium]);

  const consume = useCallback(async (featureKey) => {
    if (isPremium) {
      return { success: true };
    }
    if (!userId) {
      return { success: false, message: 'Cần đăng nhập để luyện tập.' };
    }
    try {
      const res = await apiFetch('/api/v1/practice/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featureKey }),
      });
      const data = await res.json();
      await refresh();
      if (res.ok) {
        return { success: true, data };
      }
      return {
        success: false,
        quotaExceeded: data.quotaExceeded,
        message: data.message || 'Hết lượt miễn phí tuần này.',
        data,
      };
    } catch {
      return { success: false, message: 'Mất kết nối máy chủ quota.' };
    }
  }, [userId, isPremium, refresh]);

  const savedLimit = isPremium ? -1 : (quota?.practice?.savedLimit ?? LIMITS.savedItems);

  return {
    quota,
    refresh,
    consume,
    getFeature,
    savedLimit,
  };
}
