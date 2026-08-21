import assert from 'node:assert/strict';
import test from 'node:test';

import { IntegrationClientScopeService } from '../gateway/integration-client-scope.service';
import { ProviderCredentialUnavailableException } from '../gateway/provider-credential.service';
import { ModelAccessPolicyException } from '../gateway/tenant-model-access-rule.service';
import { EvaluationProfileRegistry } from './evaluation-profile.registry';
import { EvaluationService } from './evaluation.service';
import {
  evaluationAuthContext as authContext,
  evaluationEvidence as evidence,
  evaluationInput as input,
} from './evaluation.test-fixtures';

function createService(providerResult: () => Promise<unknown>) {
  const calls: unknown[] = [];
  const gateway = {
    evaluateProfileChat: async (...args: unknown[]) => {
      calls.push(args);
      return providerResult();
    },
    getEvaluationReadiness: async () => ({
      profileConfigured: true,
      providerId: 'openai',
      model: 'gpt-evaluator',
      tenantProviderEnabled: true,
      modelAllowed: true,
      credentialPath: 'tenant',
      ready: true,
      reason: null,
    }),
  };
  return {
    service: new EvaluationService(
      new EvaluationProfileRegistry(),
      gateway as never,
      new IntegrationClientScopeService(),
    ),
    calls,
  };
}

test.beforeEach(() => {
  process.env.LXP_EVALUATION_PGS_GROUNDING_PROVIDER = 'openai';
  process.env.LXP_EVALUATION_PGS_GROUNDING_MODEL = 'gpt-evaluator';
});

test('executes the server-controlled profile and returns validated evidence', async () => {
  const { service, calls } = createService(async () => ({
    requestId: 'evaluation-1',
    providerId: 'openai',
    model: 'gpt-evaluator',
    message: { role: 'assistant', content: JSON.stringify(evidence) },
  }));

  const result = await service.evaluate(
    {
      schemaVersion: '1',
      profileId: 'pgs-grounding-v1',
      input,
    },
    authContext,
  );

  assert.equal(result.evaluationId, 'evaluation-1');
  assert.equal(result.profileVersion, '1');
  const request = calls[0]?.[0] as {
    providerId: string;
    model: string;
    outputFormat?: string;
    messages: Array<{ content: string }>;
  };
  assert.equal(request.providerId, 'openai');
  assert.equal(request.model, 'gpt-evaluator');
  assert.equal(request.outputFormat, 'json');
  assert.equal(request.messages.length, 2);
  assert.equal(JSON.parse(request.messages[1]!.content).tenantId, undefined);
});

test('returns profile readiness without invoking the evaluator', async () => {
  const { service, calls } = createService(async () => {
    throw new Error('should not execute');
  });

  const readiness = await service.readiness(
    { schemaVersion: '1', profileId: 'pgs-grounding-v1' },
    authContext,
  );

  assert.equal(readiness.ready, true);
  assert.equal(readiness.providerId, 'openai');
  assert.equal(calls.length, 0);
});

test('requires evaluation:invoke without granting chat:completion', async () => {
  const { service } = createService(async () => {
    throw new Error('should not execute');
  });
  await assert.rejects(
    () =>
      service.evaluate(
        { schemaVersion: '1', profileId: 'pgs-grounding-v1', input },
        { ...authContext, integrationClientScopes: ['chat:completion'] },
      ),
    (error: unknown) => {
      const exception = error as {
        getStatus(): number;
        getResponse(): { code: string };
      };
      assert.equal(exception.getStatus(), 403);
      assert.equal(
        exception.getResponse().code,
        'evaluation_service_forbidden',
      );
      return true;
    },
  );
});

