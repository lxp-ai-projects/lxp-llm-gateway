import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertEvaluationResult,
  assertPgsGroundingInput,
  InvalidEvaluationResultError,
} from './structured-evaluations.js';

const fixtureRoot = new URL(
  '../test/fixtures/structured-evaluations/v1/',
  import.meta.url,
);

test('structured evaluation v1 golden request and response remain valid', async () => {
  const request = await fixture('valid-request.json');
  assertPgsGroundingInput(request.input);

  const response = await fixture('valid-response.json');
  assert.doesNotThrow(() => assertEvaluationResult(response));
});

for (const name of [
  'invalid-authoritative-response.json',
  'invalid-schema-response.json',
  'invalid-signal-response.json',
]) {
  test(`structured evaluation v1 rejects ${name}`, async () => {
    const response = await fixture(name);
    assert.throws(
      () => assertEvaluationResult(response),
      InvalidEvaluationResultError,
    );
  });
}

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), 'utf8')) as Record<
    string,
    unknown
  >;
}
