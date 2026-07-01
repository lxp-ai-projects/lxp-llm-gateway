import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { TenantRlsService } from '../persistence/tenant-rls.service';
import { EncryptionService } from '../security/encryption.service';
import { AdminProviderCredentialService } from './admin-provider-credential.service';

function createRepositoryMock<T extends { id?: string }>(initialData: T[] = []) {
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
    async find(options?: {
      where?: Partial<T> | Array<Partial<T>>;
      relations?: Record<string, boolean>;
      order?: Record<string, 'ASC' | 'DESC'>;
    }): Promise<T[]> {
      void options?.relations;
      const conditions = options?.where
        ? Array.isArray(options.where)
          ? options.where
          : [options.where]
        : [];
      let results = !conditions.length
        ? [...store]
        : store.filter((item) =>
            conditions.some((condition) => matchesWhere(item, condition)),
          );

      const [orderKey, direction] = Object.entries(options?.order ?? {})[0] ?? [];
      if (orderKey) {
        results = [...results].sort((left, right) => {
          const leftValue = left[orderKey as keyof T];
          const rightValue = right[orderKey as keyof T];
          if (leftValue === rightValue) {
            return 0;
          }

          if (leftValue instanceof Date && rightValue instanceof Date) {
            return direction === 'ASC'
              ? leftValue.getTime() - rightValue.getTime()
              : rightValue.getTime() - leftValue.getTime();
          }

          return direction === 'ASC'
            ? String(leftValue).localeCompare(String(rightValue))
            : String(rightValue).localeCompare(String(leftValue));
        });
      }

      return results;
    },
    create(value: T): T {
      return {
        ...value,
        id: value.id ?? `generated-${store.length + 1}`,
      };
    },
    async save(value: T | T[]): Promise<T | T[]> {
      if (Array.isArray(value)) {
        for (const entry of value) {
          await this.save(entry);
        }
        return value;
      }

      const entry = {
        ...value,
        id: value.id ?? `generated-${store.length + 1}`,
        createdAt:
          'createdAt' in value && !value.createdAt
            ? (new Date('2026-01-01T00:00:00.000Z') as never)
            : value.createdAt,
      };
      const existingIndex = store.findIndex(
        (storedEntry) => storedEntry.id === entry.id,
      );
      if (existingIndex >= 0) {
        store[existingIndex] = {
          ...store[existingIndex],
          ...entry,
        };
      } else {
        store.push(entry);
      }
      return entry;
    },
    async delete(where: Partial<T>): Promise<void> {
      for (let index = store.length - 1; index >= 0; index -= 1) {
        if (matchesWhere(store[index], where)) {
          store.splice(index, 1);
        }
      }
    },
  };
}

function createAdminProviderCredentialService(options?: {
  actorRoles?: Array<'user' | 'tenant_admin' | 'operator'>;
  providerData?: Array<Record<string, unknown>>;
  credentialData?: Array<Record<string, unknown>>;
}) {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  const actor = {
    userUuid: 'user-uuid-1',
    activeTenantId: 'tenant-1',
    activeTenantSlug: 'tenant-one',
    roles: options?.actorRoles ?? ['tenant_admin'],
    globalRoles: [],
  } as const;

  const encryptionService = new EncryptionService();
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      userUuid: actor.userUuid,
      status: 'active',
    },
    {
      id: 'user-2',
      userUuid: 'user-uuid-2',
      status: 'active',
    },
  ]);
  const tenantMembershipRepository = createRepositoryMock([
    {
      tenantId: actor.activeTenantId,
      userId: 'user-1',
      role: 'tenant_admin',
    },
    {
      tenantId: actor.activeTenantId,
      userId: 'user-2',
      role: 'user',
    },
  ]);
  const providerRepository = createRepositoryMock(
    options?.providerData ?? [
      {
        id: 'provider-openai',
        providerId: 'openai',
        displayName: 'OpenAI',
        status: 'active',
      },
      {
        id: 'provider-groq',
        providerId: 'groq',
        displayName: 'Groq',
        status: 'active',
      },
      {
        id: 'provider-ollama',
        providerId: 'ollama',
        displayName: 'Ollama',
        status: 'active',
      },
    ],
  );
  const credentialRepository = createRepositoryMock(options?.credentialData ?? []);
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

  return {
    actor,
    credentialRepository,
    encryptionService,
    service: new AdminProviderCredentialService(
      userRepository as never,
      tenantMembershipRepository as never,
      providerRepository as never,
      encryptionService,
      tenantRlsService as TenantRlsService,
    ),
  };
}

