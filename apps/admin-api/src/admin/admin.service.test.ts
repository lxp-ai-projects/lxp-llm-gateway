import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import type { ProviderId } from '@lxp/domain';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { AdminService } from './admin.service';

function createRepositoryMock<T extends { id?: string }>(
  initialData: T[] = [],
) {
  const store = [...initialData];

  function matchesValue(itemValue: unknown, expectedValue: unknown): boolean {
    if (
      expectedValue &&
      typeof expectedValue === 'object' &&
      '_type' in expectedValue &&
      (expectedValue as { _type?: string })._type === 'isNull'
    ) {
      return itemValue === null || itemValue === undefined;
    }

    return itemValue === expectedValue;
  }

  function matchesWhere(item: T, where: Partial<T>): boolean {
    return Object.entries(where).every(([key, value]) =>
      matchesValue(item[key as keyof T], value),
    );
  }

  return {
    data: store,
    async count(): Promise<number> {
      return store.length;
    },
    async findOne({
      where,
    }: {
      where: Partial<T> | Array<Partial<T>>;
    }): Promise<T | null> {
      const conditions = Array.isArray(where) ? where : [where];
      return (
        store.find((item) =>
          conditions.some((condition) => matchesWhere(item, condition)),
        ) ?? null
      );
    },
    async find(
      options?: { where?: Array<Partial<T>> },
    ): Promise<Array<T & { roles?: never[] }>> {
      if (!options?.where?.length) {
        return store.map((item) => ({
          ...item,
          roles: (item as { roles?: never[] }).roles ?? [],
        }));
      }

      return store.filter((item) =>
        options.where!.some((condition) => matchesWhere(item, condition)),
      ) as Array<T & { roles?: never[] }>;
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
          const index = store.findIndex(
            (storedEntry) => storedEntry.id === entry.id,
          );
          if (index >= 0) {
            store[index] = {
              ...store[index],
              ...entry,
            };
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
      const index = store.findIndex(
        (storedEntry) => storedEntry.id === value.id,
      );
      if (index >= 0) {
        store[index] = {
          ...store[index],
          ...value,
        };
      } else {
        store.push(value);
      }
      return value;
    },
    async delete(where: Partial<T>): Promise<void> {
      for (let index = store.length - 1; index >= 0; index -= 1) {
        const entry = store[index];
        if (
          Object.entries(where).every(
            ([key, value]) => entry[key as keyof T] === value,
          )
        ) {
          store.splice(index, 1);
        }
      }
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
      name: 'super_admin',
      description: 'Global administrator',
    },
    {
      id: randomUUID(),
      name: 'user',
      description: 'Standard user',
    },
  ]);
  const userRoleRepository = createRepositoryMock();
  const tenantRepository = createRepositoryMock([
    {
      id: randomUUID(),
      slug: 'lxp-internal',
      displayName: 'LXP Internal',
      allowUserCredentialOverride: true,
      status: 'active',
    },
  ]);
  const tenantMembershipRepository = createRepositoryMock();
  const providerRepository = createRepositoryMock([
    {
      id: randomUUID(),
      providerId: 'nanogpt',
      displayName: 'NanoGPT',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'openrouter',
      displayName: 'OpenRouter',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'ollama',
      displayName: 'Ollama',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'groq',
      displayName: 'Groq',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'google',
      displayName: 'Google Gemini',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'xai',
      displayName: 'xAI Grok',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'openai',
      displayName: 'OpenAI',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'anthropic',
      displayName: 'Anthropic Claude',
      status: 'active',
    },
  ]);
  const credentialRepository = createRepositoryMock();
  const tenantRlsService = {
    async withTenantContext(
      _tenantId: string,
      work: (manager: {
        getRepository: (_entity: unknown) => typeof credentialRepository;
      }) => Promise<unknown>,
    ) {
      return work({
        getRepository: () => credentialRepository,
      });
    },
  };
  const superAdminBootstrapService = {
    async syncUserIfConfigured() {
      return;
    },
  };
  const actor = {
    userUuid: randomUUID(),
    activeTenantId: tenantRepository.data[0]!.id,
    activeTenantSlug: tenantRepository.data[0]!.slug,
    roles: ['tenant_admin'],
    globalRoles: [],
  } as const;

  return {
    service: new AdminService(
      userRepository as never,
      roleRepository as never,
      userRoleRepository as never,
      tenantRepository as never,
      tenantMembershipRepository as never,
      providerRepository as never,
      credentialRepository as never,
      new EmailProtectionService(new EncryptionService()),
      new EncryptionService(),
      new PasswordService(),
      tenantRlsService as never,
      superAdminBootstrapService as never,
    ),
    actor,
    repositories: {
      tenantRepository,
      tenantMembershipRepository,
      userRepository,
      userRoleRepository,
      credentialRepository,
    },
  };
}

