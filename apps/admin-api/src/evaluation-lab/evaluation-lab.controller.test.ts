import assert from 'node:assert/strict';
import test from 'node:test';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { validate } from 'class-validator';

import { AccessTokenGuard } from '../auth/access-token.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EvaluationProbeDto } from './dto/evaluation-probe.dto';
import { EvaluationLabController } from './evaluation-lab.controller';

test('operator routes retain access-token, role and tenant actor boundaries', async () => {
  const calls: unknown[] = [];
  const service = {
    listProfiles: (...args: unknown[]) => {
      calls.push(args);
      return [{ profileId: 'pgs-grounding-v1' }];
    },
    executeProbe: (...args: unknown[]) => {
      calls.push(args);
      return { evaluationId: 'evaluation-1' };
    },
  };
  const controller = new EvaluationLabController(service as never);
  const actor = { activeTenantId: 'tenant-1', userUuid: 'operator-1' };
  const dto = { profileId: 'pgs-grounding-v1', input: {} } as never;

  assert.deepEqual(
    controller.listProfiles({ authUser: actor } as never),
    [{ profileId: 'pgs-grounding-v1' }],
  );
  assert.deepEqual(
    await controller.executeProbe(
      {
        authUser: actor,
        headers: { 'x-request-id': 'browser-request-1' },
      } as never,
      dto,
    ),
    { evaluationId: 'evaluation-1' },
  );
  assert.deepEqual(calls[0], [actor]);
  assert.deepEqual(calls[1], [actor, dto, 'browser-request-1']);
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, EvaluationLabController), [
    'operator',
    'tenant_admin',
  ]);
  assert.equal(
    (Reflect.getMetadata(GUARDS_METADATA, EvaluationLabController) as unknown[])
      .length,
    2,
  );
});

test('anonymous and insufficient-role operators are rejected by the existing guards', async () => {
  const anonymousContext = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, cookies: {} }),
    }),
  };
  await assert.rejects(
    new AccessTokenGuard({} as never).canActivate(anonymousContext as never),
    (error: unknown) => (error as { getStatus(): number }).getStatus() === 401,
  );

  const roleContext = {
    getHandler: () => EvaluationLabController.prototype.executeProbe,
    getClass: () => EvaluationLabController,
    switchToHttp: () => ({
      getRequest: () => ({
        authUser: { roles: ['user'], globalRoles: [] },
      }),
    }),
  };
  assert.throws(
    () =>
      new RolesGuard({
        getAllAndOverride: () => ['operator', 'tenant_admin'],
      } as never).canActivate(roleContext as never),
    (error: unknown) => (error as { getStatus(): number }).getStatus() === 403,
  );
});

test('probe DTO rejects tenant, provider, model, prompt, URL and credentials injection', async () => {
  for (const property of [
    'tenantId',
    'provider',
    'model',
    'systemPrompt',
    'gatewayBaseUrl',
    'serviceCredential',
  ]) {
    const dto = Object.assign(new EvaluationProbeDto(), {
      profileId: 'pgs-grounding-v1',
      input: {},
      [property]: 'injected',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    assert.ok(errors.some((error) => error.property === property));
  }
});