test('AdminProviderCredentialService lists credentials with an unknown provider fallback', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    providerData: [],
    credentialData: [
      {
        id: 'credential-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        providerId: 'provider-missing',
        provider: null,
        scope: 'user',
        label: 'Primary',
        maskedHint: '***1234',
        isActive: true,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        lastUsedAt: null,
      },
    ],
  });

  const [credential] = await service.listProviderCredentialsForUser(
    actor,
    actor.userUuid,
  );

  assert.equal(credential.providerId, 'provider-missing');
  assert.equal(credential.providerDisplayName, 'Unknown provider');
});

test('AdminProviderCredentialService rejects listing another user credential list for non-privileged actors', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    actorRoles: ['user'],
  });

  await assert.rejects(
    () => service.listProviderCredentialsForUser(actor, 'user-uuid-2'),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(
        error.message,
        /You cannot view another user provider credential list/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService defaults user-scoped credentials to the active actor', async () => {
  const { actor, credentialRepository, service } =
    createAdminProviderCredentialService();

  const credential = await service.storeProviderCredentialForActor(actor, {
    providerId: 'openai',
    label: 'Primary',
    apiToken: 'sk-openai-12345678',
    scope: 'user',
  });

  assert.equal(credential.userUuid, actor.userUuid);
  assert.equal(credential.scope, 'user');
  assert.equal(credential.maskedHint, '***5678');
  assert.equal(credentialRepository.data.length, 1);
  assert.equal(credentialRepository.data[0]?.userId, 'user-1');
});

