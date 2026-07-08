import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { loadMistakeCards, syncMistakesToServer } from '../utils/mistakeCards';

const LearnerProfileContext = createContext(null);

export function LearnerProfileProvider({ userId, children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const syncedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      if (!syncedRef.current) {
        const localCards = loadMistakeCards(userId);
        if (localCards.length > 0) {
          await syncMistakesToServer(userId, localCards);
        }
        syncedRef.current = true;
      }
      const res = await apiFetch(`/api/v1/learner/profile/${userId}`);
      if (!res.ok) throw new Error('Không tải được hồ sơ học viên');
      const data = await res.json();
      setProfile(data);
      return data;
    } catch (err) {
      setError(err.message || 'Lỗi tải profile');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    syncedRef.current = false;
    refreshProfile();
  }, [userId, refreshProfile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      refreshProfile,
      nextBestAction: profile?.nextBestAction ?? null,
      dueMistakes: profile?.dueMistakes ?? 0,
      pendingRewrites: profile?.pendingRewrites ?? 0,
      writingStreak: profile?.writingStreak ?? { count: 0, lastDate: '' },
      weakestQuestion: profile?.weakestQuestion ?? 51,
    }),
    [profile, loading, error, refreshProfile]
  );

  return (
    <LearnerProfileContext.Provider value={value}>
      {children}
    </LearnerProfileContext.Provider>
  );
}

export function useLearnerProfile() {
  const ctx = useContext(LearnerProfileContext);
  if (!ctx) {
    throw new Error('useLearnerProfile must be used within LearnerProfileProvider');
  }
  return ctx;
}

export function useLearnerProfileOptional() {
  return useContext(LearnerProfileContext);
}

export default useLearnerProfile;
