import assert from 'node:assert/strict';
import test from 'node:test';
import { ParseUUIDPipe, RequestMethod } from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';

import { RegistrationVerificationController } from './registration-verification.controller';

test('RegistrationVerificationController publishes and delegates all challenge routes', async () => {
  const challengeId = '00000000-0000-4000-8000-000000000001';
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    create: async (...args: unknown[]) => {
      calls.push({ method: 'create', args });
      return { challengeId };
    },
    verify: async (...args: unknown[]) => {
      calls.push({ method: 'verify', args });
      return { completionToken: 'token-1' };
    },
    resend: async (...args: unknown[]) => {
      calls.push({ method: 'resend', args });
      return { challengeId };
    },
  };
  const hosts = { resolveRequestHostname: () => 'tenant.example.com' };
  const controller = new RegistrationVerificationController(
    service as never,
    hosts as never,
  );
  const request = {} as never;

  assert.equal(
    Reflect.getMetadata(PATH_METADATA, RegistrationVerificationController),
    'public/registration/email/challenges',
  );
  for (const [handler, path] of [
    ['create', '/'],
    ['verify', ':challengeId/verify'],
    ['resend', ':challengeId/resend'],
  ] as const) {
    assert.equal(
      Reflect.getMetadata(
        METHOD_METADATA,
        RegistrationVerificationController.prototype[handler],
      ),
      RequestMethod.POST,
    );
    assert.equal(
      Reflect.getMetadata(
        PATH_METADATA,
        RegistrationVerificationController.prototype[handler],
      ),
      path,
    );
  }

  await controller.create(request, '127.0.0.1', {
    email: 'person@example.com',
  });
  await controller.verify(challengeId, '127.0.0.1', { code: '123456' });
  await controller.resend(request, challengeId, '127.0.0.1', {
    email: 'person@example.com',
  });

  assert.deepEqual(calls, [
    {
      method: 'create',
      args: ['tenant.example.com', 'person@example.com', '127.0.0.1'],
    },
    {
      method: 'verify',
      args: [challengeId, '123456', '127.0.0.1'],
    },
    {
      method: 'resend',
      args: [
        'tenant.example.com',
        challengeId,
        'person@example.com',
        '127.0.0.1',
      ],
    },
  ]);
});

test('verify and resend reject malformed challenge UUIDs at the route boundary', async () => {
  for (const handler of ['verify', 'resend'] as const) {
    const routeArguments = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      RegistrationVerificationController,
      handler,
    ) as Record<string, { pipes: unknown[] }>;
    const uuidPipe = Object.values(routeArguments)
      .flatMap((argument) => argument.pipes)
      .find((pipe): pipe is ParseUUIDPipe => pipe instanceof ParseUUIDPipe);

    assert.ok(uuidPipe);
    await assert.rejects(
      () =>
        uuidPipe.transform('not-a-uuid', {
          type: 'param',
          metatype: String,
          data: 'challengeId',
        }),
      /Validation failed \(uuid v 4 is expected\)/,
    );
  }
});
