import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

const DEFAULT_ENTITLEMENTS = {
  hasWriting: false,
  hasHanja: false,
  hasTopik1: false,
  allIn: false,
  isPremium: false,
  writingExpiresAt: null,
  gradingLimitDaily: 2,
  gradingUsedToday: 0,
  canGrade: true,
  aiExplainLimitDaily: 3,
  role: 'FREE_USER',
  entitlements: [],
};

export function useEntitlements(userId) {
  const [entitlements, setEntitlements] = useState(DEFAULT_ENTITLEMENTS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setEntitlements(DEFAULT_ENTITLEMENTS);
      return null;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/entitlements/${userId}`);
      const data = await res.json();
      const merged = {
        ...DEFAULT_ENTITLEMENTS,
        ...data,
        isPremium: Boolean(data.hasWriting ?? data.isPremium),
        hasWriting: Boolean(data.hasWriting ?? data.isPremium),
        hasHanja: Boolean(data.hasHanja),
        hasTopik1: Boolean(data.hasTopik1),
        allIn: Boolean(data.allIn),
      };
      setEntitlements(merged);
      return merged;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...entitlements,
    loading,
    refreshEntitlements: refresh,
  };
}

export default useEntitlements;
