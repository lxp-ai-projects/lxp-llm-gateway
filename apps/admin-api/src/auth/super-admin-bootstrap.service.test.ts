import * as assert from 'node:assert/strict';
import test from 'node:test';

import { SuperAdminBootstrapService } from './super-admin-bootstrap.service';

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
    for (const [key, value] of Array.from(previousValues.entries())) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

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
      data.push(value);
      return value;
    },
  };
}

function createEmailProtectionService() {
  return {
    protect(email: string) {
      return {
        emailHash: `hash:${email.trim().toLowerCase()}`,
      };
    },
  };
}

test('SuperAdminBootstrapService assigns super_admin to configured existing users at startup', async () => {
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      emailHash: 'hash:patrick@example.com',
    },
  ]);
  const roleRepository = createRepositoryMock([
    {
      id: 'role-1',
      name: 'super_admin',
    },
  ]);
  const userRoleRepository = createRepositoryMock<
    { id?: string; userId: string; roleId: string }
  >([]);

  const service = new SuperAdminBootstrapService(
    userRepository as never,
    roleRepository as never,
    userRoleRepository as never,
    createEmailProtectionService() as never,
  );

  await withEnv(
    {
      LXP_SUPER_ADMIN_EMAILS: 'patrick@example.com',
    },
    async () => {
      await service.onApplicationBootstrap();
    },
  );

  assert.deepEqual(userRoleRepository.data, [
    {
      userId: 'user-1',
      roleId: 'role-1',
    },
  ]);
});

test('SuperAdminBootstrapService is idempotent for configured users', async () => {
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      emailHash: 'hash:patrick@example.com',
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
      userId: 'user-1',
      roleId: 'role-1',
    },
  ]);

  const service = new SuperAdminBootstrapService(
    userRepository as never,
    roleRepository as never,
    userRoleRepository as never,
    createEmailProtectionService() as never,
  );

  await withEnv(
    {
      LXP_SUPER_ADMIN_EMAILS: 'patrick@example.com',
    },
    async () => {
      await service.onApplicationBootstrap();
      await service.syncUserIfConfigured({
        id: 'user-1',
        emailHash: 'hash:patrick@example.com',
      });
    },
  );

  assert.equal(userRoleRepository.data.length, 1);
});
