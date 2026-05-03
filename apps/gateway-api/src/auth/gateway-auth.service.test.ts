import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import test from 'node:test';

import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { GatewayAuthService } from './gateway-auth.service';

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

function computeEmailHash(email: string, lookupKey: Buffer) {
  return createHmac('sha256', lookupKey)
    .update(email.trim().toLowerCase())
    .digest('hex');
}

function computeApiKeyHash(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex');
}

function createRepositoryMock<T>(data: T[]) {
  return {
    async findOne({
      where,
    }: {
      where: Record<string, unknown>;
      relations?: unknown;
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
              const operator = value as { _type: string; _value?: unknown };
              if (operator._type === 'moreThan') {
                return itemValue instanceof Date &&
                  operator._value instanceof Date
                  ? itemValue > operator._value
                  : false;
              }
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
      relations,
    }: {
      where: Record<string, unknown>;
      relations?: unknown;
    }): Promise<T[]> {
      void relations;
      return data.filter((item) =>
        Object.entries(where).every(
          ([key, value]) => (item as Record<string, unknown>)[key] === value,
        ),
      );
    },
    async update(): Promise<void> {},
  };
}

function createManagerRepositoryMock<T>(data: T[]) {
  const repository = createRepositoryMock(data);
  return {
    findOne: repository.findOne,
    update: repository.update,
  };
}

function createService(fixtures?: {
  users?: Array<Record<string, unknown>>;
  tenants?: Array<Record<string, unknown>>;
  memberships?: Array<Record<string, unknown>>;
  integrationClients?: Array<Record<string, unknown>>;
  apiKeys?: Array<Record<string, unknown>>;
}) {
  const manager = {
    async query(): Promise<void> {},
    getRepository(entity: unknown) {
      if (entity === ApiKeyEntity) {
        return createManagerRepositoryMock(fixtures?.apiKeys ?? []);
      }
      if (entity === IntegrationClientEntity) {
        return createManagerRepositoryMock(fixtures?.integrationClients ?? []);
      }

      throw new Error(`Unexpected repository request in test: ${String(entity)}`);
    },
  };
  const tenantRlsService = {
    async withApiKeyHashContext<T>(
      _apiKeyHash: string,
      work: (entityManager: typeof manager) => Promise<T>,
    ): Promise<T> {
      return work(manager);
    },
    async setTenantContext(): Promise<void> {},
  };

  return new GatewayAuthService(
    {
      verifyAsync: async () => {
        throw new Error('jwt not used');
      },
    } as never,
    createRepositoryMock(fixtures?.users ?? []) as never,
    createRepositoryMock(fixtures?.tenants ?? []) as never,
    createRepositoryMock(fixtures?.memberships ?? []) as never,
    tenantRlsService as never,
  );
}

test('GatewayAuthService resolves a tenant-scoped integration client default user from an API key', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const apiKey = 'lxp_test_integration_key';
  const tenant = {
    id: 'tenant-1',
    slug: 'lxp-internal',
    status: 'active',
  };
  const user = {
    id: 'user-1',
    userUuid: 'uuid-1',
    emailHash: aliceHash,
    status: 'active',
    defaultProviderId: 'nanogpt',
    defaultModel: 'nano-1',
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
  const integrationClient = {
    id: 'integration-1',
    tenantId: tenant.id,
    tenant,
    clientId: 'open-webui-demo',
    displayName: 'Open WebUI Demo',
    applicationId: 'open-webui',
    defaultUserId: user.id,
    defaultUser: user,
    scopes: ['chat:complete'],
    trustedForwardedIdentityEnabled: false,
    status: 'active',
  };

  const service = createService({
    users: [user],
    tenants: [tenant],
    memberships: [
      {
        id: 'membership-1',
        tenantId: tenant.id,
        userId: user.id,
        role: 'user',
        tenant,
      },
    ],
    integrationClients: [integrationClient],
    apiKeys: [
      {
        id: 'key-1',
        tenantId: tenant.id,
        integrationClientId: integrationClient.id,
        integrationClient,
        keyHash: computeApiKeyHash(apiKey),
        scopes: ['models:list'],
        status: 'active',
        expiresAt: null,
      },
    ],
  });

  await withEnv(
    {
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
      LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
    },
    async () => {
      const authContext = await service.authenticateOpenAiCompatibleRequest(
        `Bearer ${apiKey}`,
      );

      assert.equal(authContext.identitySource, 'integration-client-default-user');
      assert.equal(authContext.activeTenantId, tenant.id);
      assert.equal(authContext.integrationClientId, 'open-webui-demo');
      assert.deepEqual(
        authContext.integrationClientScopes,
        ['chat:completion', 'models:list'],
      );
      assert.equal(authContext.userUuid, 'uuid-1');
    },
  );
});

