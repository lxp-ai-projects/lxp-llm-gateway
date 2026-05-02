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

class InMemoryRepository<T extends Record<string, any>> {
  constructor(private readonly items: T[] = []) {}

  async find(options?: { where?: Record<string, any>[] | Record<string, any>; order?: Record<string, 'ASC' | 'DESC'>; skip?: number; take?: number }) {
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
          direction === 'ASC'
            ? (left[orderKey] > right[orderKey] ? 1 : -1)
            : (left[orderKey] < right[orderKey] ? 1 : -1),
        );
      }
    }
    if (typeof options?.skip === 'number' || typeof options?.take === 'number') {
      results = results.slice(options.skip ?? 0, (options.skip ?? 0) + (options.take ?? results.length));
    }
    return results;
  }

  async findOne(options: { where: Record<string, any> }) {
    return (
      this.items.find((item) =>
        Object.entries(options.where).every(([key, value]) => item[key] === value),
      ) ?? null
    );
  }

  async findAndCount(options: { where: Record<string, any>; order: Record<string, 'ASC' | 'DESC'>; skip: number; take: number }) {
    const results = await this.find(options);
    const total = (
      await this.find({ where: options.where })
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

  async delete(criteria: Record<string, any>) {
    const index = this.items.findIndex((item) =>
      Object.entries(criteria).every(([key, value]) => item[key] === value),
    );
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
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
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
}

class FakeGatewayTelemetryService {
  async recordImageSuccess(): Promise<void> {}

  async recordImageFailure(): Promise<void> {}
}

function createTenantRlsService(
  repositories: {
    imageAssets: InMemoryRepository<Record<string, any>>;
    imageJobs: InMemoryRepository<Record<string, any>>;
    imageJobResults: InMemoryRepository<Record<string, any>>;
  },
) {
  return {
    async withTenantContext<T>(
      _tenantId: string,
      callback: (manager: {
        getRepository: (entity: unknown) => InMemoryRepository<Record<string, any>>;
      }) => Promise<T>,
    ): Promise<T> {
      return callback({
        getRepository: (entity) => {
          if (entity === ImageAssetEntity) {
            return repositories.imageAssets;
          }

          if (entity === ImageJobEntity) {
            return repositories.imageJobs;
          }

          if (entity === ImageJobResultEntity) {
            return repositories.imageJobResults;
          }

          throw new Error(`Unsupported repository request: ${String(entity)}`);
        },
      });
    },
  };
}

function createImageService(options?: {
  users?: Array<Record<string, any>>;
  providers?: Array<Record<string, any>>;
  memberships?: Array<Record<string, any>>;
  assets?: Array<Record<string, any>>;
  jobs?: Array<Record<string, any>>;
  results?: Array<Record<string, any>>;
  providerRegistry?: {
    getProvider: () => LlmProviderAdapter;
    listProviders: () => LlmProviderAdapter[];
  };
  providerCredentialService?: {
    resolveProviderAccess: () => Promise<Record<string, unknown>>;
  };
}) {
  const provider = new FakeImageProvider();
  const imageAssets = new InMemoryRepository(options?.assets ?? []);
  const imageJobs = new InMemoryRepository(options?.jobs ?? []);
  const imageJobResults = new InMemoryRepository(options?.results ?? []);
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
      }) as never,
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
    },
  });

  const catalog = await service.getCatalog(buildAuthContext());

  assert.deepEqual(catalog.providers, [
    {
      providerId: 'xai',
      displayName: 'xAI Grok',
      defaultModelId: 'grok-imagine-image',
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
