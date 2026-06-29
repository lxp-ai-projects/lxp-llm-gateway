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
    async find(options?: {
      where?: Partial<T> | Array<Partial<T>>;
      order?: Record<string, 'ASC' | 'DESC'>;
    }): Promise<Array<T & { roles?: never[] }>> {
      const conditions = options?.where
        ? Array.isArray(options.where)
          ? options.where
          : [options.where]
        : [];
      let results = !conditions.length
        ? store.map((item) => ({
            ...item,
            roles: (item as { roles?: never[] }).roles ?? [],
          }))
        : (store.filter((item) =>
            conditions.some((condition) => matchesWhere(item, condition)),
          ) as Array<T & { roles?: never[] }>);

      if (!options?.order) {
        return results;
      }

      const [orderKey, direction] = Object.entries(options.order)[0] ?? [];
      if (!orderKey) {
        return results;
      }

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

      return results;
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
  const integrationClientRepository = createRepositoryMock();
  const apiKeyRepository = createRepositoryMock();
  const tenantModelAccessRuleRepository = createRepositoryMock();
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
    {
      id: randomUUID(),
      providerId: 'mistral',
      displayName: 'Mistral',
      status: 'active',
    },
    {
      id: randomUUID(),
      providerId: 'deepseek',
      displayName: 'DeepSeek',
      status: 'active',
    },
  ]);
  const tenantProviderConfigurationRepository = createRepositoryMock([
    {
      id: randomUUID(),
      tenantId: tenantRepository.data[0]!.id,
      providerId: providerRepository.data[0]!.id,
      enabled: true,
      defaultTextModel: null,
      defaultImageModel: null,
      credentialMode: 'hybrid',
      preferUserCredentials: true,
      allowPlatformFallback: false,
      allowTenantFallback: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ]);
  const tenantPolicyRepository = createRepositoryMock();
  const usageEventRepository = createRepositoryMock([
    {
      id: randomUUID(),
      tenantId: tenantRepository.data[0]!.id,
      userId: randomUUID(),
      userUuid: randomUUID(),
      requestId: 'req-1',
      operation: 'chat',
      capability: 'text',
      providerId: 'nanogpt',
      model: 'glm-4.6',
      identitySource: 'session',
      integrationClientId: null,
      apiKeyId: null,
      credentialScopeUsed: 'user',
      status: 'success',
      errorCode: null,
      promptTokens: 100,
      completionTokens: 40,
      totalTokens: 140,
      reasoningTokens: null,
      imageCount: null,
      costEstimateUsd: '0.125000',
      latencyMs: 820,
      metadata: null,
      createdAt: new Date(),
    },
    {
      id: randomUUID(),
      tenantId: tenantRepository.data[0]!.id,
      userId: randomUUID(),
      userUuid: randomUUID(),
      requestId: 'req-2',
      operation: 'image_generation',
      capability: 'image',
      providerId: 'openrouter',
      model: 'gpt-image-1',
      identitySource: 'integration_api_key',
      integrationClientId: 'open-webui',
      apiKeyId: randomUUID(),
      credentialScopeUsed: 'tenant',
      status: 'blocked_by_policy',
      errorCode: 'model_access_denied',
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      reasoningTokens: null,
      imageCount: null,
      costEstimateUsd: null,
      latencyMs: 12,
      metadata: null,
      createdAt: new Date(),
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
      integrationClientRepository as never,
      apiKeyRepository as never,
      tenantModelAccessRuleRepository as never,
      providerRepository as never,
      tenantProviderConfigurationRepository as never,
      tenantPolicyRepository as never,
      usageEventRepository as never,
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
      integrationClientRepository,
      apiKeyRepository,
      tenantModelAccessRuleRepository,
      userRepository,
      userRoleRepository,
      credentialRepository,
      tenantProviderConfigurationRepository,
      tenantPolicyRepository,
      usageEventRepository,
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

test('AdminService lists tenant provider configurations across providers', async () => {
  const { actor, service } = createAdminService();

  const configurations = await service.listTenantProviderConfigurations(
    actor.activeTenantId,
  );

  assert.ok(configurations.length >= 2);
  assert.equal(configurations[0]?.providerDisplayName, 'Anthropic Claude');
  assert.equal(
    configurations.find((entry) => entry.providerId === 'nanogpt')
      ?.credentialMode,
    'hybrid',
  );
  assert.equal(
    configurations.find((entry) => entry.providerId === 'openrouter')
      ?.credentialMode,
    'hybrid',
  );
});

test('AdminService resolves implicit tenant policy defaults before a row exists', async () => {
  const { actor, service } = createAdminService();

  const policy = await service.getTenantPolicy(actor.activeTenantId);

  assert.equal(policy.tenantId, actor.activeTenantId);
  assert.equal(policy.monthlyBudgetUsd, null);
  assert.equal(policy.requestsPerMinute, 60);
  assert.equal(policy.tokensPerMinute, 100000);
  assert.equal(policy.allowPromptLogging, false);
  assert.equal(policy.retentionDays, 30);
  assert.equal(policy.createdAt, null);
});

test('AdminService upserts tenant policies with explicit limits and logging controls', async () => {
  const { actor, service } = createAdminService();

  const policy = await service.upsertTenantPolicy(actor.activeTenantId, {
    monthlyBudgetUsd: '250.00',
    dailyRequestLimit: 500,
    monthlyRequestLimit: 10000,
    requestsPerMinute: 120,
    tokensPerMinute: 200000,
    monthlyTokenLimit: 1500000,
    imageRequestsPerMonth: 250,
    maxInputTokens: 16000,
    maxOutputTokens: 8000,
    allowPromptLogging: true,
    allowResponseLogging: false,
    retentionDays: 90,
  });

  assert.equal(policy.monthlyBudgetUsd, '250.00');
  assert.equal(policy.dailyRequestLimit, 500);
  assert.equal(policy.monthlyRequestLimit, 10000);
  assert.equal(policy.requestsPerMinute, 120);
  assert.equal(policy.tokensPerMinute, 200000);
  assert.equal(policy.monthlyTokenLimit, 1500000);
  assert.equal(policy.imageRequestsPerMonth, 250);
  assert.equal(policy.maxInputTokens, 16000);
  assert.equal(policy.maxOutputTokens, 8000);
  assert.equal(policy.allowPromptLogging, true);
  assert.equal(policy.allowResponseLogging, false);
  assert.equal(policy.retentionDays, 90);
});

test('AdminService creates and lists tenant integration clients', async () => {
  const { actor, service } = createAdminService();
  const createdUser = await service.createUser(actor, {
    email: 'marie@example.com',
    password: 'Sup3rS3cret!',
    displayName: 'Marie',
  });

  const client = await service.createTenantIntegrationClient(
    actor.activeTenantId,
    {
      clientId: 'open-webui-demo',
      displayName: 'Open WebUI Demo',
      applicationId: 'open-webui',
      defaultUserUuid: createdUser.userUuid,
      scopes: ['chat:completion', 'models:list'],
      trustedForwardedIdentityEnabled: true,
    },
  );

  assert.equal(client.clientId, 'open-webui-demo');
  assert.equal(client.defaultUserUuid, createdUser.userUuid);
  assert.deepEqual(client.scopes, ['chat:completion', 'models:list']);
  assert.equal(client.apiKeyCount, 0);

  const listed = await service.listTenantIntegrationClients(actor.activeTenantId);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.clientId, 'open-webui-demo');
});

test('AdminService creates, rotates, and updates tenant integration api keys', async () => {
  const { actor, service } = createAdminService();
  const client = await service.createTenantIntegrationClient(
    actor.activeTenantId,
    {
      clientId: 'open-webui-demo',
      displayName: 'Open WebUI Demo',
      applicationId: 'open-webui',
      scopes: ['chat:completion', 'models:list'],
      trustedForwardedIdentityEnabled: false,
    },
  );

  const createdKey = await service.createTenantIntegrationApiKey(
    actor.activeTenantId,
    client.id,
    {
      label: 'Primary key',
      scopes: ['chat:completion'],
    },
  );

  assert.match(createdKey.apiKey, /^lxp_/);
  assert.equal(createdKey.summary.label, 'Primary key');
  assert.deepEqual(createdKey.summary.scopes, ['chat:completion']);

  const rotatedKey = await service.rotateTenantIntegrationApiKey(
    actor.activeTenantId,
    client.id,
    createdKey.summary.id,
  );
  assert.match(rotatedKey.apiKey, /^lxp_/);
  assert.notEqual(rotatedKey.apiKey, createdKey.apiKey);

  const updatedKey = await service.updateTenantIntegrationApiKey(
    actor.activeTenantId,
    client.id,
    createdKey.summary.id,
    {
      label: 'Rotated key',
      scopes: ['chat:completion', 'models:list'],
      status: 'disabled',
    },
  );
  assert.equal(updatedKey.label, 'Rotated key');
  assert.equal(updatedKey.status, 'disabled');
  assert.deepEqual(updatedKey.scopes, ['chat:completion', 'models:list']);
});

test('AdminService upserts tenant provider configurations with normalized credential settings', async () => {
  const { actor, service } = createAdminService();

  const configuration = await service.upsertTenantProviderConfiguration(
    actor.activeTenantId,
    'openrouter',
    {
      enabled: true,
      defaultTextModel: 'openai/gpt-4.1',
      defaultImageModel: '',
      credentialMode: 'tenant_byok',
      preferUserCredentials: true,
      allowPlatformFallback: true,
      allowTenantFallback: false,
    },
  );

  assert.equal(configuration.providerId, 'openrouter');
  assert.equal(configuration.credentialMode, 'tenant_byok');
  assert.equal(configuration.preferUserCredentials, false);
  assert.equal(configuration.allowTenantFallback, true);
  assert.equal(configuration.allowPlatformFallback, true);
  assert.equal(configuration.defaultTextModel, 'openai/gpt-4.1');
  assert.equal(configuration.defaultImageModel, null);
});

test('AdminService tests tenant provider configurations with tenant and platform fallbacks', async () => {
  const previousOpenRouterApiKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'platform-openrouter-token';

  try {
    const { actor, service } = createAdminService();
    const createdUser = await service.createUser(actor, {
      email: 'patrick@example.com',
      password: 'Sup3rS3cret!',
      displayName: 'Patrick',
    });

    await service.storeProviderCredentialForActor(actor, {
      providerId: 'openrouter',
      label: 'tenant-default',
      apiToken: 'tenant-openrouter-token',
      scope: 'tenant',
    });

    await service.upsertTenantProviderConfiguration(
      actor.activeTenantId,
      'openrouter',
      {
        enabled: true,
        credentialMode: 'user_byok',
        preferUserCredentials: false,
        allowPlatformFallback: true,
        allowTenantFallback: true,
      },
    );

    const tenantFallback = await service.testTenantProviderConfiguration(
      actor,
      actor.activeTenantId,
      'openrouter',
      {
        userUuid: createdUser.userUuid,
      },
    );
    assert.equal(tenantFallback.canResolve, true);
    assert.equal(tenantFallback.resolvedCredentialScope, 'tenant');

    await service.upsertTenantProviderConfiguration(
      actor.activeTenantId,
      'openrouter',
      {
        enabled: true,
        credentialMode: 'platform_default',
        preferUserCredentials: false,
        allowPlatformFallback: false,
        allowTenantFallback: true,
      },
    );

    const platformFallback = await service.testTenantProviderConfiguration(
      actor,
      actor.activeTenantId,
      'openrouter',
      {
        userUuid: createdUser.userUuid,
      },
    );
    assert.equal(platformFallback.canResolve, true);
    assert.equal(platformFallback.resolvedCredentialScope, 'platform');

    await service.upsertTenantProviderConfiguration(
      actor.activeTenantId,
      'openrouter',
      {
        enabled: false,
        credentialMode: 'platform_default',
        preferUserCredentials: false,
        allowPlatformFallback: false,
        allowTenantFallback: true,
      },
    );

    const disabledResult = await service.testTenantProviderConfiguration(
      actor,
      actor.activeTenantId,
      'openrouter',
      {
        userUuid: createdUser.userUuid,
      },
    );
    assert.equal(disabledResult.canResolve, false);
    assert.match(disabledResult.message, /disabled/);
  } finally {
    if (previousOpenRouterApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previousOpenRouterApiKey;
    }
  }
});

test('AdminService creates, lists, updates, and deletes tenant model access rules', async () => {
  const { actor, service } = createAdminService();

  const createdRule = await service.createTenantModelAccessRule(
    actor.activeTenantId,
    {
      providerId: 'openrouter',
      modelPattern: 'meta-llama/*',
      capability: 'text',
      effect: 'deny',
      priority: 900,
      maxInputTokens: 8000,
    },
  );

  assert.equal(createdRule.providerId, 'openrouter');
  assert.equal(createdRule.effect, 'deny');
  assert.equal(createdRule.priority, 900);

  const listedRules = await service.listTenantModelAccessRules(
    actor.activeTenantId,
  );
  assert.equal(listedRules.length, 1);
  assert.equal(listedRules[0]?.modelPattern, 'meta-llama/*');

  const updatedRule = await service.updateTenantModelAccessRule(
    actor.activeTenantId,
    createdRule.id,
    {
      effect: 'allow',
      maxResolution: '1024x1024',
    },
  );
  assert.equal(updatedRule.effect, 'allow');
  assert.equal(updatedRule.maxResolution, '1024x1024');

  const deletedResult = await service.deleteTenantModelAccessRule(
    actor.activeTenantId,
    createdRule.id,
  );
  assert.deepEqual(deletedResult, { deleted: true });

  const remainingRules = await service.listTenantModelAccessRules(
    actor.activeTenantId,
  );
  assert.equal(remainingRules.length, 0);
});

test('AdminService summarizes tenant usage for the active tenant', async () => {
  const { actor, service } = createAdminService();

  const summary = await service.getTenantUsageSummary(
    actor,
    actor.activeTenantId,
  );

  assert.equal(summary.tenantId, actor.activeTenantId);
  assert.equal(summary.requests24h, 2);
  assert.equal(summary.requests7d, 2);
  assert.equal(summary.requests30d, 2);
  assert.equal(summary.distinctUsers24h, 2);
  assert.equal(summary.activeUsers30d, 2);
  assert.equal(summary.blockedRequests7d, 1);
  assert.equal(summary.estimatedCostUsd30d, '0.125000');
});

test('AdminService groups tenant usage by provider', async () => {
  const { actor, service } = createAdminService();

  const usageByProvider = await service.getTenantUsageByProvider(
    actor,
    actor.activeTenantId,
  );

  assert.equal(usageByProvider.length, 2);
  assert.equal(usageByProvider[0]?.providerId, 'nanogpt');
  assert.equal(usageByProvider[0]?.requests30d, 1);
  assert.equal(usageByProvider[0]?.estimatedCostUsd30d, '0.125000');
  assert.equal(usageByProvider[1]?.providerId, 'openrouter');
  assert.equal(usageByProvider[1]?.blockedRequests30d, 1);
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

test('AdminService rejects Mistral credentials without an API token', async () => {
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
        providerId: 'mistral' as ProviderId,
        label: 'mistral-without-token',
        baseUrl: 'https://api.mistral.ai/v1',
      }),
    /Mistral credentials require an API token/,
  );
});

test('AdminService rejects DeepSeek credentials without an API token', async () => {
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
        providerId: 'deepseek' as ProviderId,
        label: 'deepseek-without-token',
        baseUrl: 'https://api.deepseek.com',
      }),
    /DeepSeek credentials require an API token/,
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
    /A credential already exists for this provider\/label/,
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
    /A credential already exists for this provider\/label/,
  );
});

test('AdminService rejects invalid JSON from the gateway control-plane proxy', async () => {
  const previousGatewayUrl = process.env.GATEWAY_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.GATEWAY_API_URL = 'http://gateway.example.test';
  globalThis.fetch = (async () =>
    new Response('not-json', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })) as typeof fetch;

  try {
    const { service } = createAdminService();

    await assert.rejects(
      () => service.listOwnModels('access-token'),
      /did not contain valid JSON/i,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousGatewayUrl === undefined) {
      delete process.env.GATEWAY_API_URL;
    } else {
      process.env.GATEWAY_API_URL = previousGatewayUrl;
    }
  }
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
