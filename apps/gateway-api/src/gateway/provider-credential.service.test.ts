import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';

import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { ProviderCredentialService } from './provider-credential.service';

function createRepositoryMock<T>(data: T[]) {
  return {
    async findOne({
      where,
    }: {
      where: Record<string, unknown>;
      order?: Record<string, 'ASC' | 'DESC'>;
    }): Promise<T | null> {
      return (
        data.find((item) =>
          Object.entries(where).every(([key, value]) => {
            const itemValue = (item as Record<string, unknown>)[key];
            if (
              value &&
              typeof value === 'object' &&
              '_type' in (value as Record<string, unknown>)
            ) {
              const operator = value as { _type: string };
              if (operator._type === 'isNull') {
                return itemValue === null;
              }
            }

            return itemValue === value;
          }),
        ) ?? null
      );
    },
    async find({
      where,
    }: {
      where: Record<string, unknown> | Array<Record<string, unknown>>;
    }): Promise<T[]> {
      const clauses = Array.isArray(where) ? where : [where];
      return data.filter((item) =>
        clauses.some((clause) =>
          Object.entries(clause).every(([key, value]) => {
            const itemValue = (item as Record<string, unknown>)[key];
            if (
              value &&
              typeof value === 'object' &&
              '_type' in (value as Record<string, unknown>)
            ) {
              const operator = value as { _type: string };
              if (operator._type === 'isNull') {
                return itemValue === null;
              }
            }

            return itemValue === value;
          }),
        ),
      );
    },
  };
}

function createService(fixtures?: {
  users?: Array<Record<string, unknown>>;
  tenants?: Array<Record<string, unknown>>;
  providers?: Array<Record<string, unknown>>;
  credentials?: Array<Record<string, unknown>>;
  decryptResult?: string;
  decryptThrows?: boolean;
  resolvedConfiguration?: {
    providerStatus?: 'active' | 'disabled';
    enabled?: boolean;
    credentialMode?: 'platform_default' | 'tenant_byok' | 'user_byok' | 'hybrid';
    preferUserCredentials?: boolean;
    allowPlatformFallback?: boolean;
    allowTenantFallback?: boolean;
  };
}) {
  const credentials = fixtures?.credentials ?? [];
  const manager = {
    async query(): Promise<void> {},
    getRepository(entity: unknown) {
      if (entity === UserProviderCredentialEntity) {
        return createRepositoryMock(credentials);
      }

      throw new Error(`Unexpected repository request in test: ${String(entity)}`);
    },
  };
  const tenantRlsService = {
    async withTenantContext<T>(
      _tenantId: string,
      work: (entityManager: typeof manager) => Promise<T>,
    ): Promise<T> {
      return work(manager);
    },
  };
  const tenantProviderConfigurationService = {
    async assertProviderEnabled(
      tenantId: string,
      providerId: 'nanogpt',
    ): Promise<Record<string, unknown>> {
      const resolvedConfiguration = {
        tenantId,
        providerId,
        providerDisplayName: providerId,
        providerStatus:
          fixtures?.resolvedConfiguration?.providerStatus ?? 'active',
        enabled: fixtures?.resolvedConfiguration?.enabled ?? true,
        defaultTextModel: null,
        defaultImageModel: null,
        credentialMode:
          fixtures?.resolvedConfiguration?.credentialMode ?? 'hybrid',
        preferUserCredentials:
          fixtures?.resolvedConfiguration?.preferUserCredentials ?? true,
        allowPlatformFallback:
          fixtures?.resolvedConfiguration?.allowPlatformFallback ?? false,
        allowTenantFallback:
          fixtures?.resolvedConfiguration?.allowTenantFallback ?? true,
      };
      if (
        resolvedConfiguration.providerStatus !== 'active' ||
        !resolvedConfiguration.enabled
      ) {
        throw new Error(
          `Provider ${providerId} is disabled for tenant ${tenantId}.`,
        );
      }

      return resolvedConfiguration;
    },
  };

  return new ProviderCredentialService(
    createRepositoryMock(fixtures?.users ?? []) as never,
    createRepositoryMock(fixtures?.tenants ?? []) as never,
    createRepositoryMock(fixtures?.providers ?? []) as never,
    createRepositoryMock(credentials) as never,
    {
      decrypt(): string {
        if (fixtures?.decryptThrows) {
          throw new Error('Unsupported state or unable to authenticate data');
        }

        return fixtures?.decryptResult ?? 'legacy-token';
      },
    } as never,
    tenantRlsService as never,
    tenantProviderConfigurationService as never,
  );
}

