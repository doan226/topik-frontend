import { loadLocalSrsState } from '../../../utils/hanjaSrs';
import { migrateLocalSrs } from '../../lib/apiClient';

const MIGRATED_PREFIX = 'topik_fsrs_migrated_';

export interface CharMeta {
  word: string;
  meaning: string;
}

export async function runClientMigration(
  userId: string | number,
  charMeta: Record<string, CharMeta>
) {
  if (!userId) return { migrated: 0, skipped: 0 };
  if (localStorage.getItem(`${MIGRATED_PREFIX}${userId}`) === '1') {
    return { migrated: 0, skipped: 0, alreadyDone: true };
  }

  const local = loadLocalSrsState(userId);
  const entries = Object.entries(local).map(([charId, card]) => ({
    charId,
    word: charMeta[charId]?.word || charId,
    meaning: charMeta[charId]?.meaning || 'Hán Hàn',
    repetitions: (card as { repetitions?: number }).repetitions ?? 0,
    interval: (card as { interval?: number }).interval ?? 0,
    easeFactor: (card as { easeFactor?: number }).easeFactor ?? 2.5,
    nextReview: (card as { nextReview?: string }).nextReview,
  }));

  let result = { migrated: 0, skipped: 0 };
  if (entries.length > 0) {
    const { data } = await migrateLocalSrs(userId, entries);
    result = { migrated: data.migrated ?? 0, skipped: data.skipped ?? 0 };
  }

  localStorage.setItem(`${MIGRATED_PREFIX}${userId}`, '1');
  return result;
}
