import assert from 'node:assert/strict';
import test from 'node:test';

import { EvaluationProfileRegistry } from './evaluation-profile.registry';

const signal = {
  id: 'signal-1',
  version: 1,
  code: 'LITERAL_METAPHYSICAL_ESCALATION',
  direction: 'CRITICAL',
  severity: 'HIGH',
  dimensions: ['METAPHYSICAL_CERTAINTY'],
};

function validInput() {
  return {
    questionVersionId: 'question-v1',
    rubric: { id: 'rubric-1', version: 1, guidance: 'Assess literal claims.' },
    answerText: 'The response claims literal soul recognition.',
    evidenceReference: {
      kind: 'ASSESSMENT_ANSWER',
      referenceId: 'answer-1',
    },
    allowedSignals: [signal],
  };
}

function validEvidence() {
  return {
    observations: [{ signal, confidence: 0.9 }],
    ambiguity: { score: 0.1, reasons: [] },
    contradiction: { detected: false },
    followUpRecommended: false,
  };
}

test.beforeEach(() => {
  process.env.LXP_EVALUATION_PGS_GROUNDING_PROVIDER = 'openai';
  process.env.LXP_EVALUATION_PGS_GROUNDING_MODEL = 'gpt-evaluator';
});

test('resolves the allowlisted profile and validates its strict contract', () => {
  const profile = new EvaluationProfileRegistry().resolve(
    '1',
    'pgs-grounding-v1',
  );
  const input = profile.validateInput(validInput());
  const evidence = profile.parseEvidence(
    JSON.stringify(validEvidence()),
    input,
  );

  assert.equal(profile.providerId, 'openai');
  assert.equal(profile.model, 'gpt-evaluator');
  assert.match(
    profile.systemInstructions,
    /"ambiguity":\{"score":0\.0,"reasons":\[\]\}/,
  );
  assert.match(profile.systemInstructions, /no additional keys at any level/);
  assert.equal(evidence.observations[0]?.signal.id, 'signal-1');
});

test('rejects unsupported versions, profiles, and incomplete server configuration', () => {
  const registry = new EvaluationProfileRegistry();
  assert.throws(() => registry.resolve('2', 'pgs-grounding-v1'), /Unsupported/);
  assert.throws(() => registry.resolve('1', 'unknown'), /Unknown/);
  delete process.env.LXP_EVALUATION_PGS_GROUNDING_MODEL;
  assert.throws(
    () => registry.resolve('1', 'pgs-grounding-v1'),
    /not configured/,
  );
});

test('rejects invalid, oversized, tenant-spoofing, and execution-control input', () => {
  const profile = new EvaluationProfileRegistry().resolve(
    '1',
    'pgs-grounding-v1',
  );
  for (const input of [
    { ...validInput(), tenantId: 'other-tenant' },
    { ...validInput(), provider: 'attacker-provider' },
    { ...validInput(), model: 'attacker-model' },
    { ...validInput(), evaluatorUrl: 'https://attacker.invalid' },
    { ...validInput(), answerText: 'x'.repeat(10_001) },
    { ...validInput(), allowedSignals: [{ ...signal, confidence: 1 }] },
  ]) {
    assert.throws(() => profile.validateInput(input), /does not match/);
  }
});

test('rejects malformed or non-canonical evaluator evidence', () => {
  const profile = new EvaluationProfileRegistry().resolve(
    '1',
    'pgs-grounding-v1',
  );
  const input = profile.validateInput(validInput());
  const cases: unknown[] = [
    'not json',
    {},
    { ...validEvidence(), schemaVersion: '2' },
    { ...validEvidence(), allow: true },
    {
      ...validEvidence(),
      observations: [{ signal, confidence: Number.POSITIVE_INFINITY }],
    },
    {
      ...validEvidence(),
      observations: [
        { signal: { ...signal, id: 'unknown-signal' }, confidence: 0.5 },
      ],
    },
    {
      ...validEvidence(),
      ambiguity: { score: -0.1, reasons: [] },
    },
  ];

  for (const candidate of cases) {
    const content =
      typeof candidate === 'string' ? candidate : JSON.stringify(candidate);
    assert.throws(
      () => profile.parseEvidence(content, input),
      /does not match/,
    );
  }
});

export { validEvidence, validInput };
