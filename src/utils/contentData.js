import patternsData from '../../data/patterns-51-52.json';
import vocab54 from '../../data/vocab-54-topics.json';
import essay54 from '../../data/essay-54-templates.json';
import chart53 from '../../data/chart-53-bank.json';
import chart53Formula from '../../data/chart-53-formula.json';
import expressions54 from '../../data/expressions-54-bank.json';
import listenRead from '../../data/listen-read-bank.json';
import patternMappings from '../../data/pattern-mappings.json';

export const patterns = patternsData.items || [];
export const patternStats = patternsData.stats || {};
export const vocabTopics = vocab54.topics || [];
export const essayTemplates = essay54.items || [];
export const chart53Items = chart53.charts || [];
export const chart53FormulaData = chart53Formula;
export const expressions54Items = expressions54.items || [];
export const expressions54Stats = expressions54.stats || {};
export const listenReadItems = listenRead.items || [];
export const grammarMappings = patternMappings.mappings || [];

export function getPatternsByType(questionType) {
  return patterns.filter((i) => i.type === 'pattern' && i.questionType === questionType);
}

export function getExercisesByType(questionType) {
  return patterns.filter(
    (i) => i.type === 'exercise' && i.questionType === questionType && i.prompt
  );
}

export function getPatternById(id) {
  return patterns.find((i) => i.id === id);
}

export function getVocabGroupsByType(questionType) {
  return patterns.filter((i) => i.type === 'vocab-group' && i.questionType === questionType);
}

export function getConnectorsByType(questionType) {
  return patterns.filter((i) => i.type === 'connector' && i.questionType === questionType);
}

export function getExpressionCards5152(questionType) {
  return patterns
    .filter(
      (i) =>
        i.questionType === questionType &&
        (i.type === 'pattern' || i.type === 'connector')
    )
    .map((i) => ({
      id: i.id,
      kind: i.type,
      questionType,
      ko: i.patternKo,
      vi: i.reasonVi,
      forms: i.forms,
      exampleKo: i.exampleKo,
      commonWrong: i.commonWrong,
      topic: i.topic,
      label: i.type === 'connector' ? 'Liên từ' : 'Ngữ pháp',
    }));
}

export function getVocabCards5152(questionType, topicFilter = null) {
  return getVocabGroupsByType(questionType)
    .filter((g) => !topicFilter || g.topic === topicFilter)
    .flatMap((g) =>
      (g.terms || []).map((t) => ({
        id: `${g.id}:${t.ko}`,
        kind: 'vocab',
        questionType,
        ko: t.ko,
        vi: t.vi,
        topicKo: g.topicKo,
        topic: g.topic,
        label: g.topicKo,
      }))
    );
}

export function getPattern5152Stats(questionType) {
  return {
    patterns: getPatternsByType(questionType).length,
    connectors: getConnectorsByType(questionType).length,
    vocab: getVocabCards5152(questionType).length,
    exercises: getExercisesByType(questionType).length,
  };
}

export function getVocabTopic(topicId) {
  return vocabTopics.find((t) => t.topicId === topicId);
}

export function getEssayItemsByType(type) {
  return essayTemplates.filter((i) => i.type === type);
}

export function getVocabCards(topicId = null) {
  return expressions54Items.filter(
    (i) => i.type === 'vocab' && (!topicId || i.topicId === topicId)
  );
}

export function getExpressionCards() {
  return expressions54Items.filter((i) => i.type !== 'vocab');
}

export function getExpressionCardsByKind(kind = 'all') {
  if (kind === 'all') return getExpressionCards();
  return expressions54Items.filter((i) => i.type === kind);
}

export function getChart53SampleEssays() {
  return chart53Items.filter((i) => i.type === 'sample-essay');
}

export function getChart53Outlines() {
  return chart53Items.filter((i) => i.type === 'situation-outline');
}

export function getChart53ChartSlots() {
  return chart53Items.filter((i) => i.type === 'chart' || i.type === 'chart-group');
}

export function getChart53Formula() {
  return chart53FormulaData;
}
