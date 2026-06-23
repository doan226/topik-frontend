/** Mirror backend UsageQuotaService constants — keep in sync */

export const FREE_DAILY_GRADING = 2;

export const LIMITS = {
  exercise51Weekly: 5,
  exercise52Weekly: 5,
  chart53Weekly: 1,
  quiz54Daily: 10,
  hanjaQuizDaily: 5,
  hanjaSrsDaily: 5,
  hanjaSrsCardsPerSession: 10,
  passageSrsDaily: 3,
  passageSrsCardsPerSession: 10,
  savedItems: 20,
};

export const FEATURE_KEYS = {
  exercise51: 'exercise_51',
  exercise52: 'exercise_52',
  chart53Exam: 'chart53_exam',
  quiz54: 'quiz_54',
  hanjaQuiz: 'hanja_quiz',
  hanjaSrs: 'hanja_srs',
  passageSrs: 'passage_srs',
};

/** Free hanja packs — unlimited tra cứu */
export const FREE_HANJA_PACK_IDS = ['topik100-frequent', 'beginner-core'];

/** SRS sessions per day (each session = 10 cards) */
export const FREE_HANJA_SRS_DAILY = 5;
export const FREE_HANJA_SRS_CARDS_PER_SESSION = 10;
export const FREE_PASSAGE_SRS_DAILY = 3;
export const FREE_PASSAGE_SRS_CARDS_PER_SESSION = 10;
export const FREE_HANJA_QUIZ_DAILY = 5;
export const FREE_HANJA_RADICAL_LIMIT = 30;

/** First 4 vocab topics from vocab-54-topics.json (free tier) */
export const FREE_VOCAB54_TOPIC_IDS = ['youth', 'birth-rate', 'smoking', 'aging'];

/** Expression kinds free for non-premium */
export const FREE_EXPR54_KINDS = ['opening', 'closing'];

export const FREE_EXPR54_KIND_OPTIONS = [
  { id: 'all', label: 'Mở bài + Kết bài' },
  { id: 'opening', label: 'Mở bài' },
  { id: 'closing', label: 'Kết bài' },
];

export function exerciseFeatureKey(questionType) {
  return questionType === 51 ? FEATURE_KEYS.exercise51 : FEATURE_KEYS.exercise52;
}

export function isFreeVocabTopic(topicId) {
  return FREE_VOCAB54_TOPIC_IDS.includes(topicId);
}

export function isFreeExprKind(kindId) {
  return kindId === 'all' || FREE_EXPR54_KINDS.includes(kindId);
}

export function isFreeHanjaPack(packId) {
  return FREE_HANJA_PACK_IDS.includes(packId);
}

export function formatQuotaLabel(feature) {
  if (!feature) return '';
  if (feature.limit === -1) return 'Không giới hạn';
  const left = Math.max(0, feature.limit - feature.used);
  return `Còn ${left}/${feature.limit} lượt`;
}
