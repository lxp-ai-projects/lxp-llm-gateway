import assert from 'node:assert/strict';
import test from 'node:test';

import { QueryFailedError } from 'typeorm';

import {
  INSTALLATION_STATE_SINGLETON_ID,
  type InstallationStateEntity,
} from '../persistence/entities/installation-state.entity';
import { SetupStatusService } from './setup-status.service';

function createRepositoryMock<T extends Record<string, unknown>>(
  initialData: T[] = [],
) {
  const data = [...initialData];

  return {
    data,
    async find(): Promise<T[]> {
      return data;
    },
    async findOne({ where }: { where: Partial<T> }): Promise<T | null> {
      return (
        data.find((item) =>
          Object.entries(where).every(
            ([key, value]) => item[key as keyof T] === value,
          ),
        ) ?? null
      );
    },
    create(value: T): T {
      return value;
    },
    async save(value: T): Promise<T> {
      const existingIndex = data.findIndex((item) => item.id === value.id);
      if (existingIndex >= 0) {
        data[existingIndex] = value;
      } else {
        data.push(value);
      }

      return value;
    },
  };
}

test('SetupStatusService initializes fresh installs as pending and setup-required', async () => {
  const installationStateRepository = createRepositoryMock<InstallationStateEntity>([]);
  const roleRepository = createRepositoryMock([]);
  const userRoleRepository = createRepositoryMock([]);
  const service = new SetupStatusService(
    installationStateRepository as never,
    roleRepository as never,
    userRoleRepository as never,
  );

  const status = await service.getPublicSetupStatus();
  const expectedVersion = process.env.npm_package_version ?? null;

  assert.deepEqual(status, {
    setupRequired: true,
    setupCompleted: false,
    tokenRequired: true,
    version: expectedVersion,
  });
  assert.equal(installationStateRepository.data.length, 1);
  assert.equal(
    installationStateRepository.data[0]?.id,
    INSTALLATION_STATE_SINGLETON_ID,
  );
  assert.equal(installationStateRepository.data[0]?.status, 'PENDING');
});

test('SetupStatusService reports completed installs as closed', async () => {
  const installationStateRepository = createRepositoryMock<InstallationStateEntity>([
    {
      id: INSTALLATION_STATE_SINGLETON_ID,
      status: 'COMPLETED',
      setupStartedAt: null,
      setupCompletedAt: new Date('2026-05-10T12:00:00.000Z'),
      completedByUserId: 'user-1',
      appVersion: '0.1.0',
      createdAt: new Date('2026-05-10T12:00:00.000Z'),
      updatedAt: new Date('2026-05-10T12:00:00.000Z'),
    },
  ]);
  const roleRepository = createRepositoryMock([]);
  const userRoleRepository = createRepositoryMock([]);
  const service = new SetupStatusService(
    installationStateRepository as never,
    roleRepository as never,
    userRoleRepository as never,
  );

  const status = await service.getPublicSetupStatus();

  assert.deepEqual(status, {
    setupRequired: false,
    setupCompleted: true,
    tokenRequired: true,
    version: '0.1.0',
  });
});

test('SetupStatusService treats legacy installs with a super admin as completed', async () => {
  const installationStateRepository = createRepositoryMock<InstallationStateEntity>([]);
  const roleRepository = createRepositoryMock([
    {
      id: 'role-1',
      name: 'super_admin',
    },
  ]);
  const userRoleRepository = createRepositoryMock([
    {
      id: 'assignment-1',
      userId: 'user-1',
      roleId: 'role-1',
    },
  ]);
  const service = new SetupStatusService(
    installationStateRepository as never,
    roleRepository as never,
    userRoleRepository as never,
  );

  const status = await service.getPublicSetupStatus();
  const expectedVersion = process.env.npm_package_version ?? null;

  assert.deepEqual(status, {
    setupRequired: false,
    setupCompleted: true,
    tokenRequired: true,
    version: expectedVersion,
  });
  assert.equal(installationStateRepository.data.length, 1);
  assert.equal(installationStateRepository.data[0]?.status, 'COMPLETED');
  assert.equal(installationStateRepository.data[0]?.completedByUserId, 'user-1');
});

test('SetupStatusService upgrades an existing pending singleton to completed for legacy installs', async () => {
  const installationStateRepository = createRepositoryMock<InstallationStateEntity>([
    {
      id: INSTALLATION_STATE_SINGLETON_ID,
      status: 'PENDING',
      setupStartedAt: null,
      setupCompletedAt: null,
      completedByUserId: null,
      appVersion: null,
      createdAt: new Date('2026-05-10T12:00:00.000Z'),
      updatedAt: new Date('2026-05-10T12:00:00.000Z'),
    },
  ]);
  const roleRepository = createRepositoryMock([
    {
      id: 'role-1',
      name: 'super_admin',
    },
  ]);
  const userRoleRepository = createRepositoryMock([
    {
      id: 'assignment-1',
      userId: 'user-1',
      roleId: 'role-1',
    },
  ]);
  const service = new SetupStatusService(
    installationStateRepository as never,
    roleRepository as never,
    userRoleRepository as never,
  );

  const status = await service.getPublicSetupStatus();

  assert.equal(status.setupRequired, false);
  assert.equal(status.setupCompleted, true);
  assert.equal(installationStateRepository.data[0]?.status, 'COMPLETED');
  assert.equal(installationStateRepository.data[0]?.completedByUserId, 'user-1');
});

test('SetupStatusService falls back to setup-required when the installation_state table is missing', async () => {
  const missingRelationError = new QueryFailedError(
    'SELECT 1',
    [],
    { code: '42P01' } as never,
  );
  const installationStateRepository = {
    async findOne(): Promise<InstallationStateEntity | null> {
      throw missingRelationError;
    },
    async save(value: InstallationStateEntity): Promise<InstallationStateEntity> {
      return value;
    },
  };
  const roleRepository = createRepositoryMock([]);
  const userRoleRepository = createRepositoryMock([]);
  const service = new SetupStatusService(
    installationStateRepository as never,
    roleRepository as never,
    userRoleRepository as never,
  );

  const status = await service.getPublicSetupStatus();

  assert.deepEqual(status, {
    setupRequired: true,
    setupCompleted: false,
    tokenRequired: true,
    version: process.env.npm_package_version ?? null,
  });
});
