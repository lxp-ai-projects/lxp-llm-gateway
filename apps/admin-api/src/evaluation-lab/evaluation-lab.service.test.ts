import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import { Logger } from '@nestjs/common';
import type { PgsGroundingInput } from '@lxp/contracts';

import type { AuthenticatedUser } from '../auth/auth.types';
import { EvaluationLabService } from './evaluation-lab.service';
import { EnvironmentEvaluationServiceCredentialResolver } from './evaluation-service-credential.resolver';

function createService(): EvaluationLabService {
  return new EvaluationLabService(
    new EnvironmentEvaluationServiceCredentialResolver(),
  );
}

const originalFetch = global.fetch;
const actor = {
  userUuid: 'operator-1',
  activeTenantId: 'tenant-1',
  roles: ['operator'],
  globalRoles: [],
} as AuthenticatedUser;
const input: PgsGroundingInput = {
  questionVersionId: 'question-v1',
  rubric: { id: 'rubric-1', version: 1, guidance: 'Assess evidence.' },
  answerText: 'Observable candidate content.',
  evidenceReference: {
    kind: 'ASSESSMENT_ANSWER',
    referenceId: 'answer-1',
  },
  allowedSignals: [
    {
      id: 'signal-1',
      version: 1,
      code: 'REALITY_FRAMING_PRESENT',
      direction: 'PROTECTIVE',
      severity: 'LOW',
      dimensions: ['REALITY_FRAMING'],
    },
  ],
};
const gatewayResult = {
  schemaVersion: '1',
  profileId: 'pgs-grounding-v1',
  profileVersion: '1',
  evaluationId: 'evaluation-1',
  evidence: {
    observations: [],
    ambiguity: { score: 0, reasons: [] },
    contradiction: { detected: false },
    followUpRecommended: false,
  },
};

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.LXP_ADMIN_EVALUATION_API_KEYS_JSON;
  delete process.env.GATEWAY_API_URL;
});

test('uses a tenant-bound service identity and returns sanitized probe metadata', async () => {
  process.env.LXP_ADMIN_EVALUATION_API_KEYS_JSON = JSON.stringify({
    'tenant-1': 'server-secret-key',
  });
  let request: { url?: string; init?: RequestInit } = {};
  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return jsonResponse(200, gatewayResult);
  }) as typeof fetch;

  const result = await createService().executeProbe(actor, {
    profileId: 'pgs-grounding-v1',
    input,
  });

  assert.equal(result.evaluationId, 'evaluation-1');
  assert.equal(typeof result.latencyMs, 'number');
  assert.equal(typeof result.timestamp, 'string');
  assert.equal(request.url, 'http://127.0.0.1:3001/api/v1/evaluations');
  const headers = request.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer server-secret-key');
  assert.equal(headers['X-Lxp-Expected-Tenant-Id'], 'tenant-1');
  const body = JSON.parse(String(request.init?.body)) as Record<
    string,
    unknown
  >;
  assert.deepEqual(Object.keys(body).sort(), [
    'input',
    'profileId',
    'schemaVersion',
  ]);
  assert.equal('tenantId' in body, false);
  assert.equal('provider' in body, false);
  assert.equal('model' in body, false);
  assert.equal(JSON.stringify(result).includes('server-secret-key'), false);
});

test('rejects unknown profiles, invalid input and missing tenant service identity', async () => {
  const service = createService();
  await assert.rejects(
    service.executeProbe(actor, {
      profileId: 'unknown-profile',
      input,
    } as never),
    hasStatus(404),
  );
  await assert.rejects(
    service.executeProbe(actor, {
      profileId: 'pgs-grounding-v1',
      input: { ...input, provider: 'openai' } as never,
    }),
    hasStatus(400),
  );
  await assert.rejects(
    service.executeProbe(actor, {
      profileId: 'pgs-grounding-v1',
      input,
    }),
    hasCode('evaluation_service_identity_unavailable'),
  );
});