test('AdminProviderCredentialService rejects tenant-scoped credentials targeting a user', async () => {
  const { actor, service } = createAdminProviderCredentialService();

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        providerId: 'openai',
        label: 'Tenant',
        apiToken: 'sk-openai-12345678',
        scope: 'tenant',
        userUuid: 'user-uuid-2',
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(
        error.message,
        /Tenant-scoped credentials cannot target an individual user/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService rejects credentials that have neither an API token nor a base URL', async () => {
  const { actor, service } = createAdminProviderCredentialService();

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        providerId: 'openai',
        label: 'Empty',
        scope: 'user',
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(
        error.message,
        /must include an API token, a base URL, or both/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService rejects another user credential for non-privileged actors', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    actorRoles: ['user'],
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        providerId: 'openai',
        label: 'Other user',
        apiToken: 'sk-openai-12345678',
        scope: 'user',
        userUuid: 'user-uuid-2',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(
        error.message,
        /You cannot manage another user provider credential/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService rejects tenant credentials for non-privileged actors', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    actorRoles: ['user'],
  });

  await assert.rejects(
    () =>
      service.storeProviderCredentialForActor(actor, {
        providerId: 'openai',
        label: 'Tenant',
        apiToken: 'sk-openai-12345678',
        scope: 'tenant',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(
        error.message,
        /Only tenant administrators or operators can manage tenant credentials/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService stores endpoint-only Ollama credentials with the base URL hint', async () => {
  const { actor, service } = createAdminProviderCredentialService();

  const credential = await service.storeProviderCredentialForActor(actor, {
    providerId: 'ollama',
    label: 'Ollama local',
    baseUrl: 'http://localhost:11434',
    scope: 'user',
  });

  assert.equal(credential.maskedHint, 'localhost:11434');
});

test('AdminProviderCredentialService rejects tenant credential updates for non-privileged actors', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    actorRoles: ['user'],
    credentialData: [
      {
        id: 'credential-1',
        tenantId: 'tenant-1',
        userId: null,
        providerId: 'provider-openai',
        provider: {
          id: 'provider-openai',
          providerId: 'openai',
          displayName: 'OpenAI',
        },
        scope: 'tenant',
        label: 'Tenant',
        maskedHint: '***5678',
        encryptedSecret: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: '1',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: null,
      },
    ],
  });

  await assert.rejects(
    () => service.updateOwnProviderCredential(actor, 'credential-1', { label: 'New' }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(
        error.message,
        /Only tenant administrators or operators can manage tenant credentials/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService merges legacy plaintext secrets when refreshing a credential', async () => {
  const { actor, credentialRepository, encryptionService, service } =
    createAdminProviderCredentialService({
      credentialData: [
        {
          id: 'credential-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          providerId: 'provider-openai',
          provider: {
            id: 'provider-openai',
            providerId: 'openai',
            displayName: 'OpenAI',
          },
          scope: 'user',
          label: 'Primary',
          maskedHint: '***1234',
          encryptedSecret: 'placeholder-ciphertext',
          iv: 'placeholder-iv',
          authTag: 'placeholder-auth-tag',
          keyVersion: '1',
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          lastUsedAt: null,
        },
      ],
    });

  const legacyEncrypted = encryptionService.encrypt('legacy-token-1234');
  credentialRepository.data[0] = {
    ...credentialRepository.data[0],
    encryptedSecret: legacyEncrypted.ciphertext,
    iv: legacyEncrypted.iv,
    authTag: legacyEncrypted.authTag,
    keyVersion: legacyEncrypted.keyVersion,
  };

  await service.updateOwnProviderCredential(actor, 'credential-1', {
    baseUrl: 'https://api.openai.com/v1',
  });

  const savedCredential = credentialRepository.data[0];
  const decryptedPayload = encryptionService.decrypt({
    ciphertext: savedCredential.encryptedSecret,
    iv: savedCredential.iv,
    authTag: savedCredential.authTag,
    keyVersion: savedCredential.keyVersion,
  });

  assert.deepEqual(JSON.parse(decryptedPayload), {
    apiKey: 'legacy-token-1234',
    baseUrl: 'https://api.openai.com/v1',
  });
  assert.equal(savedCredential.maskedHint, '***1234');
});

test('AdminProviderCredentialService returns null userUuid when updating a tenant-scoped credential', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    credentialData: [
      {
        id: 'credential-tenant-1',
        tenantId: 'tenant-1',
        userId: null,
        providerId: 'provider-openai',
        provider: {
          id: 'provider-openai',
          providerId: 'openai',
          displayName: 'OpenAI',
        },
        scope: 'tenant',
        label: 'Tenant',
        maskedHint: '***5678',
        encryptedSecret: 'placeholder-ciphertext',
        iv: 'placeholder-iv',
        authTag: 'placeholder-auth-tag',
        keyVersion: '1',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: null,
      },
    ],
  });

  const updated = await service.updateOwnProviderCredential(
    actor,
    'credential-tenant-1',
    { label: 'Tenant shared' },
  );

  assert.equal(updated.userUuid, null);
});

test('AdminProviderCredentialService rejects deleting tenant credentials for non-privileged actors', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    actorRoles: ['user'],
    credentialData: [
      {
        id: 'credential-1',
        tenantId: 'tenant-1',
        userId: null,
        providerId: 'provider-openai',
        scope: 'tenant',
        label: 'Tenant',
        maskedHint: '***5678',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: null,
      },
    ],
  });

  await assert.rejects(
    () => service.deleteOwnProviderCredential(actor, 'credential-1'),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(
        error.message,
        /Only tenant administrators or operators can manage tenant credentials/,
      );
      return true;
    },
  );
});

test('AdminProviderCredentialService rejects updating a credential when the provider cannot be resolved', async () => {
  const { actor, service } = createAdminProviderCredentialService({
    providerData: [],
    credentialData: [
      {
        id: 'credential-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        providerId: 'provider-openai',
        provider: null,
        scope: 'user',
        label: 'Primary',
        maskedHint: '***5678',
        encryptedSecret: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: '1',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: null,
      },
    ],
  });

  await assert.rejects(
    () => service.updateOwnProviderCredential(actor, 'credential-1', { label: 'New' }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.match(error.message, /Unable to update the provider credential/);
      return true;
    },
  );
});
