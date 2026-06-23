import { officialQuestionBank } from './officialQuestionBank.js';
import { expansionQuestionBank } from './expansionQuestionBank.js';

export const questionBank = [...officialQuestionBank, ...expansionQuestionBank];

export { officialQuestionBank, expansionQuestionBank };
