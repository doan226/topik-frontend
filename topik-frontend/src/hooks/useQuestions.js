import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { questionBank as fallbackBank } from '../QuestionBank.js';
import { questionKey } from '../utils/questionKey.js';

export function useQuestions() {
  const [questions, setQuestions] = useState(fallbackBank);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/v1/questions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && !cancelled) {
            const allowedKeys = new Set(fallbackBank.map((q) => questionKey(q)));
            const byKey = new Map(fallbackBank.map((q) => [questionKey(q), q]));
            data.forEach((q) => {
              const normalized = {
                ...q,
                source: q.source || (q.expansionSet ? 'expansion' : 'official'),
                expansionSet: q.expansionSet ?? null,
              };
              const key = questionKey(normalized);
              if (allowedKeys.has(key)) {
                byKey.set(key, normalized);
              }
            });
            setQuestions(
              [...byKey.values()].sort((a, b) => {
                const aOff = a.source === 'official' ? 0 : 1;
                const bOff = b.source === 'official' ? 0 : 1;
                if (aOff !== bOff) return aOff - bOff;
                const aNum = a.source === 'official' ? a.topik : a.expansionSet;
                const bNum = b.source === 'official' ? b.topik : b.expansionSet;
                return aNum - bNum || a.type - b.type;
              })
            );
          }
        }
      } catch {
        /* use fallback */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { questions, loading };
}