test('AdminService creates a user with protected email and assigned roles', async () => {
  const { actor, service, repositories } = createAdminService();

  const user = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
    roles: ['tenant_admin'],
  });

  assert.ok(user.userUuid);
  assert.equal(user.email, 'patrick@example.com');
  assert.deepEqual(user.roles, ['tenant_admin']);
  assert.equal(repositories.userRepository.data.length, 1);
  assert.equal(repositories.tenantMembershipRepository.data.length, 1);
  assert.equal(repositories.userRoleRepository.data.length, 0);
});

test('AdminService rejects creating a user when the email already exists', async () => {
  const { actor, service } = createAdminService();

  await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
    roles: ['tenant_admin'],
  });

  await assert.rejects(
    () =>
      service.createUser(actor, {
        email: 'patrick@example.com',
        password: 'Sup3rS3cret!',
        displayName: 'Patrick Again',
        roles: ['tenant_admin'],
      }),
    /Unable to create user with the provided data/,
  );
});

test('AdminService defaults a new tenant member to the user role', async () => {
  const { actor, service } = createAdminService();

  const user = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  assert.deepEqual(user.roles, ['user']);
});

test('AdminService stores an encrypted provider credential and returns only metadata', async () => {
  const { actor, service, repositories } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const credential = await service.storeProviderCredentialForActor(actor, {
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

test('AdminService lists both tenant-scoped and user-scoped provider credentials', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredentialForActor(actor, {
    providerId: 'nanogpt',
    label: 'tenant-default',
    apiToken: 'tenant-secret-token',
    scope: 'tenant',
  });
  await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'user-default',
    apiToken: 'user-secret-token',
  });

  const credentials = await service.listProviderCredentialsForUser(
    actor,
    createdUser.userUuid,
  );

  assert.deepEqual(
    credentials.map((credential) => credential.scope).sort(),
    ['tenant', 'user'],
  );
  assert.equal(credentials.length, 2);
});

test('AdminService updates an owned provider credential without exposing the raw token', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });
  const createdCredential = await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  const updatedCredential = await service.updateOwnProviderCredential(
    {
      userUuid: createdUser.userUuid,
      activeTenantId: actor.activeTenantId,
      activeTenantSlug: actor.activeTenantSlug,
      roles: ['user'],
    },
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
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const credential = await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'short',
    apiToken: 'abcd',
  });

  assert.equal(credential.maskedHint, 'abcd');
});

test('AdminService stores an Ollama endpoint-only credential', async () => {
  const { actor, service, repositories } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const credential = await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'ollama',
    label: 'local-ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
  });

  assert.equal(credential.providerId, 'ollama');
  assert.equal(credential.maskedHint, 'http://127.0.0.1:11434/v1');

  const stored = repositories.credentialRepository.data[0] as {
    encryptedSecret: string;
  };
  assert.notEqual(
    stored.encryptedSecret,
    JSON.stringify({ baseUrl: 'http://127.0.0.1:11434/v1' }),
  );
});

test('AdminService rejects Ollama cloud credentials on ollama.com without an API token', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'ollama',
        label: 'cloud-without-token',
        baseUrl: 'https://ollama.com',
      }),
    /require an API token/,
  );
});

test('AdminService rejects xAI Grok credentials without an API token', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'xai',
        label: 'grok-without-token',
        baseUrl: 'https://api.x.ai/v1',
      }),
    /xAI Grok credentials require an API token/,
  );
});

test('AdminService rejects Google Gemini credentials without an API token', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'google' as ProviderId,
        label: 'gemini-without-token',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      }),
    /Google Gemini credentials require an API token/,
  );
});

test('AdminService rejects OpenAI credentials without an API token', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'openai',
        label: 'openai-without-token',
        baseUrl: 'https://api.openai.com/v1',
      }),
    /OpenAI credentials require an API token/,
  );
});

test('AdminService rejects Anthropic credentials without an API token', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'anthropic' as ProviderId,
        label: 'anthropic-without-token',
        baseUrl: 'https://api.anthropic.com',
      }),
    /Anthropic credentials require an API token/,
  );
});

