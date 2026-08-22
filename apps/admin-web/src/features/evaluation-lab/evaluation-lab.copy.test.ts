import { expect, test } from 'vitest';

import { getEvaluationLabCopy } from './evaluation-lab.copy';

test('Evaluation Lab exposes consistent English and French operator copy', () => {
  const english = getEvaluationLabCopy('en-CA');
  const french = getEvaluationLabCopy('fr-CA');

  expect(english.title).toBe('Evaluation Lab');
  expect(english.run).toBe('Run evaluation');
  expect(english.timeout).toMatch(/timed out/i);
  expect(french.title).toBe("Laboratoire d'évaluation");
  expect(french.run).toBe("Lancer l'évaluation");
  expect(french.timeout).toMatch(/expiré/i);
  expect(Object.keys(french).sort()).toEqual(Object.keys(english).sort());
});
