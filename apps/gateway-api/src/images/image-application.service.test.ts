import { ForbiddenException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type {
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
} from '@lxp/contracts';
import type { LlmProviderAdapter, ProviderExecutionContext } from '@lxp/provider-sdk';

import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { ImageJobEntity } from '../persistence/entities/image-job.entity';
import { ImageJobResultEntity } from '../persistence/entities/image-job-result.entity';
import { ImageApplicationService } from './image-application.service';
import { TenantPolicyLimitException } from '../gateway/tenant-policy.service';

interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

function extractComparable(
  value: unknown,
): number | string | Date | null | undefined {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    value instanceof Date
  ) {
    return value;
  }

  return String(value);
}

class InMemoryRepository<T extends BaseEntity> {
  constructor(private readonly items: T[] = []) {}

  async find(options?: { where?: Record<string, unknown>[] | Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'>; skip?: number; take?: number }) {
    let results = [...this.items];
    if (options?.where) {
      const whereArray = Array.isArray(options.where) ? options.where : [options.where];
      results = results.filter((item) =>
        whereArray.some((where) =>
          Object.entries(where).every(([key, value]) => item[key] === value),
        ),
      );
    }
    if (options?.order) {
      const [orderKey, direction] = Object.entries(options.order)[0] ?? [];
      if (orderKey) {
        results.sort((left, right) =>
          compareValues(
            extractComparable(left[orderKey]),
            extractComparable(right[orderKey]),
            direction,
          ),
        );
      }
    }
    if (typeof options?.skip === 'number' || typeof options?.take === 'number') {
      results = results.slice(options.skip ?? 0, (options.skip ?? 0) + (options.take ?? results.length));
    }
    return results;
  }

  async findOne(options: { where: Record<string, unknown> }) {
    return (
      this.items.find((item) =>
        Object.entries(options.where).every(([key, value]) => item[key] === value),
      ) ?? null
    );
  }

  async findAndCount(options: { where: Record<string, unknown>; order: Record<string, 'ASC' | 'DESC'>; skip: number; take: number }) {
    const results = await this.find(options);
    const total = (
      await this.find({
        where: options.where,
      })
    ).length;
    return [results, total] as const;
  }

  async save(input: Partial<T>) {
    const item = {
      id: input.id ?? crypto.randomUUID(),
      createdAt: input.createdAt ?? new Date(),
      updatedAt: input.updatedAt ?? new Date(),
      ...input,
    } as unknown as T;
    const existingIndex = this.items.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
    return item;
  }

  async delete(criteria: Record<string, unknown>) {
    const index = this.items.findIndex((item) =>
      Object.entries(criteria).every(([key, value]) => item[key] === value),
    );
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
}

function compareValues(
  left: number | string | Date | null | undefined,
  right: number | string | Date | null | undefined,
  direction: 'ASC' | 'DESC',
) {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return direction === 'ASC' ? -1 : 1;
  }

  if (right === null || right === undefined) {
    return direction === 'ASC' ? 1 : -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return direction === 'ASC'
      ? left.getTime() - right.getTime()
      : right.getTime() - left.getTime();
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return direction === 'ASC' ? left - right : right - left;
  }

  const leftText = left instanceof Date ? left.toISOString() : String(left);
  const rightText = right instanceof Date ? right.toISOString() : String(right);
  return direction === 'ASC'
    ? leftText.localeCompare(rightText)
    : rightText.localeCompare(leftText);
}

class FakeImageProvider implements LlmProviderAdapter {
  readonly providerId = 'xai' as const;
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
  } as const;
  public lastEditImages: GatewayImageEditRequest['images'] = [];

  supportsStreaming(): boolean {
    return true;
  }

  async listImageCatalog() {
    return {
      providerId: this.providerId,
      defaultModelId: 'grok-imagine-image',
      models: [
        {
          id: 'grok-imagine-image',
          displayName: 'Grok Imagine Image',
            capabilities: {
              supportsImageGeneration: true,
              supportsImageEditing: true,
              supportedImageResponseFormats: ['url', 'b64_json'] as Array<
                'url' | 'b64_json'
              >,
              imageDefaults: {
                responseFormat: 'url' as const,
                imageCount: 1,
              },
            },
        },
      ],
    };
  }

