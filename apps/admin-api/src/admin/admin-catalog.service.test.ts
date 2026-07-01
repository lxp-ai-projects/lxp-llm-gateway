import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';

import { TenantRlsService } from '../persistence/tenant-rls.service';
import { EncryptionService } from '../security/encryption.service';
import { AdminCatalogService } from './admin-catalog.service';

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

          return direction === 'ASC'
            ? String(leftValue).localeCompare(String(rightValue))
            : String(rightValue).localeCompare(String(leftValue));
        });
      }

      return results;
    },
  };
}

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

function createAdminCatalogService(options?: {
  defaultProviderId?: 'openai' | null;
  configuration?: {
    credentialMode?: 'hybrid' | 'platform_default' | 'user_byok' | 'tenant_byok';
    allowPlatformFallback?: boolean;
    allowTenantFallback?: boolean;
    preferUserCredentials?: boolean;
    enabled?: boolean;
  };
  userCredentialPayload?: Record<string, unknown> | null;
  tenantCredentialPayload?: Record<string, unknown> | null;
  providerStatus?: 'active' | 'disabled';
  tenantStatus?: 'active' | 'disabled';
  actorLike?: {
    userUuid: string;
    activeTenantId?: string;
    activeTenantSlug?: string;
    roles?: string[];
    globalRoles?: string[];
  };
  includeConfiguration?: boolean;
}) {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  const actor = {
    userUuid: options?.actorLike?.userUuid ?? 'user-uuid-1',
    activeTenantId: options?.actorLike?.activeTenantId ?? 'tenant-1',
    activeTenantSlug: options?.actorLike?.activeTenantSlug ?? 'tenant-one',
    roles: options?.actorLike?.roles ?? ['tenant_admin'],
    globalRoles: options?.actorLike?.globalRoles ?? [],
  };

  const encryptionService = new EncryptionService();
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      userUuid: actor.userUuid,
      status: 'active',
      defaultProviderId: options?.defaultProviderId ?? null,
    },
  ]);
  const tenantRepository = createRepositoryMock([
    {
      id: actor.activeTenantId,
      slug: actor.activeTenantSlug,
      status: options?.tenantStatus ?? 'active',
    },
  ]);
  const tenantMembershipRepository = createRepositoryMock([
    {
      tenantId: actor.activeTenantId,
      userId: 'user-1',
      role: 'tenant_admin',
      tenant: {
        id: actor.activeTenantId,
        slug: actor.activeTenantSlug,
        status: options?.tenantStatus ?? 'active',
      },
    },
  ]);
  const providerRepository = createRepositoryMock([
    {
      id: 'provider-openai',
      providerId: 'openai',
      displayName: 'OpenAI',
      status: options?.providerStatus ?? 'active',
    },
  ]);
  const tenantProviderConfigurationRepository = createRepositoryMock(
    options?.includeConfiguration === false
      ? []
      : [
          {
            id: 'config-openai',
            tenantId: actor.activeTenantId,
            providerId: 'provider-openai',
            enabled: options?.configuration?.enabled ?? true,
            defaultTextModel: null,
            defaultImageModel: null,
            credentialMode: options?.configuration?.credentialMode ?? 'hybrid',
            preferUserCredentials:
              options?.configuration?.preferUserCredentials ?? true,
            allowPlatformFallback:
              options?.configuration?.allowPlatformFallback ?? false,
            allowTenantFallback:
              options?.configuration?.allowTenantFallback ?? false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
  );

  const credentialData: Array<Record<string, unknown>> = [];

  if (options?.userCredentialPayload) {
    const encrypted = encryptionService.encrypt(
      JSON.stringify(options.userCredentialPayload),
    );
    credentialData.push({
      id: 'credential-1',
      tenantId: actor.activeTenantId,
      userId: 'user-1',
      providerId: 'provider-openai',
      scope: 'user',
      isActive: true,
      encryptedSecret: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  if (options?.tenantCredentialPayload) {
    const encrypted = encryptionService.encrypt(
      JSON.stringify(options.tenantCredentialPayload),
    );
    credentialData.push({
      id: 'credential-tenant-1',
      tenantId: actor.activeTenantId,
      userId: null,
      providerId: 'provider-openai',
      scope: 'tenant',
      isActive: true,
      encryptedSecret: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  const credentialRepository = createRepositoryMock(credentialData);
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
    service: new AdminCatalogService(
      userRepository as never,
      tenantRepository as never,
      tenantMembershipRepository as never,
      providerRepository as never,
      tenantProviderConfigurationRepository as never,
      encryptionService,
      tenantRlsService as TenantRlsService,
    ),
  };
}

async function withMockedFetch<T>(
  mockFetch: typeof fetch,
  run: () => Promise<T>,
) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test('AdminCatalogService rejects unsafe custom provider base URLs before adapter fetch', async () => {
  const { actor, service } = createAdminCatalogService({
    userCredentialPayload: {
      apiKey: 'openai-secret',
      baseUrl: 'https://169.254.169.254/v1',
    },
  });
  const previousFetch = globalThis.fetch;
  const fetchCalls: string[] = [];
  globalThis.fetch = (async (input) => {
    fetchCalls.push(String(input));
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => service.listOwnModels(actor, 'openai'),
      (error: unknown) => {
        assert.ok(error instanceof ForbiddenException);
        assert.match(
          error.message,
          /Model catalog lookups are not allowed for the configured openai base URL/,
        );
        return true;
      },
    );
    assert.equal(fetchCalls.length, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('AdminCatalogService rejects cleartext base URLs for cloud provider catalogs', async () => {
  const { actor, service } = createAdminCatalogService({
    userCredentialPayload: {
      apiKey: 'openai-secret',
      baseUrl: 'http://api.openai.com/v1',
    },
  });

  await assert.rejects(
    () => service.listOwnModels(actor, 'openai'),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /require an HTTPS provider base URL/);
      return true;
    },
  );
});

test('AdminCatalogService rejects invalid platform credentials locally before listing models', async () => {
  const { actor, service } = createAdminCatalogService({
    defaultProviderId: 'openai',
    configuration: {
      credentialMode: 'platform_default',
      allowPlatformFallback: true,
    },
    userCredentialPayload: null,
  });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('fetch should not be reached');
  }) as typeof fetch;

  await withEnv(
    {
      OPENAI_API_KEY: undefined,
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
    },
    async () => {
      try {
        await assert.rejects(
          () => service.listOwnModels(actor),
          (error: unknown) => {
            assert.ok(error instanceof BadRequestException);
            assert.match(error.message, /OpenAI credentials require an API token/);
            return true;
          },
        );
      } finally {
        globalThis.fetch = previousFetch;
      }
    },
  );
});

test('AdminCatalogService fails fast when provider model listing times out', async () => {
  const { actor, service } = createAdminCatalogService({
    userCredentialPayload: {
      apiKey: 'openai-secret',
      baseUrl: 'https://api.openai.com/v1',
    },
  });
  const previousFetch = globalThis.fetch;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;

  globalThis.fetch = (() => new Promise<Response>(() => undefined)) as typeof fetch;
  globalThis.setTimeout = ((callback: TimerHandler) => {
    if (typeof callback === 'function') {
      callback();
    }
    return 1 as never;
  }) as typeof setTimeout;
  globalThis.clearTimeout = (() => undefined) as typeof clearTimeout;

  try {
    await assert.rejects(
      () => service.listOwnModels(actor, 'openai'),
      (error: unknown) => {
        assert.ok(error instanceof BadGatewayException);
        assert.match(error.message, /timed out before the server responded/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test('AdminCatalogService resolves a tenant-scoped fallback credential when no user credential exists', async () => {
  const { actor, service } = createAdminCatalogService({
    configuration: {
      credentialMode: 'hybrid',
      preferUserCredentials: true,
      allowTenantFallback: true,
    },
    userCredentialPayload: null,
    tenantCredentialPayload: {
      apiKey: 'tenant-openai-secret',
      baseUrl: 'https://api.openai.com/v1',
    },
  });

  await withMockedFetch(
    (async () =>
      new Response(
        JSON.stringify({ data: [{ id: 'gpt-4.1-mini', object: 'model' }] }),
        { status: 200 },
      )) as typeof fetch,
    async () => {
      const result = await service.listOwnModels(actor, 'openai');
      assert.equal(result.providerId, 'openai');
      assert.equal(result.models[0]?.id, 'gpt-4.1-mini');
    },
  );
});

test('AdminCatalogService rejects disabled tenant provider access before resolving credentials', async () => {
  const { actor, service } = createAdminCatalogService({
    configuration: {
      enabled: false,
    },
    userCredentialPayload: {
      apiKey: 'openai-secret',
      baseUrl: 'https://api.openai.com/v1',
    },
  });

  await withMockedFetch(
    (async () => {
      throw new Error('fetch should not be reached');
    }) as typeof fetch,
    async () => {
      await assert.rejects(
        () => service.listOwnModels(actor, 'openai'),
        (error: unknown) => {
          assert.ok(error instanceof ForbiddenException);
          assert.match(error.message, /Provider access is disabled for this tenant/);
          return true;
        },
      );
    },
  );
});

test('AdminCatalogService rejects globally disabled providers before resolving credentials', async () => {
  const { actor, service } = createAdminCatalogService({
    providerStatus: 'disabled',
    userCredentialPayload: {
      apiKey: 'openai-secret',
      baseUrl: 'https://api.openai.com/v1',
    },
  });

  await withMockedFetch(
    (async () => {
      throw new Error('fetch should not be reached');
    }) as typeof fetch,
    async () => {
      await assert.rejects(
        () => service.listOwnModels(actor, 'openai'),
        (error: unknown) => {
          assert.ok(error instanceof ForbiddenException);
          assert.match(
            error.message,
            /Provider is globally disabled and cannot be used by this tenant/,
          );
          return true;
        },
      );
    },
  );
});

test('AdminCatalogService resolves the active tenant from memberships when the actor context is partial', async () => {
  const { service } = createAdminCatalogService({
    actorLike: {
      userUuid: 'user-uuid-1',
      activeTenantId: 'tenant-1',
    },
    userCredentialPayload: {
      apiKey: 'openai-secret',
      baseUrl: 'https://api.openai.com/v1',
    },
  });

  await withMockedFetch(
    (async () =>
      new Response(
        JSON.stringify({ data: [{ id: 'gpt-4.1-mini', object: 'model' }] }),
        { status: 200 },
      )) as typeof fetch,
    async () => {
      const result = await service.listOwnModels(
        { userUuid: 'user-uuid-1', activeTenantId: 'tenant-1' },
        'openai',
      );
      assert.equal(result.providerId, 'openai');
      assert.equal(result.models[0]?.id, 'gpt-4.1-mini');
    },
  );
});

test('AdminCatalogService rejects partial actors when no explicit active tenant can be resolved', async () => {
  const { service } = createAdminCatalogService({
    actorLike: {
      userUuid: 'user-uuid-1',
    },
  });

  await assert.rejects(
    () => service.listOwnModels({ userUuid: 'user-uuid-1' }, 'openai'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.match(error.message, /User not found/);
      return true;
    },
  );
});

test('AdminCatalogService converts invalid control-plane JSON into a gateway error', async () => {
  const { service } = createAdminCatalogService();

  await withMockedFetch(
    (async () =>
      new Response('<html>not-json</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })) as typeof fetch,
    async () => {
      await assert.rejects(
        () => service.getOwnImageCatalog('access-token'),
        (error: unknown) => {
          assert.ok(error instanceof BadGatewayException);
          assert.match(error.message, /did not contain valid JSON/);
          return true;
        },
      );
    },
  );
});

test('AdminCatalogService surfaces structured control-plane errors from the gateway', async () => {
  const { service } = createAdminCatalogService();

  await withMockedFetch(
    (async () =>
      new Response(JSON.stringify({ message: ['Gateway denied', 'Try again'] }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch,
    async () => {
      await assert.rejects(
        () => service.getOwnVideoCatalog('access-token'),
        (error: unknown) => {
          assert.ok(error instanceof HttpException);
          assert.equal(error.getStatus(), 401);
          assert.match(error.message, /Gateway denied, Try again/);
          return true;
        },
      );
    },
  );
});