for (const scenario of [
  {
    status: 401,
    body: { message: 'Bearer server-secret-key was rejected' },
    code: 'evaluation_service_authentication_failed',
  },
  {
    status: 403,
    body: {
      code: 'evaluation_service_forbidden',
      message: 'Missing evaluation:invoke',
    },
    code: 'evaluation_service_forbidden',
  },
  {
    status: 503,
    body: {
      code: 'evaluation_provider_credential_unavailable',
      message: 'raw credential configuration detail',
    },
    code: 'evaluation_provider_credential_unavailable',
  },
  {
    status: 403,
    body: {
      code: 'evaluation_model_forbidden',
      message: 'raw tenant policy detail',
    },
    code: 'evaluation_model_forbidden',
  },
  {
    status: 429,
    body: { code: 'evaluation_rate_limited', message: 'raw quota detail' },
    code: 'evaluation_rate_limited',
  },
  {
    status: 504,
    body: { code: 'evaluation_timeout', message: 'raw timeout detail' },
    code: 'evaluation_timeout',
  },
  {
    status: 503,
    body: { code: 'evaluation_provider_unavailable', message: 'provider body' },
    code: 'evaluation_provider_unavailable',
  },
  {
    status: 502,
    body: { code: 'evaluation_invalid_output', message: 'provider body' },
    code: 'evaluation_invalid_output',
  },
]) {
  test(`normalizes Gateway ${scenario.status} without leaking its raw body`, async () => {
    process.env.LXP_ADMIN_EVALUATION_API_KEYS_JSON = JSON.stringify({
      'tenant-1': 'server-secret-key',
    });
    global.fetch = (async () =>
      jsonResponse(scenario.status, scenario.body)) as typeof fetch;
    await assert.rejects(
      createService().executeProbe(actor, {
        profileId: 'pgs-grounding-v1',
        input,
      }),
      (error: unknown) => {
        const exception = error as {
          getResponse(): { code?: string; message?: string };
        };
        const response = exception.getResponse();
        assert.equal(response.code, scenario.code);
        assert.equal(
          response.message?.includes(String(scenario.body.message)),
          false,
        );
        assert.equal(
          JSON.stringify(response).includes('server-secret-key'),
          false,
        );
        return true;
      },
    );
  });
}

test('rejects a malformed successful Gateway result as invalid output', async () => {
  process.env.LXP_ADMIN_EVALUATION_API_KEYS_JSON = JSON.stringify({
    'tenant-1': 'server-secret-key',
  });
  global.fetch = (async () =>
    jsonResponse(200, {
      ...gatewayResult,
      evidence: 'invalid',
    })) as typeof fetch;
  await assert.rejects(
    createService().executeProbe(actor, {
      profileId: 'pgs-grounding-v1',
      input,
    }),
    hasCode('evaluation_invalid_output'),
  );

  global.fetch = (async () =>
    jsonResponse(200, {
      ...gatewayResult,
      leakedCredential: 'must-not-return',
    })) as typeof fetch;
  await assert.rejects(
    createService().executeProbe(actor, {
      profileId: 'pgs-grounding-v1',
      input,
    }),
    hasCode('evaluation_invalid_output'),
  );
});

test('logs a bounded Gateway failure cause without leaking its raw body', async () => {
  process.env.LXP_ADMIN_EVALUATION_API_KEYS_JSON = JSON.stringify({
    'tenant-1': 'server-secret-key',
  });
  global.fetch = (async () =>
    jsonResponse(403, {
      message:
        'Integration client "admin-evaluation" is missing the required scope "evaluation:invoke".',
      internalDetail: 'server-secret-key must never be logged',
    })) as typeof fetch;
  const log = mock.method(Logger.prototype, 'log', () => undefined);

  await assert.rejects(
    createService().executeProbe(actor, {
      profileId: 'pgs-grounding-v1',
      input,
    }),
    hasCode('evaluation_service_forbidden'),
  );

  const failedEvent = log.mock.calls
    .map(({ arguments: [entry] }) => entry as Record<string, unknown>)
    .find((entry) => entry.status === 'failed');
  assert.ok(failedEvent);
  assert.equal(failedEvent.upstreamStatus, 403);
  assert.equal(failedEvent.failureCause, 'missing_evaluation_invoke_scope');
  assert.equal(JSON.stringify(failedEvent).includes('admin-evaluation'), false);
  assert.equal(
    JSON.stringify(failedEvent).includes('server-secret-key'),
    false,
  );

  log.mock.restore();
});

test('logs a missing tenant service identity as a local pre-Gateway failure', async () => {
  const log = mock.method(Logger.prototype, 'log', () => undefined);

  await assert.rejects(
    createService().executeProbe(
      actor,
      { profileId: 'pgs-grounding-v1', input },
      'browser-request-2',
    ),
    hasCode('evaluation_service_identity_unavailable'),
  );

  const events = log.mock.calls.map(
    ({ arguments: [entry] }) => entry as Record<string, unknown>,
  );
  assert.equal(
    events.some((entry) => entry.event === 'admin.evaluation_probe_gateway'),
    false,
  );
  const failedEvent = events.find((entry) => entry.status === 'failed');
  assert.ok(failedEvent);
  assert.equal(failedEvent.requestId, 'browser-request-2');
  assert.equal(
    failedEvent.resultCategory,
    'evaluation_service_identity_unavailable',
  );
  assert.equal(failedEvent.upstreamStatus, 503);
  assert.equal(
    failedEvent.failureCause,
    'evaluation_service_identity_unavailable',
  );
  assert.equal(typeof failedEvent.latencyMs, 'number');

  log.mock.restore();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function hasStatus(expected: number) {
  return (error: unknown) =>
    (error as { getStatus(): number }).getStatus() === expected;
}

function hasCode(expected: string) {
  return (error: unknown) =>
    (error as { getResponse(): { code?: string } }).getResponse().code ===
    expected;
}