  async chat() {
    return {
      requestId: 'request-chat-1',
      providerId: this.providerId,
      model: 'unused',
      message: {
        role: 'assistant' as const,
        content: 'unused',
      },
    };
  }

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ) {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'grok-imagine-image',
      images: [
        {
          b64Json: 'generated-base64',
          mimeType: 'image/png',
        },
      ],
    };
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ) {
    this.lastEditImages = request.images;
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'grok-imagine-image',
      images: [
        {
          b64Json: 'edited-base64',
          mimeType: 'image/png',
        },
      ],
    };
  }
}

function hashBase64Payload(dataBase64: string) {
  return createHash('sha256')
    .update(Buffer.from(dataBase64, 'base64'))
    .digest('hex');
}

function buildAuthContext() {
  return {
    userId: 'user-1',
    userUuid: 'user-public-1',
    emailHash: 'hash-1',
    activeTenantId: 'tenant-1',
    activeTenantSlug: 'lxp-internal',
    identitySource: 'access-token' as const,
    roles: ['user'],
    globalRoles: [],
    integrationClientId: undefined,
    integrationClientKeyId: undefined,
    integrationClientScopes: undefined,
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
}

class FakeGatewayTelemetryService {
  async reserveImageUsageEvent(): Promise<void> {}

  async recordImageSuccess(): Promise<void> {}

  async recordImageFailure(): Promise<void> {}

  async recordBlockedByQuota(): Promise<void> {}
}

class FakeIntegrationClientScopeService {
  assertScope(
    authContext: ReturnType<typeof buildAuthContext>,
    requiredScope: string,
  ): void {
    if (!authContext.integrationClientId) {
      return;
    }

    const grantedScopes = authContext.integrationClientScopes ?? [];
    if (grantedScopes.includes(requiredScope)) {
      return;
    }

    throw new ForbiddenException(
      `Integration client "${authContext.integrationClientId}" is missing the required scope "${requiredScope}".`,
    );
  }
}

class FakeTenantModelAccessRuleService {
  async filterImageCatalogProvider(
    tenantId: string,
    provider: {
      providerId: string;
      displayName: string;
      defaultModelId: string | null;
      models: Array<{
        id: string;
        displayName: string;
        capabilities: unknown;
      }>;
    },
  ) {
    if (tenantId !== 'tenant-restricted') {
      return provider;
    }

    const models = provider.models.filter(
      (model) => model.id !== 'grok-imagine-image',
    );
    return models.length
      ? {
          ...provider,
          defaultModelId: models[0]?.id ?? null,
          models,
        }
      : null;
  }

  async assertImageModelAllowed(params: {
    tenantId: string;
    providerId: string;
    model: string;
    imageCount?: number;
    resolution?: string;
  }): Promise<void> {
    if (
      params.tenantId === 'tenant-restricted' &&
      params.providerId === 'xai' &&
      params.model === 'grok-imagine-image'
    ) {
      throw new ForbiddenException(
        `Model ${params.providerId}/${params.model} is denied for tenant ${params.tenantId}.`,
      );
    }

    if ((params.imageCount ?? 1) > 2) {
      throw new Error('too many images');
    }

    if (params.resolution === '2048x2048') {
      throw new Error('resolution too large');
    }
  }
}

class FakeTenantProviderConfigurationService {
  async resolveConfiguration(tenantId: string, providerId: 'xai') {
    return {
      tenantId,
      providerId,
      providerDisplayName: 'xAI Grok',
      providerStatus: 'active' as const,
      enabled: tenantId !== 'tenant-disabled',
      defaultTextModel: null,
      defaultImageModel: 'tenant-image-default',
      credentialMode: 'hybrid' as const,
      preferUserCredentials: true,
      allowPlatformFallback: false,
      allowTenantFallback: true,
    };
  }

  async assertProviderEnabled(tenantId: string, providerId: 'xai') {
    const configuration = await this.resolveConfiguration(tenantId, providerId);
    if (!configuration.enabled) {
      throw new Error(`Provider ${providerId} is disabled for tenant ${tenantId}.`);
    }

    return configuration;
  }

  resolveImageModel(
    requestedModel: string | undefined,
    providerId: 'xai',
    authContext: ReturnType<typeof buildAuthContext>,
    configuration: { defaultImageModel: string | null },
  ) {
    if (requestedModel) {
      return requestedModel;
    }

    if (
      authContext.defaultImageProviderId === providerId &&
      authContext.defaultImageModel
    ) {
      return authContext.defaultImageModel;
    }

    if (configuration.defaultImageModel) {
      return configuration.defaultImageModel;
    }

    throw new Error('No default image model is configured.');
  }
}

class FakeTenantPolicyService {
  async assertImageRequestAllowed(params: {
    tenantId: string;
    providerId: string;
    model: string;
  }): Promise<void> {
    if (
      params.tenantId === 'tenant-quota-blocked' &&
      params.providerId === 'xai'
    ) {
      throw new TenantPolicyLimitException(
        'tenant_monthly_image_request_limit_exceeded',
        `Tenant ${params.tenantId} exceeded the monthly image request limit.`,
      );
    }
  }
}

function createTenantRlsService(
  repositories: {
    imageAssets: InMemoryRepository<ImageAssetEntity>;
    imageJobs: InMemoryRepository<ImageJobEntity>;
    imageJobResults: InMemoryRepository<ImageJobResultEntity>;
  },
) {
  return {
    async withTenantLockContext<T>(
      tenantId: string,
      callback: (manager: {
        getRepository: (entity: unknown) => InMemoryRepository<BaseEntity>;
      }) => Promise<T>,
    ): Promise<T> {
      return this.withTenantContext(tenantId, callback);
    },

    async withTenantContext<T>(
      tenantId: string,
      callback: (manager: {
        getRepository: (entity: unknown) => InMemoryRepository<BaseEntity>;
      }) => Promise<T>,
    ): Promise<T> {
      const createTenantScopedRepository = <E extends BaseEntity>(
        baseRepository: InMemoryRepository<E>,
      ): InMemoryRepository<E> => {
        return {
          async find(options) {
            const tenantWhere = { tenantId };
            const where = options?.where
              ? Array.isArray(options.where)
                ? options.where.map((w) => ({ ...w, ...tenantWhere }))
                : { ...options.where, ...tenantWhere }
              : tenantWhere;
            return baseRepository.find({ ...options, where });
          },
          async findOne(options) {
            return baseRepository.findOne({
              where: { ...options.where, tenantId },
            });
          },
          async findAndCount(options) {
            const tenantWhere = { tenantId };
            const where = options?.where
              ? Array.isArray(options.where)
                ? options.where.map((w) => ({ ...w, ...tenantWhere }))
                : { ...options.where, ...tenantWhere }
              : tenantWhere;
            return baseRepository.findAndCount({
              ...options,
              where,
            });
          },
          async save(input) {
            return baseRepository.save({ ...input, tenantId });
          },
          async delete(criteria) {
            return baseRepository.delete({ ...criteria, tenantId });
          },
        } as InMemoryRepository<E>;
      };

      return callback({
        getRepository: (entity) => {
          if (entity === ImageAssetEntity) {
            return createTenantScopedRepository(repositories.imageAssets);
          }

          if (entity === ImageJobEntity) {
            return createTenantScopedRepository(repositories.imageJobs);
          }

          if (entity === ImageJobResultEntity) {
            return createTenantScopedRepository(repositories.imageJobResults);
          }

          throw new Error(`Unsupported repository request: ${String(entity)}`);
        },
      });
    },
  };
}

function createImageService(options?: {
  users?: Array<Partial<BaseEntity>>;
  providers?: Array<Partial<BaseEntity>>;
  memberships?: Array<Partial<BaseEntity>>;
  assets?: Array<Partial<ImageAssetEntity>>;
  jobs?: Array<Partial<ImageJobEntity>>;
  results?: Array<Partial<ImageJobResultEntity>>;
  providerRegistry?: {
    getProvider: () => LlmProviderAdapter;
    listProviders: () => LlmProviderAdapter[];
  };
  providerCredentialService?: {
    resolveProviderAccess: () => Promise<Record<string, unknown>>;
    resolveProviderAccessWithSource?: () => Promise<{
      providerAccess: Record<string, unknown>;
      credentialScopeUsed: 'platform' | 'tenant' | 'user';
    }>;
  };
  tenantPolicyService?: {
    assertImageRequestAllowed: (params: {
      tenantId: string;
      providerId: string;
      model: string;
    }) => Promise<void>;
  };
}) {
  const provider = new FakeImageProvider();
  const imageAssets = new InMemoryRepository<ImageAssetEntity>(options?.assets ?? []);
  const imageJobs = new InMemoryRepository<ImageJobEntity>(options?.jobs ?? []);
  const imageJobResults = new InMemoryRepository<ImageJobResultEntity>(options?.results ?? []);
  const providerRegistry = options?.providerRegistry ?? {
    getProvider: () => provider,
    listProviders: () => [provider],
  };

  return {
    provider,
    imageAssets,
    imageJobs,
    imageJobResults,
    service: new ImageApplicationService(
      new InMemoryRepository(
        options?.users ?? [{ id: 'user-1', emailHash: 'hash-1', status: 'active' }],
      ) as never,
      new InMemoryRepository(
        options?.providers ?? [
          {
            id: 'provider-1',
            providerId: 'xai',
            displayName: 'xAI Grok',
            status: 'active',
          },
        ],
      ) as never,
      new InMemoryRepository(
        options?.memberships ?? [{ id: 'membership-1', tenantId: 'tenant-1', userId: 'user-1' }],
      ) as never,
      providerRegistry as never,
      (options?.providerCredentialService ?? {
        resolveProviderAccess: async () => ({ apiKey: 'secret' }),
        resolveProviderAccessWithSource: async () => ({
          providerAccess: { apiKey: 'secret' },
          credentialScopeUsed: 'user',
        }),
      }) as never,
      new FakeTenantProviderConfigurationService() as never,
      new FakeIntegrationClientScopeService() as never,
      new FakeTenantModelAccessRuleService() as never,
      (options?.tenantPolicyService ?? new FakeTenantPolicyService()) as never,
      new FakeGatewayTelemetryService() as never,
      createTenantRlsService({
        imageAssets,
        imageJobs,
        imageJobResults,
      }) as never,
    ),
  };
}

test('ImageApplicationService persists generated images and exposes gateway-managed asset URLs', async () => {
  const { service } = createImageService();

  const response = await service.generateImage(
    {
      providerId: 'xai',
      model: 'grok-imagine-image',
      prompt: 'A moonlit forest',
    },
    buildAuthContext(),
  );

  assert.ok(response.jobId);
  assert.equal(response.images[0]?.assetId !== undefined, true);
  assert.match(response.images[0]?.contentUrl ?? '', /\/api\/v1\/images\/assets\//);
});

test('ImageApplicationService uses the tenant default image model when the user has no image default', async () => {
  const { service } = createImageService();

  const response = await service.generateImage(
    {
      providerId: 'xai',
      prompt: 'A moonlit forest',
    },
    buildAuthContext(),
  );

  assert.equal(response.model, 'tenant-image-default');
});

test('ImageApplicationService resolves asset references before provider edit requests', async () => {
  const provider = new FakeImageProvider();
  const { service } = createImageService({
    assets: [
      {
        id: 'asset-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        sourceType: 'upload',
        label: 'Upload',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,abc123',
        contentHash: 'hash-upload-asset-1',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    providerRegistry: {
      getProvider: () => provider,
      listProviders: () => [provider],
    },
  });

  await service.editImage(
    {
      providerId: 'xai',
      model: 'grok-imagine-image',
      prompt: 'Edit this',
      images: [{ type: 'asset', assetId: 'asset-1' }],
    },
    buildAuthContext(),
  );

  assert.deepEqual(provider.lastEditImages, [
    {
      type: 'data_url',
      url: 'data:image/png;base64,abc123',
      mimeType: 'image/png',
    },
  ]);
});

test('ImageApplicationService paginates history by 10 items per page', async () => {
  const now = new Date();
  const jobs = Array.from({ length: 12 }, (_, index) => ({
    id: `job-${index + 1}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    requestId: `request-${index + 1}`,
    providerId: 'xai',
    model: 'grok-imagine-image',
    prompt: `Prompt ${index + 1}`,
    mode: 'generation',
    startedAt: new Date(now.getTime() + index * 1000),
    completedAt: new Date(now.getTime() + index * 1000 + 8000),
    providerMetadata: { upstreamRequestId: `upstream-${index + 1}` },
    createdAt: new Date(now.getTime() + index * 1000),
  }));
  const assets = Array.from({ length: 12 }, (_, index) => ({
    id: `asset-${index + 1}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    sourceType: 'generated',
    label: `Asset ${index + 1}`,
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,abc123',
    contentHash: `hash-asset-${index + 1}`,
    originalUrl: null,
    isSaved: false,
    createdAt: now,
    updatedAt: now,
  }));
  const results = Array.from({ length: 12 }, (_, index) => ({
    id: `result-${index + 1}`,
    tenantId: 'tenant-1',
    jobId: `job-${index + 1}`,
    assetId: `asset-${index + 1}`,
    resultIndex: 0,
    revisedPrompt: null,
    providerMetadata: { finishReason: 'stop', index },
    createdAt: now,
  }));
  const { service } = createImageService({
    assets,
    jobs,
    results,
  });

  const page1 = await service.listHistory(1, buildAuthContext());
  const page2 = await service.listHistory(2, buildAuthContext());

  assert.equal(page1.items.length, 10);
  assert.equal(page1.pageSize, 10);
  assert.equal(page1.totalPages, 2);
  assert.equal(page2.items.length, 2);
  assert.equal(page1.items[0]?.durationMs, 8000);
  assert.deepEqual(page1.items[0]?.providerMetadata, {
    upstreamRequestId: 'upstream-12',
  });
  assert.deepEqual(page1.items[0]?.images[0]?.providerMetadata, {
    finishReason: 'stop',
    index: 11,
  });
});

test('ImageApplicationService returns image catalog entries even when provider credentials are not yet configured', async () => {
  const provider = new FakeImageProvider();
  const { service } = createImageService({
    providerRegistry: {
      getProvider: () => provider,
      listProviders: () => [provider],
    },
    providerCredentialService: {
      resolveProviderAccess: async () => {
        throw new Error('missing credential');
      },
      resolveProviderAccessWithSource: async () => {
        throw new Error('missing credential');
      },
    },
  });

  const catalog = await service.getCatalog(buildAuthContext());

  assert.deepEqual(catalog.providers, [
    {
      providerId: 'xai',
      displayName: 'xAI Grok',
      defaultModelId: 'tenant-image-default',
      models: [
        {
          id: 'grok-imagine-image',
          displayName: 'Grok Imagine Image',
          capabilities: {
            supportsImageGeneration: true,
            supportsImageEditing: true,
            supportedImageResponseFormats: ['url', 'b64_json'],
            imageDefaults: {
              responseFormat: 'url',
              imageCount: 1,
            },
          },
        },
      ],
    },
  ]);
});

test('ImageApplicationService filters image catalog models denied for the active tenant', async () => {
  const provider = new FakeImageProvider();
  const { service } = createImageService({
    providerRegistry: {
      getProvider: () => provider,
      listProviders: () => [provider],
    },
  });

  const catalog = await service.getCatalog({
    ...buildAuthContext(),
    activeTenantId: 'tenant-restricted',
  });

  assert.equal(catalog.providers.length, 0);
});

test('ImageApplicationService uploads a supported image asset', async () => {
  const { service } = createImageService();

  const response = await service.uploadAsset(
    {
      dataUrl: 'data:image/png;base64,abc123',
      label: 'upload.png',
    },
    buildAuthContext(),
  );

  assert.equal(response.asset.label, 'upload.png');
  assert.equal(response.asset.mimeType, 'image/png');
  assert.equal(response.asset.sourceType, 'upload');
});

test('ImageApplicationService reuses an existing uploaded asset when the content matches exactly', async () => {
  const { service, imageAssets: assetRepository } = createImageService({
    assets: [
    {
      id: 'asset-upload-existing',
      tenantId: 'tenant-1',
      userId: 'user-1',
      sourceType: 'upload',
      label: 'existing.png',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,abc123',
      contentHash: hashBase64Payload('abc123'),
      originalUrl: null,
      isSaved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  });

  const response = await service.uploadAsset(
    {
      dataUrl: 'data:image/png;base64,abc123',
      label: 'duplicate-name.png',
    },
    buildAuthContext(),
  );

  assert.equal(response.asset.id, 'asset-upload-existing');
  assert.equal((await assetRepository.find()).length, 1);
});

test('ImageApplicationService renames uploaded reference assets', async () => {
  const { service } = createImageService({
    assets: [
    {
      id: 'asset-upload-rename',
      tenantId: 'tenant-1',
      userId: 'user-1',
      sourceType: 'upload',
      label: 'before.png',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,abc123',
      contentHash: 'hash-upload-rename',
      originalUrl: null,
      isSaved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  });

  const response = await service.updateAsset(
    'asset-upload-rename',
    { label: 'After rename' },
    buildAuthContext(),
  );

  assert.equal(response.asset.label, 'After rename');
});

test('ImageApplicationService lists uploaded reference assets in reverse chronological order', async () => {
  const { service } = createImageService({
    assets: [
      {
        id: 'asset-generated-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        sourceType: 'generated',
        label: 'Generated',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,generated',
        contentHash: 'hash-generated-1',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
        updatedAt: new Date('2026-04-21T10:00:00.000Z'),
      },
      {
        id: 'asset-upload-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        sourceType: 'upload',
        label: 'Older upload',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,older',
        contentHash: 'hash-upload-1',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date('2026-04-21T11:00:00.000Z'),
        updatedAt: new Date('2026-04-21T11:00:00.000Z'),
      },
      {
        id: 'asset-upload-2',
        tenantId: 'tenant-1',
        userId: 'user-1',
        sourceType: 'upload',
        label: 'Newest upload',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,newest',
        contentHash: 'hash-upload-2',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date('2026-04-21T12:00:00.000Z'),
        updatedAt: new Date('2026-04-21T12:00:00.000Z'),
      },
    ],
  });

  const response = await service.listAssets(buildAuthContext());

  assert.deepEqual(
    response.items.map((asset: { id: string }) => asset.id),
    ['asset-upload-2', 'asset-upload-1'],
  );
});

test('ImageApplicationService deletes uploaded reference assets', async () => {
  const { service, imageAssets: assetRepository } = createImageService({
    assets: [
    {
      id: 'asset-upload-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      sourceType: 'upload',
      label: 'Upload',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,abc123',
      contentHash: 'hash-upload-1',
      originalUrl: null,
      isSaved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  });

  const response = await service.deleteAsset('asset-upload-1', buildAuthContext());

  assert.deepEqual(response, { deleted: true });
  assert.equal(
    await assetRepository.findOne({
      where: { id: 'asset-upload-1', userId: 'user-1' },
    }),
    null,
  );
});

test('ImageApplicationService keeps tenant 2 assets isolated from tenant 1', async () => {
  const { service } = createImageService({
    assets: [
      {
        id: 'asset-tenant-2',
        tenantId: 'tenant-2',
        userId: 'user-2',
        sourceType: 'upload',
        label: 'Tenant 2 asset',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,tenant2',
        contentHash: 'hash-tenant-2',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date('2026-04-21T13:00:00.000Z'),
        updatedAt: new Date('2026-04-21T13:00:00.000Z'),
      },
    ],
    jobs: [
      {
        id: 'job-tenant-2',
        tenantId: 'tenant-2',
        userId: 'user-2',
        requestId: 'request-tenant-2',
        providerId: 'xai',
        model: 'grok-imagine-image',
        prompt: 'Tenant 2 prompt',
        mode: 'generation',
        startedAt: new Date('2026-04-21T13:00:00.000Z'),
        completedAt: new Date('2026-04-21T13:00:08.000Z'),
        providerMetadata: { upstreamRequestId: 'upstream-tenant-2' },
        createdAt: new Date('2026-04-21T13:00:00.000Z'),
      },
    ],
    results: [
      {
        id: 'result-tenant-2',
        tenantId: 'tenant-2',
        jobId: 'job-tenant-2',
        assetId: 'asset-tenant-2',
        resultIndex: 0,
        revisedPrompt: null,
        providerMetadata: { finishReason: 'stop' },
        createdAt: new Date('2026-04-21T13:00:08.000Z'),
      },
    ],
  });

  const response = await service.listAssets(buildAuthContext());

  assert.equal(
    response.items.some((asset) => asset.id === 'asset-tenant-2'),
    false,
  );

  await assert.rejects(
    () => service.deleteAsset('asset-tenant-2', buildAuthContext()),
    /Image asset not found\./,
  );
});

test('ImageApplicationService rejects image models denied by tenant model access rules', async () => {
  const { service } = createImageService({
    memberships: [
      { id: 'membership-1', tenantId: 'tenant-restricted', userId: 'user-1' },
    ],
  });

  await assert.rejects(
    () =>
      service.generateImage(
        {
          providerId: 'xai',
          model: 'grok-imagine-image',
          prompt: 'A moonlit forest',
        },
        {
          ...buildAuthContext(),
          activeTenantId: 'tenant-restricted',
        },
      ),
    /is denied for tenant tenant-restricted/i,
  );
});

test('ImageApplicationService rejects image generation for an integration client without image:generate scope', async () => {
  const { service } = createImageService();

  await assert.rejects(
    () =>
      service.generateImage(
        {
          providerId: 'xai',
          prompt: 'A moonlit forest',
        },
        {
          ...buildAuthContext(),
          integrationClientId: 'open-webui-demo',
          integrationClientScopes: ['chat:completion'],
        },
      ),
    /missing the required scope "image:generate"/i,
  );
});

test('ImageApplicationService rejects image editing for an integration client without image:edit scope', async () => {
  const { service } = createImageService({
    assets: [
      {
        id: 'asset-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        sourceType: 'upload',
        label: 'Upload',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,abc123',
        contentHash: 'hash-upload-asset-1',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  await assert.rejects(
    () =>
      service.editImage(
        {
          providerId: 'xai',
          prompt: 'Edit this',
          images: [{ type: 'asset', assetId: 'asset-1' }],
        },
        {
          ...buildAuthContext(),
          integrationClientId: 'open-webui-demo',
          integrationClientScopes: ['chat:completion', 'image:generate'],
        },
      ),
    /missing the required scope "image:edit"/i,
  );
});

test('ImageApplicationService rejects image generation when tenant quota policy blocks the request', async () => {
  const { service } = createImageService({
    memberships: [
      { id: 'membership-1', tenantId: 'tenant-quota-blocked', userId: 'user-1' },
    ],
  });

  await assert.rejects(
    () =>
      service.generateImage(
        {
          providerId: 'xai',
          prompt: 'A moonlit forest',
        },
        {
          ...buildAuthContext(),
          activeTenantId: 'tenant-quota-blocked',
        },
      ),
    /monthly image request limit/i,
  );
});
