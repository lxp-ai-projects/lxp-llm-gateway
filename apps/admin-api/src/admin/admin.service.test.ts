import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { AdminService } from './admin.service';

function createRepositoryMock<T extends { id?: string }>(initialData: T[] = []) {
  const store = [...initialData];

  return {
    data: store,
    async count(): Promise<number> {
      return store.length;
    },
    async findOne({ where }: { where: Partial<T> }): Promise<T | null> {
      return (
        store.find((item) =>
          Object.entries(where).every(
            ([key, value]) => item[key as keyof T] === value,
          ),
        ) ?? null
      );
    },
    async find({ where }: { where: Array<Partial<T>> }): Promise<T[]> {
      return store.filter((item) =>
        where.some((condition) =>
          Object.entries(condition).every(
            ([key, value]) => item[key as keyof T] === value,
          ),
        ),
      );
    },
    create(value: T): T {
      return {
        ...value,
        id: value.id ?? randomUUID(),
      };
    },
    async save(value: T | T[]): Promise<T | T[]> {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          const index = store.findIndex((storedEntry) => storedEntry.id === entry.id);
          if (index >= 0) {
            store[index] = entry;
          } else {
            store.push(entry);
          }
        });
        return value;
      }

      if (!value.id) {
        value.id = randomUUID();
      }
      if ('createdAt' in value && !value.createdAt) {
        value.createdAt = new Date() as never;
      }
      const index = store.findIndex((storedEntry) => storedEntry.id === value.id);
      if (index >= 0) {
        store[index] = value;
      } else {
        store.push(value);
      }
      return value;
    },
  };
}

function createAdminService() {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  process.env.LXP_EMAIL_LOOKUP_KEY =
    'ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA=';

  const userRepository = createRepositoryMock();
  const roleRepository = createRepositoryMock([
    {
      id: randomUUID(),
      name: 'user',
      description: 'Standard user',
    },
    {
      id: randomUUID(),
      name: 'admin',
      description: 'Admin user',
    },
  ]);
  const userRoleRepository = createRepositoryMock();
  const providerRepository = createRepositoryMock([
    {
      id: randomUUID(),
      providerId: 'nanogpt',
      displayName: 'NanoGPT',
      status: 'active',
    },
  ]);
  const credentialRepository = createRepositoryMock();

  return {
    service: new AdminService(
      userRepository as never,
      roleRepository as never,
      userRoleRepository as never,
      providerRepository as never,
      credentialRepository as never,
      new EmailProtectionService(new EncryptionService()),
      new EncryptionService(),
      new PasswordService(),
    ),
    repositories: {
      userRepository,
      userRoleRepository,
      credentialRepository,
    },
  };
}

test('AdminService creates a user with protected email and assigned roles', async () => {
  const { service, repositories } = createAdminService();

  const user = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
    roles: ['admin'],
  });

  assert.ok(user.userUuid);
  assert.equal(user.email, 'patrick@example.com');
  assert.deepEqual(user.roles, ['admin']);
  assert.equal(repositories.userRepository.data.length, 1);
  assert.equal(repositories.userRoleRepository.data.length, 1);
});

test('AdminService rejects creating a user when the email already exists', async () => {
  const { service } = createAdminService();

  await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
    roles: ['admin'],
  });

  await assert.rejects(
    () =>
      service.createUser({
        email: 'patrick@example.com',
        password: 'Sup3rS3cret!',
        displayName: 'Patrick Again',
        roles: ['admin'],
      }),
    /Unable to create user with the provided data/,
  );
});

test('AdminService rejects creating a user when a requested role does not exist', async () => {
  const { service } = createAdminService();

  await assert.rejects(
    () =>
      service.createUser({
        email: 'patrick@example.com',
        password: 'Sup3rS3cret!',
        displayName: 'Patrick',
        roles: ['ghost-role'],
      }),
    /Unable to assign one or more requested roles/,
  );
});

