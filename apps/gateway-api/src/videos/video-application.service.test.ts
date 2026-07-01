import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';

import type { GatewayVideoGenerationRequest } from '@lxp/contracts';
import { attachKlingVideoFamilyToModel } from '@lxp/model-family-capabilities';
import type { LlmProviderAdapter, ProviderExecutionContext } from '@lxp/provider-sdk';

import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { MediaAssetEntity } from '../persistence/entities/media-asset.entity';
import { MediaGenerationJobEntity } from '../persistence/entities/media-generation-job.entity';
import { TenantPolicyLimitException } from '../gateway/tenant-policy.service';
import { VideoApplicationService } from './video-application.service';

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

  async find(options?: {
    where?: Record<string, unknown>[] | Record<string, unknown>;
    order?: Record<string, 'ASC' | 'DESC'>;
    skip?: number;
    take?: number;
  }) {
    let results = [...this.items];
    if (options?.where) {
      const whereArray = Array.isArray(options.where)
        ? options.where
        : [options.where];
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
    if (
      typeof options?.skip === 'number' ||
      typeof options?.take === 'number'
    ) {
      results = results.slice(
        options.skip ?? 0,
        (options.skip ?? 0) + (options.take ?? results.length),
      );
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

  async findOneByOrFail(where: Record<string, unknown>) {
    const item = await this.findOne({ where });
    if (!item) {
      throw new Error(`Entity not found for ${JSON.stringify(where)}`);
    }

    return item;
  }

  async findAndCount(options: {
    where: Record<string, unknown>;
    order: Record<string, 'ASC' | 'DESC'>;
    skip: number;
    take: number;
  }) {
    const results = await this.find(options);
    const total = (await this.find({ where: options.where })).length;
    return [results, total] as const;
  }

  async save(input: Partial<T>) {
    const item = {
      id: input.id ?? crypto.randomUUID(),
      createdAt: input.createdAt ?? new Date(),
      updatedAt: input.updatedAt ?? new Date(),
      ...input,
    } as T;
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

class FakeVideoProvider implements LlmProviderAdapter {
  readonly providerId = 'openrouter' as const;
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    videoGeneration: true,
  } as const;

  public submitCalls = 0;
  public pollCalls = 0;
  public downloadCalls = 0;
  public cancelCalls = 0;

  public submittedRequests: GatewayVideoGenerationRequest[] = [];
  public lastSubmissionContext: ProviderExecutionContext | null = null;
  public nextSubmitResponse = {
    id: 'provider-job-1',
    requestId: 'request-video-1',
    providerId: 'openrouter' as const,
    model: 'openrouter/kling-v1',
    prompt: 'Animate this still frame',
    status: 'queued' as const,
    createdAt: '2026-05-07T12:00:00.000Z',
    outputs: [],
    providerMetadata: {
      upstreamRequestId: 'upstream-submit-1',
    },
  };
  public nextPollResponses = [
    {
      id: 'provider-job-1',
      requestId: 'request-video-1',
      providerId: 'openrouter' as const,
      model: 'openrouter/kling-v1',
      prompt: 'Animate this still frame',
      status: 'succeeded' as const,
      createdAt: '2026-05-07T12:00:00.000Z',
      completedAt: '2026-05-07T12:00:08.000Z',
      outputs: [
        {
          contentUrl: 'https://provider.example/video-1.mp4',
          mimeType: 'video/mp4',
          width: 1280,
          height: 720,
          durationSeconds: 5,
          byteSize: 1024,
          providerMetadata: {
            seed: 1234,
          },
        },
      ],
      providerMetadata: {
        upstreamRequestId: 'upstream-poll-1',
      },
    },
  ];

  supportsStreaming(): boolean {
    return true;
  }

  async chat() {
    return {
      requestId: 'unused-chat-request',
      providerId: this.providerId,
      model: 'unused-model',
      message: {
        role: 'assistant' as const,
        content: 'unused',
      },
    };
  }

  async listVideoCatalog() {
    return {
      providerId: this.providerId,
      defaultModelId: 'openrouter/kling-v1',
      models: [
        attachKlingVideoFamilyToModel(
          {
            id: 'openrouter/kling-v1',
            displayName: 'Kling v1',
            capabilities: {
              supportsVideoGeneration: true,
              supportsVideoReferenceImages: true,
            },
          },
          {
            durations: [5, 10],
            aspectRatios: ['16:9', '9:16'],
            resolutions: ['720p'],
            frameTypes: ['first_frame', 'last_frame'],
            generateAudio: true,
            allowedPassthroughParameters: ['seed'],
          },
        ),
      ],
    };
  }

  async submitVideoGeneration(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ) {
    this.submitCalls += 1;
    this.submittedRequests.push(request);
    this.lastSubmissionContext = context;
    return {
      ...this.nextSubmitResponse,
      requestId: context.requestId,
      model: request.model ?? this.nextSubmitResponse.model,
      prompt: request.prompt,
    };
  }

  async getVideoGenerationJob() {
    this.pollCalls += 1;
    return this.nextPollResponses[
      Math.min(this.pollCalls - 1, this.nextPollResponses.length - 1)
    ]!;
  }

  downloadVideoOutput = async () => {
    this.downloadCalls += 1;
    const payload = new TextEncoder().encode('video-bytes');
    return Readable.toWeb(Readable.from([payload])) as ReadableStream<Uint8Array>;
  };

  cancelVideoGeneration = async () => {
    this.cancelCalls += 1;
  };
}

function buildAuthContext() {
  return {
    userId: 'user-public-1',
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
  async reserveVideoUsageEvent(): Promise<void> {}

  async recordVideoSuccess(): Promise<void> {}

  async recordVideoFailure(): Promise<void> {}
}

class FakeIntegrationClientScopeService {
  assertScope(): void {}
}

class FakeTenantModelAccessRuleService {
  async assertVideoModelAllowed(): Promise<void> {}

  async filterVideoCatalogProvider<
    T extends {
      providerId: string;
      displayName: string;
      defaultModelId: string | null;
      models: unknown[];
    },
  >(tenantId: string, provider: T) {
    if (tenantId === 'tenant-video-restricted') {
      return null;
    }

    return provider;
  }
}

class FakeTenantProviderConfigurationService {
  async resolveConfiguration(tenantId: string, providerId: 'openrouter') {
    return {
      tenantId,
      providerId,
      providerDisplayName: 'OpenRouter',
      providerStatus: 'active' as const,
      enabled: true,
      defaultTextModel: null,
      defaultImageModel: null,
      credentialMode: 'hybrid' as const,
      preferUserCredentials: true,
      allowPlatformFallback: false,
      allowTenantFallback: true,
    };
  }

  async assertProviderEnabled(tenantId: string, providerId: 'openrouter') {
    return this.resolveConfiguration(tenantId, providerId);
  }
}

class FakeTenantPolicyService {
  async assertVideoRequestAllowed(params: {
    tenantId: string;
    providerId: string;
    model: string;
  }): Promise<void> {
    if (params.tenantId === 'tenant-video-quota-blocked') {
      throw new TenantPolicyLimitException(
        'tenant_monthly_video_request_limit_exceeded',
        `Tenant ${params.tenantId} exceeded the monthly video request limit.`,
      );
    }
  }
}

class FakeMediaStorageService {
  public writeCalls = 0;
  public readCalls = 0;
  public deleteCalls = 0;
  public stored = new Map<string, Buffer>();

  async writeVideoAsset(input: {
    tenantId: string;
    assetId: string;
    mimeType?: string | null;
    data: Buffer;
  }) {
    this.writeCalls += 1;
    const storageKey = `${input.tenantId}/${input.assetId}.mp4`;
    this.stored.set(storageKey, input.data);
    return {
      storageKey,
      byteSize: input.data.byteLength,
      sha256: 'sha256-video',
    };
  }

  async readAsset(storageKey: string) {
    this.readCalls += 1;
    return this.stored.get(storageKey) ?? Buffer.alloc(0);
  }

  async deleteAsset(storageKey: string) {
    this.deleteCalls += 1;
    this.stored.delete(storageKey);
  }
}

function createTenantRlsService(repositories: {
  imageAssets: InMemoryRepository<ImageAssetEntity>;
  mediaJobs: InMemoryRepository<MediaGenerationJobEntity>;
  mediaAssets: InMemoryRepository<MediaAssetEntity>;
}) {
  return {
    async withTenantLockContext<T>(
      tenantId: string,
      callback: (manager: {
        getRepository: (entity: unknown) => InMemoryRepository<BaseEntity>;
      }) => Promise<T>,
    ) {
      return this.withTenantContext(tenantId, callback);
    },

    async withTenantContext<T>(
      tenantId: string,
      callback: (manager: {
        getRepository: (entity: unknown) => InMemoryRepository<BaseEntity>;
      }) => Promise<T>,
    ) {
      const createTenantScopedRepository = <E extends BaseEntity>(
        baseRepository: InMemoryRepository<E>,
      ): InMemoryRepository<E> => {
        return {
          async find(options) {
            const tenantWhere = { tenantId };
            const where = options?.where
              ? Array.isArray(options.where)
                ? options.where.map((entry) => ({ ...entry, ...tenantWhere }))
                : { ...options.where, ...tenantWhere }
              : tenantWhere;
            return baseRepository.find({ ...options, where });
          },
          async findOne(options) {
            return baseRepository.findOne({
              where: { ...options.where, tenantId },
            });
          },
          async findOneByOrFail(where) {
            return baseRepository.findOneByOrFail({ ...where, tenantId });
          },
          async findAndCount(options) {
            const tenantWhere = { tenantId };
            const where = options?.where
              ? Array.isArray(options.where)
                ? options.where.map((entry) => ({ ...entry, ...tenantWhere }))
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
          if (entity === MediaGenerationJobEntity) {
            return createTenantScopedRepository(repositories.mediaJobs);
          }
          if (entity === MediaAssetEntity) {
            return createTenantScopedRepository(repositories.mediaAssets);
          }

          throw new Error(`Unsupported repository request: ${String(entity)}`);
        },
      });
    },
  };
}

function createVideoService(options?: {
  users?: Array<Partial<BaseEntity>>;
  providers?: Array<Partial<BaseEntity>>;
  memberships?: Array<Partial<BaseEntity>>;
  imageAssets?: Array<Partial<ImageAssetEntity>>;
  mediaJobs?: Array<Partial<MediaGenerationJobEntity>>;
  mediaAssets?: Array<Partial<MediaAssetEntity>>;
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
    assertVideoRequestAllowed: (params: {
      tenantId: string;
      providerId: string;
      model: string;
    }) => Promise<void>;
  };
}) {
  const provider = new FakeVideoProvider();
  const imageAssets = new InMemoryRepository<ImageAssetEntity>(
    (options?.imageAssets ?? []) as ImageAssetEntity[],
  );
  const mediaJobs = new InMemoryRepository<MediaGenerationJobEntity>(
    (options?.mediaJobs ?? []) as MediaGenerationJobEntity[],
  );
  const mediaAssets = new InMemoryRepository<MediaAssetEntity>(
    (options?.mediaAssets ?? []) as MediaAssetEntity[],
  );
  const mediaStorageService = new FakeMediaStorageService();
  const providerRegistry = options?.providerRegistry ?? {
    getProvider: () => provider,
    listProviders: () => [provider],
  };

  return {
    provider,
    imageAssets,
    mediaJobs,
    mediaAssets,
    mediaStorageService,
    service: new VideoApplicationService(
      new InMemoryRepository(
        options?.users ?? [{ id: 'user-1', emailHash: 'hash-1', status: 'active' }],
      ) as never,
      new InMemoryRepository(
        options?.providers ?? [
          {
            id: 'provider-1',
            providerId: 'openrouter',
            displayName: 'OpenRouter',
            status: 'active',
          },
        ],
      ) as never,
      new InMemoryRepository(
        options?.memberships ?? [
          { id: 'membership-1', tenantId: 'tenant-1', userId: 'user-1' },
        ],
      ) as never,
      providerRegistry as never,
      (options?.providerCredentialService ?? {
        resolveProviderAccess: async () => ({ headers: { authorization: 'Bearer test' } }),
        resolveProviderAccessWithSource: async () => ({
          providerAccess: { headers: { authorization: 'Bearer test' } },
          credentialScopeUsed: 'user' as const,
        }),
      }) as never,
      new FakeTenantProviderConfigurationService() as never,
      new FakeIntegrationClientScopeService() as never,
      new FakeTenantModelAccessRuleService() as never,
      (options?.tenantPolicyService ?? new FakeTenantPolicyService()) as never,
      new FakeGatewayTelemetryService() as never,
      createTenantRlsService({
        imageAssets,
        mediaJobs,
        mediaAssets,
      }) as never,
      mediaStorageService as never,
    ),
  };
}

test('VideoApplicationService reuses an existing job for the same tenant/user idempotency key', async () => {
  const existingCreatedAt = new Date('2026-05-07T12:00:00.000Z');
  const { service, provider } = createVideoService({
    mediaJobs: [
      {
        id: 'video-job-existing',
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestId: 'request-existing',
        providerId: 'openrouter',
        capability: 'video',
        mode: 'text_to_video',
        model: 'openrouter/kling-v1',
        prompt: 'Existing prompt',
        status: 'queued',
        providerJobId: 'provider-job-existing',
        idempotencyKey: 'video-key-1',
        requestPayload: { prompt: 'Existing prompt' },
        sourceAssetId: null,
        providerMetadata: null,
        errorMessage: null,
        submissionAttempts: 1,
        pollAttempts: 0,
        nextPollAfter: new Date('2099-05-07T12:00:00.000Z'),
        lastPolledAt: null,
        startedAt: existingCreatedAt,
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        createdAt: existingCreatedAt,
        updatedAt: existingCreatedAt,
      },
    ],
  });

  const response = await service.submitVideoGeneration(
    {
      providerId: 'openrouter',
      model: 'openrouter/kling-v1',
      idempotencyKey: 'video-key-1',
      prompt: 'A duplicate request should return the existing job',
    },
    buildAuthContext(),
  );

  assert.equal(response.id, 'video-job-existing');
  assert.equal(provider.submitCalls, 0);
});

test('VideoApplicationService polls a provider job once, ingests the application-owned output, and avoids duplicate assets on later reads', async () => {
  const stalePollTime = new Date(Date.now() - 60_000);
  const { service, provider, mediaAssets, mediaStorageService } = createVideoService({
    mediaJobs: [
      {
        id: 'video-job-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestId: 'request-video-1',
        providerId: 'openrouter',
        capability: 'video',
        mode: 'text_to_video',
        model: 'openrouter/kling-v1',
        prompt: 'Animate this still frame',
        status: 'running',
        providerJobId: 'provider-job-1',
        idempotencyKey: null,
        requestPayload: { prompt: 'Animate this still frame' },
        sourceAssetId: null,
        providerMetadata: null,
        errorMessage: null,
        submissionAttempts: 1,
        pollAttempts: 0,
        nextPollAfter: stalePollTime,
        lastPolledAt: null,
        startedAt: new Date('2026-05-07T12:00:00.000Z'),
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        createdAt: new Date('2026-05-07T12:00:00.000Z'),
        updatedAt: new Date('2026-05-07T12:00:00.000Z'),
      },
    ],
  });

  const firstRead = await service.getJob('video-job-1', buildAuthContext());
  const secondRead = await service.getJob('video-job-1', buildAuthContext());

  assert.equal(firstRead.status, 'succeeded');
  assert.equal(firstRead.outputs.length, 1);
  assert.match(
    firstRead.outputs[0]?.contentUrl ?? '',
    /\/api\/v1\/videos\/assets\/.+\/content/,
  );
  assert.equal(firstRead.providerMetadata?.credentialScopeUsed, 'user');
  assert.equal(secondRead.providerMetadata?.credentialScopeUsed, 'user');
  assert.equal(secondRead.outputs.length, 1);
  assert.equal(provider.pollCalls, 1);
  assert.equal(provider.downloadCalls, 1);
  assert.equal(mediaStorageService.writeCalls, 1);
  assert.equal((await mediaAssets.find()).length, 1);
});

test('VideoApplicationService stops polling and marks the job failed when provider polling throws', async () => {
  const stalePollTime = new Date(Date.now() - 60_000);
  const provider = new FakeVideoProvider();
  provider.getVideoGenerationJob = async () => {
    throw new Error('NanoGPT status returned an invalid payload');
  };

  const { service } = createVideoService({
    providerRegistry: {
      getProvider: () => provider,
      listProviders: () => [provider],
    },
    mediaJobs: [
      {
        id: 'video-job-failure-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestId: 'request-video-failure-1',
        providerId: 'openrouter',
        capability: 'video',
        mode: 'text_to_video',
        model: 'openrouter/kling-v1',
        prompt: 'Polling should stop after this error',
        status: 'running',
        providerJobId: 'provider-job-failure-1',
        idempotencyKey: null,
        requestPayload: { prompt: 'Polling should stop after this error' },
        sourceAssetId: null,
        providerMetadata: null,
        errorMessage: null,
        submissionAttempts: 1,
        pollAttempts: 0,
        nextPollAfter: stalePollTime,
        lastPolledAt: null,
        startedAt: new Date('2026-05-07T12:00:00.000Z'),
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        createdAt: new Date('2026-05-07T12:00:00.000Z'),
        updatedAt: new Date('2026-05-07T12:00:00.000Z'),
      },
    ],
  });

  const job = await service.getJob('video-job-failure-1', buildAuthContext());

  assert.equal(job.status, 'failed');
  assert.match(job.error ?? '', /invalid payload/i);
});

test('VideoApplicationService refreshes non-terminal history jobs and returns the ingested output', async () => {
  const stalePollTime = new Date(Date.now() - 60_000);
  const { service, provider } = createVideoService({
    mediaJobs: [
      {
        id: 'video-history-job-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestId: 'request-video-history-1',
        providerId: 'openrouter',
        capability: 'video',
        mode: 'text_to_video',
        model: 'openrouter/kling-v1',
        prompt: 'Refresh this history entry',
        status: 'queued',
        providerJobId: 'provider-job-history-1',
        idempotencyKey: null,
        requestPayload: { prompt: 'Refresh this history entry' },
        sourceAssetId: null,
        providerMetadata: null,
        errorMessage: null,
        submissionAttempts: 1,
        pollAttempts: 0,
        nextPollAfter: stalePollTime,
        lastPolledAt: null,
        startedAt: new Date('2026-05-07T12:00:00.000Z'),
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        createdAt: new Date('2026-05-07T12:00:00.000Z'),
        updatedAt: new Date('2026-05-07T12:00:00.000Z'),
      },
    ],
  });

  const history = await service.listHistory(1, buildAuthContext());

  assert.equal(history.items[0]?.status, 'succeeded');
  assert.equal(history.items[0]?.outputs.length, 1);
  assert.match(history.items[0]?.outputs[0]?.contentUrl ?? '', /\/api\/v1\/videos\/assets\/.+\/content/);
  assert.equal(provider.pollCalls, 1);
  assert.equal(provider.downloadCalls, 1);
});

test('VideoApplicationService resolves uploaded image assets before provider submission and normalizes cancellation at gateway level', async () => {
  const { service, provider, mediaJobs } = createVideoService({
    imageAssets: [
      {
        id: 'image-asset-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        sourceType: 'upload',
        label: 'Storyboard frame',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,abc123',
        contentHash: 'hash-image-asset-1',
        originalUrl: null,
        isSaved: false,
        createdAt: new Date('2026-05-07T11:59:00.000Z'),
        updatedAt: new Date('2026-05-07T11:59:00.000Z'),
      },
    ],
  });

  const submitted = await service.submitVideoGeneration(
    {
      providerId: 'openrouter',
      model: 'openrouter/kling-v1',
      prompt: 'Use the uploaded storyboard frame',
      referenceImages: [{ type: 'asset', assetId: 'image-asset-1' }],
    },
    buildAuthContext(),
  );

  assert.equal(provider.submitCalls, 1);
  assert.deepEqual(provider.submittedRequests[0]?.referenceImages, [
    {
      type: 'data_url',
      url: 'data:image/png;base64,abc123',
      mimeType: 'image/png',
    },
  ]);

  const cancelled = await service.cancelJob(submitted.id, buildAuthContext());
  const storedJob = await mediaJobs.findOne({
    where: { id: submitted.id, tenantId: 'tenant-1' },
  });

  assert.equal(provider.cancelCalls, 1);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(storedJob?.status, 'cancelled');
  assert.equal(cancelled.providerMetadata?.credentialScopeUsed, 'user');
  assert.deepEqual(cancelled.request?.referenceImages, [
    {
      type: 'asset',
      assetId: 'image-asset-1',
    },
  ]);
});

test('VideoApplicationService deletes a terminal job and its ingested application assets', async () => {
  const { service, mediaAssets, mediaJobs, mediaStorageService } = createVideoService({
    mediaJobs: [
      {
        id: 'video-job-delete-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        requestId: 'request-video-delete-1',
        providerId: 'openrouter',
        capability: 'video',
        mode: 'image_to_video',
        model: 'openrouter/kling-v1',
        prompt: 'Delete this cancelled job',
        status: 'cancelled',
        providerJobId: 'provider-job-delete-1',
        idempotencyKey: null,
        requestPayload: {
          providerId: 'openrouter',
          model: 'openrouter/kling-v1',
          prompt: 'Delete this cancelled job',
          referenceImages: [{ type: 'asset', assetId: 'image-asset-1' }],
        },
        sourceAssetId: 'image-asset-1',
        providerMetadata: null,
        errorMessage: null,
        submissionAttempts: 1,
        pollAttempts: 1,
        nextPollAfter: null,
        lastPolledAt: new Date('2026-05-07T12:00:08.000Z'),
        startedAt: new Date('2026-05-07T12:00:00.000Z'),
        completedAt: null,
        failedAt: null,
        cancelledAt: new Date('2026-05-07T12:00:08.000Z'),
        createdAt: new Date('2026-05-07T12:00:00.000Z'),
        updatedAt: new Date('2026-05-07T12:00:08.000Z'),
      },
    ],
    mediaAssets: [
      {
        id: 'video-asset-delete-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        jobId: 'video-job-delete-1',
        kind: 'video',
        sourceType: 'generated',
        outputIndex: 0,
        label: 'Generated video 1',
        mimeType: 'video/mp4',
        storageKey: 'tenant-1/video-asset-delete-1.mp4',
        originalUrl: 'https://provider.example/video-delete-1.mp4',
        byteSize: 11,
        durationSeconds: '5.000',
        width: 1280,
        height: 720,
        sha256: 'sha256-video',
        isSaved: false,
        providerMetadata: null,
        createdAt: new Date('2026-05-07T12:00:08.000Z'),
        updatedAt: new Date('2026-05-07T12:00:08.000Z'),
      },
    ],
  });
  mediaStorageService.stored.set(
    'tenant-1/video-asset-delete-1.mp4',
    Buffer.from('video-bytes'),
  );

  const result = await service.deleteJob('video-job-delete-1', buildAuthContext());

  assert.deepEqual(result, { deleted: true });
  assert.equal((await mediaJobs.find()).length, 0);
  assert.equal((await mediaAssets.find()).length, 0);
  assert.equal(mediaStorageService.deleteCalls, 1);
});

test('VideoApplicationService returns video catalog entries even when provider credentials are not yet configured', async () => {
  const { service } = createVideoService({
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

  assert.equal(catalog.providers.length, 1);
  assert.equal(catalog.providers[0]?.providerId, 'openrouter');
  assert.equal(catalog.providers[0]?.defaultModelId, 'openrouter/kling-v1');
  assert.equal(catalog.providers[0]?.models[0]?.id, 'openrouter/kling-v1');
  assert.equal(
    catalog.providers[0]?.models[0]?.capabilities?.supportsVideoGeneration,
    true,
  );
  assert.equal(catalog.providers[0]?.models[0]?.family?.profileId, 'kling-video-family');
});

test('VideoApplicationService filters video catalog models denied for the active tenant', async () => {
  const { service } = createVideoService({
    memberships: [
      {
        id: 'membership-1',
        tenantId: 'tenant-video-restricted',
        userId: 'user-1',
      },
    ],
  });

  const catalog = await service.getCatalog({
    ...buildAuthContext(),
    activeTenantId: 'tenant-video-restricted',
  });

  assert.equal(catalog.providers.length, 0);
});

test('VideoApplicationService rejects video generation when tenant quota policy blocks the request', async () => {
  const { service } = createVideoService({
    memberships: [
      {
        id: 'membership-1',
        tenantId: 'tenant-video-quota-blocked',
        userId: 'user-1',
      },
    ],
  });

  await assert.rejects(
    () =>
      service.submitVideoGeneration(
        {
          providerId: 'openrouter',
          model: 'openrouter/kling-v1',
          prompt: 'A blocked video request',
        },
        {
          ...buildAuthContext(),
          activeTenantId: 'tenant-video-quota-blocked',
        },
      ),
    /monthly video request limit/i,
  );
});

test('VideoApplicationService rejects unsupported Kling-family requests before calling provider transport', async () => {
  const { service, provider } = createVideoService();

  await assert.rejects(
    () =>
      service.submitVideoGeneration(
        {
          providerId: 'openrouter',
          model: 'openrouter/kling-v1',
          prompt: 'Request an unsupported Kling configuration',
          durationSeconds: 7,
          aspectRatio: '4:3',
          resolution: '4k',
          providerOptions: {
            unsupportedKnob: true,
          },
        },
        buildAuthContext(),
      ),
    /not supported by Kling Video|not allowed for this model family/i,
  );

  assert.equal(provider.submitCalls, 0);
});

test('VideoApplicationService reads back stored application-owned video assets', async () => {
  const { service, mediaStorageService } = createVideoService({
    mediaAssets: [
      {
        id: 'video-asset-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        jobId: 'video-job-1',
        kind: 'video',
        sourceType: 'generated',
        outputIndex: 0,
        label: 'Generated video 1',
        mimeType: 'video/mp4',
        storageKey: 'tenant-1/video-asset-1.mp4',
        originalUrl: 'https://provider.example/video-1.mp4',
        byteSize: 11,
        durationSeconds: '5.000',
        width: 1280,
        height: 720,
        sha256: 'sha256-video',
        isSaved: false,
        providerMetadata: null,
        createdAt: new Date('2026-05-07T12:00:08.000Z'),
        updatedAt: new Date('2026-05-07T12:00:08.000Z'),
      },
    ],
  });
  mediaStorageService.stored.set(
    'tenant-1/video-asset-1.mp4',
    Buffer.from('video-bytes'),
  );

  const assetContent = await service.getAssetContent(
    'video-asset-1',
    buildAuthContext(),
  );

  assert.equal(assetContent.mimeType, 'video/mp4');
  assert.equal(assetContent.data.toString('utf8'), 'video-bytes');
  assert.equal(mediaStorageService.readCalls, 1);
});