test('ProviderCredentialService resolves a user-scoped credential when tenant override is allowed', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
    providers: [
      {
        id: 'provider-1',
        providerId: 'nanogpt',
        status: 'active',
      },
    ],
    credentials: [
      {
        id: 'cred-user',
        tenantId: 'tenant-1',
        userId: 'user-1',
        providerId: 'provider-1',
        scope: 'user',
        isActive: true,
        encryptedSecret: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'cred-tenant',
        tenantId: 'tenant-1',
        userId: null,
        providerId: 'provider-1',
        scope: 'tenant',
        isActive: true,
        encryptedSecret: 'cipher-tenant',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    ],
    decryptResult: JSON.stringify({
      apiKey: 'nano-secret-token',
    }),
  });

  const providerAccess = await service.resolveProviderAccess(
    {
      activeTenantId: 'tenant-1',
      emailHash: 'hash-1',
      userId: 'user-1',
    },
    'nanogpt',
  );

  assert.equal(providerAccess.apiKey, 'nano-secret-token');
});

test('ProviderCredentialService falls back to the tenant credential when user override is disabled', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: false,
      },
    ],
    providers: [
      {
        id: 'provider-1',
        providerId: 'nanogpt',
        status: 'active',
      },
    ],
    credentials: [
      {
        id: 'cred-user',
        tenantId: 'tenant-1',
        userId: 'user-1',
        providerId: 'provider-1',
        scope: 'user',
        isActive: true,
        encryptedSecret: 'cipher-user',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'cred-tenant',
        tenantId: 'tenant-1',
        userId: null,
        providerId: 'provider-1',
        scope: 'tenant',
        isActive: true,
        encryptedSecret: 'cipher-tenant',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    ],
    decryptResult: JSON.stringify({
      apiKey: 'tenant-secret-token',
    }),
  });

  const providerAccess = await service.resolveProviderAccess(
    {
      activeTenantId: 'tenant-1',
      emailHash: 'hash-1',
      userId: 'user-1',
    },
    'nanogpt',
  );

  assert.equal(providerAccess.apiKey, 'tenant-secret-token');
});

test('ProviderCredentialService falls back to legacy raw token payloads', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
    providers: [
      {
        id: 'provider-1',
        providerId: 'nanogpt',
        status: 'active',
      },
    ],
    credentials: [
      {
        id: 'cred-user',
        tenantId: 'tenant-1',
        userId: 'user-1',
        providerId: 'provider-1',
        scope: 'user',
        isActive: true,
        encryptedSecret: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ],
    decryptResult: 'legacy-token',
  });

  const providerAccess = await service.resolveProviderAccess(
    {
      activeTenantId: 'tenant-1',
      emailHash: 'hash-1',
      userId: 'user-1',
    },
    'nanogpt',
  );
  assert.equal(providerAccess.apiKey, 'legacy-token');
});