test('AdminService stores an encrypted provider credential and returns only metadata', async () => {
  const { service, repositories } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const credential = await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  assert.ok(credential.id);
  assert.equal(credential.providerId, 'nanogpt');
  assert.equal(credential.maskedHint, '***oken');
  assert.equal(credential.userUuid, createdUser.userUuid);

  const stored = repositories.credentialRepository.data[0] as {
    encryptedSecret: string;
  };
  assert.notEqual(stored.encryptedSecret, 'nano-secret-token');
});

test('AdminService updates an owned provider credential without exposing the raw token', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });
  const createdCredential = await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  const updatedCredential = await service.updateOwnProviderCredential(
    { userUuid: createdUser.userUuid },
    createdCredential.id,
    {
      label: 'main',
      apiToken: 'another-secret-token',
    },
  );

  assert.equal(updatedCredential.label, 'main');
  assert.equal(updatedCredential.maskedHint, '***oken');
});

test('AdminService stores short provider tokens without masking them further', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const credential = await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'short',
    apiToken: 'abcd',
  });

  assert.equal(credential.maskedHint, 'abcd');
});

test('AdminService rejects storing a provider credential when the user does not exist', async () => {
  const { service } = createAdminService();

  await assert.rejects(
    () =>
      service.storeProviderCredential({
        userUuid: randomUUID(),
        providerId: 'nanogpt',
        label: 'primary',
        apiToken: 'nano-secret-token',
      }),
    /Unable to store the provider credential/,
  );
});

test('AdminService rejects storing a provider credential when the provider does not exist', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredential({
        userUuid: createdUser.userUuid,
        providerId: 'unknown-provider' as never,
        label: 'primary',
        apiToken: 'nano-secret-token',
      }),
    /Unable to store the provider credential/,
  );
});

test('AdminService rejects storing a duplicate provider credential label', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredential({
        userUuid: createdUser.userUuid,
        providerId: 'nanogpt',
        label: 'primary',
        apiToken: 'another-secret-token',
      }),
    /Unable to store the provider credential/,
  );
});

test('AdminService rejects updating a provider credential when the new label already exists', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const primaryCredential = await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });
  await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'backup',
    apiToken: 'backup-secret-token',
  });

  await assert.rejects(
    () =>
      service.updateOwnProviderCredential(
        { userUuid: createdUser.userUuid },
        primaryCredential.id,
        {
          label: 'backup',
        },
      ),
    /Unable to update the provider credential/,
  );
});

test('AdminService updates provider settings for a user', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  const settings = await service.updateProviderSettingsForUser(createdUser.userUuid, {
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  });

  assert.equal(settings.defaultProviderId, 'nanogpt');
  assert.equal(settings.defaultModel, 'z-ai/glm-4.6:thinking');
});

test('AdminService rejects default provider selection without an active credential', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.updateProviderSettingsForUser(createdUser.userUuid, {
        defaultProviderId: 'nanogpt',
      }),
    /Unable to update provider settings/,
  );
});

test('AdminService clears default model when the default provider is cleared', async () => {
  const { service } = createAdminService();
  const createdUser = await service.createUser({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredential({
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });
  await service.updateProviderSettingsForUser(createdUser.userUuid, {
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  });

  const settings = await service.updateProviderSettingsForUser(createdUser.userUuid, {
    defaultProviderId: null,
  });

  assert.equal(settings.defaultProviderId, null);
  assert.equal(settings.defaultModel, null);
});

test('AdminService bootstraps the first admin only once', async () => {
  const { service, repositories } = createAdminService();

  const firstAdmin = await service.bootstrapAdmin({
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
    roles: ['admin'],
  });

  assert.ok(firstAdmin.userUuid);
  assert.equal(repositories.userRepository.data.length, 1);

  await assert.rejects(
    () =>
      service.bootstrapAdmin({
        email: 'second@example.com',
        password: 'Sup3rS3cret!',
        displayName: 'Second',
        roles: ['admin'],
      }),
    /Bootstrap is not available/,
  );
});
