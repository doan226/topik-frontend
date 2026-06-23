import { useEffect, useCallback } from 'react';

export function draftKey(userId, questionId) {
  return `topik_draft_${userId}_${questionId}`;
}

/** @deprecated use draftKey(userId, questionId) */
export function draftKeyLegacy(userId, topik, type) {
  return `topik_draft_${userId}_${topik}_${type}`;
}

export function loadDraft(userId, questionId) {
  try {
    return localStorage.getItem(draftKey(userId, questionId)) || '';
  } catch {
    return '';
  }
}

export function clearDraft(userId, questionId) {
  try {
    localStorage.removeItem(draftKey(userId, questionId));
  } catch {
    /* ignore */
  }
}

export function useDraftSave(userId, questionId, text) {
  useEffect(() => {
    if (!userId || questionId == null) return;
    const key = draftKey(userId, questionId);
    if (text && text.trim()) {
      localStorage.setItem(key, text);
    }
  }, [userId, questionId, text]);
}

export function useDraftLoaded(userId, questionId, setAnswer) {
  const load = useCallback(() => {
    if (!userId) return '';
    const saved = loadDraft(userId, questionId);
    if (saved) setAnswer(saved);
    return saved;
  }, [userId, questionId, setAnswer]);

  return load;
}