test('AdminService rejects storing a provider credential when the user does not exist', async () => {
  const { actor, service } = createAdminService();

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: randomUUID(),
        providerId: 'nanogpt',
        label: 'primary',
        apiToken: 'nano-secret-token',
      }),
    /User not found/,
  );
});

test('AdminService rejects storing a provider credential when the provider does not exist', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'unknown-provider' as never,
        label: 'primary',
        apiToken: 'nano-secret-token',
      }),
    /Unable to store the provider credential/,
  );
});

test('AdminService rejects storing a duplicate provider credential label', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        userUuid: createdUser.userUuid,
        providerId: 'nanogpt',
        label: 'primary',
        apiToken: 'another-secret-token',
      }),
    /Unable to store the provider credential/,
  );
});

test('AdminService rejects updating a provider credential when the new label already exists', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  const primaryCredential = await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });
  await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'backup',
    apiToken: 'backup-secret-token',
  });

  await assert.rejects(
    () =>
      service.updateOwnProviderCredential(
        {
          userUuid: createdUser.userUuid,
          activeTenantId: actor.activeTenantId,
          activeTenantSlug: actor.activeTenantSlug,
          roles: ['user'],
        },
        primaryCredential.id,
        {
          label: 'backup',
        },
      ),
    /Unable to update the provider credential/,
  );
});

test('AdminService updates provider settings for a user', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  const settings = await service.updateProviderSettingsForUser(
    actor,
    createdUser.userUuid,
    {
      defaultProviderId: 'nanogpt',
      defaultModel: 'z-ai/glm-4.6:thinking',
    },
  );

  assert.equal(settings.defaultProviderId, 'nanogpt');
  assert.equal(settings.defaultModel, 'z-ai/glm-4.6:thinking');
  assert.equal(settings.defaultImageProviderId, null);
  assert.equal(settings.defaultImageModel, null);
});

test('AdminService updates image defaults separately from chat defaults', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });

  const settings = await service.updateProviderSettingsForUser(
    actor,
    createdUser.userUuid,
    {
      defaultProviderId: 'nanogpt',
      defaultModel: 'z-ai/glm-4.6:thinking',
      defaultImageProviderId: 'nanogpt',
      defaultImageModel: 'mistral-medium',
    },
  );

  assert.equal(settings.defaultProviderId, 'nanogpt');
  assert.equal(settings.defaultModel, 'z-ai/glm-4.6:thinking');
  assert.equal(settings.defaultImageProviderId, 'nanogpt');
  assert.equal(settings.defaultImageModel, 'mistral-medium');
});

test('AdminService updates a user password', async () => {
  const { actor, service, repositories } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });
  const passwordService = new PasswordService();
  const storedUser = repositories.userRepository.data[0] as {
    passwordHash: string;
    roles?: never[];
  };
  const oldHash = storedUser.passwordHash;
  storedUser.roles = [];

  const updatedUser = await service.updateUser(actor, createdUser.userUuid, {
    password: 'N3wSup3rS3cret!',
  });

  assert.equal(updatedUser?.userUuid, createdUser.userUuid);
  assert.equal(repositories.userRepository.data.length, 1);
  assert.notEqual(storedUser.passwordHash, oldHash);
  assert.ok(
    await passwordService.verifyPassword(
      'N3wSup3rS3cret!',
      storedUser.passwordHash,
    ),
  );
});

test('AdminService rejects default provider selection without an active credential', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await assert.rejects(
    () =>
      service.updateProviderSettingsForUser(actor, createdUser.userUuid, {
        defaultProviderId: 'nanogpt',
      }),
    /Unable to update provider settings/,
  );
});

test('AdminService clears default model when the default provider is cleared', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'patrick@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Patrick',
  });

  await service.storeProviderCredentialForActor(actor, {
    userUuid: createdUser.userUuid,
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'nano-secret-token',
  });
  await service.updateProviderSettingsForUser(actor, createdUser.userUuid, {
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  });

  const settings = await service.updateProviderSettingsForUser(
    actor,
    createdUser.userUuid,
    {
      defaultProviderId: null,
    },
  );

  assert.equal(settings.defaultProviderId, null);
  assert.equal(settings.defaultModel, null);
  assert.equal(settings.defaultImageProviderId, null);
  assert.equal(settings.defaultImageModel, null);
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