test('ProviderCredentialService throws an explicit error when credential decryption fails', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
    providers: [
      {
        id: 'provider-1',
        providerId: 'nanogpt',
        status: 'active',
      },
    ],
    credentials: [
      {
        id: 'cred-user',
        tenantId: 'tenant-1',
        userId: 'user-1',
        providerId: 'provider-1',
        scope: 'user',
        isActive: true,
        encryptedSecret: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 1,
      },
    ],
    decryptThrows: true,
  });

  await assert.rejects(
    () =>
      service.resolveProviderAccess(
        {
          activeTenantId: 'tenant-1',
          emailHash: 'hash-1',
          userId: 'user-1',
        },
        'nanogpt',
      ),
    /Unable to decrypt the stored credential for provider nanogpt/,
  );
});

test('ProviderCredentialService rejects missing authenticated user context', async () => {
  const service = createService();

  await assert.rejects(
    () =>
      service.resolveProviderAccess(
        {
          activeTenantId: 'tenant-1',
          emailHash: '',
          userId: 'user-1',
        },
        'nanogpt',
      ),
    /Missing authenticated user email hash/,
  );
});

test('ProviderCredentialService rejects when the authenticated user cannot be resolved', async () => {
  const service = createService({
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.resolveProviderAccess(
        {
          activeTenantId: 'tenant-1',
          emailHash: 'missing-hash',
          userId: 'user-1',
        },
        'nanogpt',
      ),
    /Unable to resolve the provider credential for the authenticated request/,
  );
});

test('ProviderCredentialService rejects when the provider cannot be resolved', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.resolveProviderAccess(
        {
          activeTenantId: 'tenant-1',
          emailHash: 'hash-1',
          userId: 'user-1',
        },
        'nanogpt',
      ),
    /Unable to resolve the provider credential for the authenticated request/,
  );
});

test('ProviderCredentialService rejects when no active credential exists', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
    providers: [
      {
        id: 'provider-1',
        providerId: 'nanogpt',
        status: 'active',
      },
    ],
  });

  await assert.rejects(
    () =>
      service.resolveProviderAccess(
        {
          activeTenantId: 'tenant-1',
          emailHash: 'hash-1',
          userId: 'user-1',
        },
        'nanogpt',
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match(String(error), /No active credential path is configured/);
      return true;
    },
  );
});

test('ProviderCredentialService uses tenant provider configuration to disable platform fallback', async () => {
  const previousNanoApiKey = process.env.NANOGPT_API_KEY;
  process.env.NANOGPT_API_KEY = 'platform-nano-token';

  try {
    const service = createService({
      users: [
        {
          id: 'user-1',
          emailHash: 'hash-1',
          status: 'active',
        },
      ],
      tenants: [
        {
          id: 'tenant-1',
          status: 'active',
          allowUserCredentialOverride: true,
        },
      ],
      providers: [
        {
          id: 'provider-1',
          providerId: 'nanogpt',
          status: 'active',
        },
      ],
      resolvedConfiguration: {
        credentialMode: 'platform_default',
      },
    });

    const providerAccess = await service.resolveProviderAccess(
      {
        activeTenantId: 'tenant-1',
        emailHash: 'hash-1',
        userId: 'user-1',
      },
      'nanogpt',
    );

    assert.equal(providerAccess.apiKey, 'platform-nano-token');
  } finally {
    if (previousNanoApiKey === undefined) {
      delete process.env.NANOGPT_API_KEY;
    } else {
      process.env.NANOGPT_API_KEY = previousNanoApiKey;
    }
  }
});

test('ProviderCredentialService rejects disabled tenant provider configurations', async () => {
  const service = createService({
    users: [
      {
        id: 'user-1',
        emailHash: 'hash-1',
        status: 'active',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        status: 'active',
        allowUserCredentialOverride: true,
      },
    ],
    providers: [
      {
        id: 'provider-1',
        providerId: 'nanogpt',
        status: 'active',
      },
    ],
    resolvedConfiguration: {
      enabled: false,
    },
  });

  await assert.rejects(
    () =>
      service.resolveProviderAccess(
        {
          activeTenantId: 'tenant-1',
          emailHash: 'hash-1',
          userId: 'user-1',
        },
        'nanogpt',
      ),
    /disabled for tenant/,
  );
});