test('normalizes provider failures without leaking raw provider bodies', async () => {
  for (const [providerError, status, code] of [
    [
      'request failed with status 429: raw vendor quota body',
      429,
      'evaluation_rate_limited',
    ],
    [
      'request failed with status 401: secret vendor response',
      502,
      'evaluation_provider_authentication_failed',
    ],
    [
      'request failed with status 403: raw forbidden body',
      502,
      'evaluation_provider_authentication_failed',
    ],
    [
      'request failed with status 500: raw vendor failure',
      503,
      'evaluation_provider_unavailable',
    ],
    [
      'connect ECONNREFUSED raw upstream response',
      503,
      'evaluation_provider_unavailable',
    ],
    ['provider request timed out after 1000 ms', 504, 'evaluation_timeout'],
  ] as const) {
    const { service } = createService(async () => {
      throw new Error(providerError);
    });
    await assert.rejects(
      () =>
        service.evaluate(
          { schemaVersion: '1', profileId: 'pgs-grounding-v1', input },
          authContext,
        ),
      (error: unknown) => {
        const exception = error as {
          getStatus(): number;
          getResponse(): unknown;
        };
        assert.equal(exception.getStatus(), status);
        assert.equal((exception.getResponse() as { code: string }).code, code);
        assert.equal(
          JSON.stringify(exception.getResponse()).includes('raw'),
          false,
        );
        assert.equal(
          JSON.stringify(exception.getResponse()).includes('secret'),
          false,
        );
        return true;
      },
    );
  }
});

test('distinguishes evaluator configuration and tenant model policy failures', async () => {
  for (const [providerError, status, code] of [
    [
      new ProviderCredentialUnavailableException('sensitive credential path'),
      503,
      'evaluation_provider_credential_unavailable',
    ],
    [
      new ModelAccessPolicyException('sensitive tenant rule'),
      403,
      'evaluation_model_forbidden',
    ],
  ] as const) {
    const { service } = createService(async () => {
      throw providerError;
    });
    await assert.rejects(
      () =>
        service.evaluate(
          { schemaVersion: '1', profileId: 'pgs-grounding-v1', input },
          authContext,
        ),
      (error: unknown) => {
        const exception = error as {
          getStatus(): number;
          getResponse(): { code: string };
        };
        assert.equal(exception.getStatus(), status);
        assert.equal(exception.getResponse().code, code);
        assert.equal(
          JSON.stringify(exception.getResponse()).includes('sensitive'),
          false,
        );
        return true;
      },
    );
  }
});

test('enforces the evaluator profile timeout', async () => {
  const baseProfile = new EvaluationProfileRegistry().resolve(
    '1',
    'pgs-grounding-v1',
  );
  const service = new EvaluationService(
    {
      resolve: () => ({ ...baseProfile, timeoutMs: 5 }),
    } as never,
    {
      evaluateProfileChat: () => new Promise(() => undefined),
    } as never,
    {
      assertScope: () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.evaluate(
        { schemaVersion: '1', profileId: 'pgs-grounding-v1', input },
        authContext,
      ),
    (error: unknown) => {
      const exception = error as {
        getStatus(): number;
        getResponse(): { code: string };
      };
      assert.equal(exception.getStatus(), 504);
      assert.equal(exception.getResponse().code, 'evaluation_timeout');
      return true;
    },
  );
});

test('fails closed when provider output is malformed or authoritative', async () => {
  for (const content of [
    'not-json',
    JSON.stringify({ ...evidence, allow: true }),
  ]) {
    const { service } = createService(async () => ({
      requestId: 'evaluation-invalid',
      providerId: 'openai',
      model: 'gpt-evaluator',
      message: { role: 'assistant', content },
    }));
    await assert.rejects(
      () =>
        service.evaluate(
          { schemaVersion: '1', profileId: 'pgs-grounding-v1', input },
          authContext,
        ),
      (error: unknown) => {
        const response = (error as { getResponse(): unknown }).getResponse();
        assert.equal(
          (response as { code: string }).code,
          'evaluation_invalid_output',
        );
        return true;
      },
    );
  }
});