test('GatewayAuthService resolves a trusted forwarded user for an integration client in the same tenant', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const bobHash = computeEmailHash('bob@example.com', lookupKey);
  const apiKey = 'lxp_trusted_forwarded_key';
  const tenant = {
    id: 'tenant-1',
    slug: 'lxp-internal',
    status: 'active',
  };
  const alice = {
    id: 'user-1',
    userUuid: 'uuid-1',
    emailHash: aliceHash,
    status: 'active',
    defaultProviderId: 'nanogpt',
    defaultModel: 'nano-1',
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
  const bob = {
    id: 'user-2',
    userUuid: 'uuid-2',
    emailHash: bobHash,
    status: 'active',
    defaultProviderId: 'openrouter',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
  const integrationClient = {
    id: 'integration-1',
    tenantId: tenant.id,
    tenant,
    clientId: 'open-webui-demo',
    displayName: 'Open WebUI Demo',
    applicationId: 'open-webui',
    defaultUserId: alice.id,
    defaultUser: alice,
    scopes: [],
    trustedForwardedIdentityEnabled: true,
    status: 'active',
  };

  const service = createService({
    users: [alice, bob],
    tenants: [tenant],
    memberships: [
      {
        id: 'membership-1',
        tenantId: tenant.id,
        userId: alice.id,
        role: 'user',
        tenant,
      },
      {
        id: 'membership-2',
        tenantId: tenant.id,
        userId: bob.id,
        role: 'operator',
        tenant,
      },
    ],
    integrationClients: [integrationClient],
    apiKeys: [
      {
        id: 'key-1',
        tenantId: tenant.id,
        integrationClientId: integrationClient.id,
        integrationClient,
        keyHash: computeApiKeyHash(apiKey),
        scopes: [],
        status: 'active',
        expiresAt: null,
      },
    ],
  });

  await withEnv(
    {
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
      LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
    },
    async () => {
      const authContext = await service.authenticateOpenAiCompatibleRequest(
        `Bearer ${apiKey}`,
        undefined,
        {
          'x-openwebui-user-email': 'bob@example.com',
        },
      );

      assert.equal(
        authContext.identitySource,
        'integration-client-trusted-header',
      );
      assert.equal(authContext.userUuid, 'uuid-2');
      assert.equal(authContext.defaultProviderId, 'openrouter');
      assert.deepEqual(authContext.roles, ['operator']);
    },
  );
});

test('GatewayAuthService rejects a trusted forwarded user from a different tenant', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const bobHash = computeEmailHash('bob@example.com', lookupKey);
  const apiKey = 'lxp_cross_tenant_forwarded_key';
  const tenantOne = {
    id: 'tenant-1',
    slug: 'tenant-one',
    status: 'active',
  };
  const tenantTwo = {
    id: 'tenant-2',
    slug: 'tenant-two',
    status: 'active',
  };
  const alice = {
    id: 'user-1',
    userUuid: 'uuid-1',
    emailHash: aliceHash,
    status: 'active',
    defaultProviderId: 'nanogpt',
    defaultModel: 'nano-1',
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
  const bob = {
    id: 'user-2',
    userUuid: 'uuid-2',
    emailHash: bobHash,
    status: 'active',
    defaultProviderId: 'openrouter',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
  const integrationClient = {
    id: 'integration-1',
    tenantId: tenantOne.id,
    tenant: tenantOne,
    clientId: 'open-webui-demo',
    displayName: 'Open WebUI Demo',
    applicationId: 'open-webui',
    defaultUserId: alice.id,
    defaultUser: alice,
    scopes: ['chat:completion'],
    trustedForwardedIdentityEnabled: true,
    status: 'active',
  };

  const service = createService({
    users: [alice, bob],
    tenants: [tenantOne, tenantTwo],
    memberships: [
      {
        id: 'membership-1',
        tenantId: tenantOne.id,
        userId: alice.id,
        role: 'user',
        tenant: tenantOne,
      },
      {
        id: 'membership-2',
        tenantId: tenantTwo.id,
        userId: bob.id,
        role: 'operator',
        tenant: tenantTwo,
      },
    ],
    integrationClients: [integrationClient],
    apiKeys: [
      {
        id: 'key-1',
        tenantId: tenantOne.id,
        integrationClientId: integrationClient.id,
        integrationClient,
        keyHash: computeApiKeyHash(apiKey),
        scopes: [],
        status: 'active',
        expiresAt: null,
      },
    ],
  });

  await withEnv(
    {
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
      LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
    },
    async () => {
      await assert.rejects(
        () =>
          service.authenticateOpenAiCompatibleRequest(`Bearer ${apiKey}`, undefined, {
            'x-openwebui-user-email': 'bob@example.com',
          }),
        /not a member of the integration tenant/i,
      );
    },
  );
});

test('GatewayAuthService rejects an API key whose integration client does not belong to the same tenant', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const apiKey = 'lxp_mismatched_integration_client_key';
  const tenantOne = {
    id: 'tenant-1',
    slug: 'tenant-one',
    status: 'active',
  };
  const tenantTwo = {
    id: 'tenant-2',
    slug: 'tenant-two',
    status: 'active',
  };
  const alice = {
    id: 'user-1',
    userUuid: 'uuid-1',
    emailHash: aliceHash,
    status: 'active',
    defaultProviderId: 'nanogpt',
    defaultModel: 'nano-1',
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
  const foreignIntegrationClient = {
    id: 'integration-foreign',
    tenantId: tenantTwo.id,
    tenant: tenantTwo,
    clientId: 'foreign-client',
    displayName: 'Foreign Client',
    applicationId: 'other-app',
    defaultUserId: alice.id,
    defaultUser: alice,
    scopes: ['chat:completion'],
    trustedForwardedIdentityEnabled: false,
    status: 'active',
  };

  const service = createService({
    users: [alice],
    tenants: [tenantOne, tenantTwo],
    memberships: [
      {
        id: 'membership-1',
        tenantId: tenantOne.id,
        userId: alice.id,
        role: 'user',
        tenant: tenantOne,
      },
    ],
    integrationClients: [foreignIntegrationClient],
    apiKeys: [
      {
        id: 'key-1',
        tenantId: tenantOne.id,
        integrationClientId: foreignIntegrationClient.id,
        integrationClient: foreignIntegrationClient,
        keyHash: computeApiKeyHash(apiKey),
        scopes: ['chat:completion'],
        status: 'active',
        expiresAt: null,
      },
    ],
  });

  await withEnv(
    {
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
      LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
    },
    async () => {
      await assert.rejects(
        () => service.authenticateOpenAiCompatibleRequest(`Bearer ${apiKey}`),
        /integration client is not active for the supplied api key/i,
      );
    },
  );
});
