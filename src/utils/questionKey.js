/** Unique key for merge / draft when official topik or expansion set may overlap */
export function questionKey(q) {
  if (q.source === 'expansion' && q.expansionSet != null) {
    return `expansion-${q.expansionSet}-${q.type}`;
  }
  return `official-${q.topik}-${q.type}`;
}

export function isExpansionQuestion(q) {
  return q?.source === 'expansion';
}

export function isOfficialQuestion(q) {
  return q?.source === 'official' || (!q?.source && q?.topik > 0 && !q?.expansionSet);
}
