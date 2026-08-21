import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { validate } from 'class-validator';

import { EvaluationController } from './evaluation.controller';
import { EvaluationRequestDto } from './dto/evaluation-request.dto';
import {
  evaluationAuthContext as authContext,
  evaluationInput as input,
} from './evaluation.test-fixtures';

test('authenticates only a service identity before delegating evaluation', async () => {
  const calls: unknown[] = [];
  const evaluations = {
    evaluate: async (...args: unknown[]) => {
      calls.push(args);
      return { evaluationId: 'evaluation-1' };
    },
  };
  const auth = {
    authenticateIntegrationClientRequest: async () => authContext,
  };
  const controller = new EvaluationController(
    evaluations as never,
    auth as never,
  );
  const request = {
    schemaVersion: '1',
    profileId: 'pgs-grounding-v1',
    input,
  };

  const result = await controller.evaluate(request, 'Bearer integration-key', {
    headers: {},
  } as never);
  assert.deepEqual(result, { evaluationId: 'evaluation-1' });
  assert.deepEqual(calls[0], [request, authContext]);
});

test('returns 401 for a missing or invalid service identity', async () => {
  for (const message of ['missing', 'invalid']) {
    const controller = new EvaluationController(
      {} as never,
      {
        authenticateIntegrationClientRequest: async () => {
          throw new UnauthorizedException(message);
        },
      } as never,
    );
    await assert.rejects(
      () =>
        controller.evaluate({} as never, undefined, { headers: {} } as never),
      (error: unknown) =>
        (error as { getStatus(): number }).getStatus() === 401,
    );
  }
});

test('request DTO forbids arbitrary execution controls', async () => {
  const dto = Object.assign(new EvaluationRequestDto(), {
    schemaVersion: '1',
    profileId: 'pgs-grounding-v1',
    input,
    provider: 'openai',
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  assert.ok(errors.some((error) => error.property === 'provider'));
});
