import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  INSTALLATION_STATE_SINGLETON_ID,
  type InstallationStateEntity,
} from '../persistence/entities/installation-state.entity';
import { SetupAccessService } from './setup-access.service';

function createRepositoryMock<T extends Record<string, unknown>>(
  initialData: T[] = [],
) {
  const data = [...initialData];

  return {
    async findOne({ where }: { where: Partial<T> }): Promise<T | null> {
      return (
        data.find((item) =>
          Object.entries(where).every(
            ([key, value]) => item[key as keyof T] === value,
          ),
        ) ?? null
      );
    },
  };
}

test('SetupAccessService rejects missing setup token', async () => {
  process.env.LXP_SETUP_TOKEN_HASH = `sha256:${createHash('sha256')
    .update('correct-token')
    .digest('hex')}`;

  const setupStatusService = {
    async ensureInstallationState() {
      return;
    },
  };
  const service = new SetupAccessService(
    createRepositoryMock<InstallationStateEntity>([
      {
        id: INSTALLATION_STATE_SINGLETON_ID,
        status: 'PENDING',
      } as InstallationStateEntity,
    ]) as never,
    setupStatusService as never,
  );

  await assert.rejects(
    () => service.verifySetupToken(undefined),
    /Setup token is required/,
  );
});

test('SetupAccessService rejects invalid setup token', async () => {
  process.env.LXP_SETUP_TOKEN_HASH = `sha256:${createHash('sha256')
    .update('correct-token')
    .digest('hex')}`;

  const setupStatusService = {
    async ensureInstallationState() {
      return;
    },
  };
  const service = new SetupAccessService(
    createRepositoryMock<InstallationStateEntity>([
      {
        id: INSTALLATION_STATE_SINGLETON_ID,
        status: 'PENDING',
      } as InstallationStateEntity,
    ]) as never,
    setupStatusService as never,
  );

  await assert.rejects(
    () => service.verifySetupToken('wrong-token'),
    /Invalid setup token/,
  );
});

test('SetupAccessService rejects setup access after completion', async () => {
  process.env.LXP_SETUP_TOKEN_HASH = `sha256:${createHash('sha256')
    .update('correct-token')
    .digest('hex')}`;

  const setupStatusService = {
    async ensureInstallationState() {
      return;
    },
  };
  const service = new SetupAccessService(
    createRepositoryMock<InstallationStateEntity>([
      {
        id: INSTALLATION_STATE_SINGLETON_ID,
        status: 'COMPLETED',
      } as InstallationStateEntity,
    ]) as never,
    setupStatusService as never,
  );

  await assert.rejects(
    () => service.verifySetupToken('correct-token'),
    /Setup is no longer available/,
  );
});

