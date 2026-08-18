import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { RegistrationVerificationController } from './registration-verification.controller';

test('RegistrationVerificationController publishes and delegates all challenge routes', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    create: async (...args: unknown[]) => {
      calls.push({ method: 'create', args });
      return { challengeId: 'challenge-1' };
    },
    verify: async (...args: unknown[]) => {
      calls.push({ method: 'verify', args });
      return { completionToken: 'token-1' };
    },
    resend: async (...args: unknown[]) => {
      calls.push({ method: 'resend', args });
      return { challengeId: 'challenge-1' };
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
  await controller.verify('challenge-1', '127.0.0.1', { code: '123456' });
  await controller.resend(request, 'challenge-1', '127.0.0.1', {
    email: 'person@example.com',
  });

  assert.deepEqual(calls, [
    {
      method: 'create',
      args: ['tenant.example.com', 'person@example.com', '127.0.0.1'],
    },
    {
      method: 'verify',
      args: ['challenge-1', '123456', '127.0.0.1'],
    },
    {
      method: 'resend',
      args: [
        'tenant.example.com',
        'challenge-1',
        'person@example.com',
        '127.0.0.1',
      ],
    },
  ]);
});
