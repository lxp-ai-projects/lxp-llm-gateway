import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { SetupAccessService } from './setup-access.service';

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => Promise<void>,
) {
  const previousValues = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previousValues.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return run().finally(() => {
    for (const [key, value] of previousValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

function createInstallationStateRepository(status: 'PENDING' | 'COMPLETED') {
  return {
    async findOne() {
      return {
        id: 'global',
        status,
      };
    },
  };
}

test('SetupAccessService accepts a valid setup token while setup is pending', async () => {
  const token = 'setup-secret-token';
  const service = new SetupAccessService(
    createInstallationStateRepository('PENDING') as never,
  );

  await withEnv(
    {
      LXP_SETUP_TOKEN_HASH: `sha256:${createHash('sha256').update(token).digest('hex')}`,
    },
    async () => {
      await service.verifySetupToken(token);
    },
  );
});

test('SetupAccessService rejects an invalid setup token', async () => {
  const service = new SetupAccessService(
    createInstallationStateRepository('PENDING') as never,
  );

  await withEnv(
    {
      LXP_SETUP_TOKEN_HASH: `sha256:${createHash('sha256').update('expected-token').digest('hex')}`,
    },
    async () => {
      await assert.rejects(
        () => service.verifySetupToken('wrong-token'),
        /Invalid setup token/,
      );
    },
  );
});

test('SetupAccessService rejects setup access after completion', async () => {
  const service = new SetupAccessService(
    createInstallationStateRepository('COMPLETED') as never,
  );

  await withEnv(
    {
      LXP_SETUP_TOKEN_HASH: `sha256:${createHash('sha256').update('expected-token').digest('hex')}`,
    },
    async () => {
      await assert.rejects(
        () => service.verifySetupToken('expected-token'),
        /Setup is no longer available/,
      );
    },
  );
});
