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

/** List in-progress drafts for welcome-back prompts. */
export function listDrafts(userId) {
  if (!userId || typeof localStorage === 'undefined') return [];
  const prefix = `topik_draft_${userId}_`;
  const drafts = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const questionId = key.slice(prefix.length);
    const text = localStorage.getItem(key) || '';
    if (!text.trim()) continue;
    drafts.push({ questionId, charCount: text.replace(/\s/g, '').length, preview: text.slice(0, 40) });
  }
  return drafts;
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
