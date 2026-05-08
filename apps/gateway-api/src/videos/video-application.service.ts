import { randomUUID } from 'node:crypto';

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  GatewayVideoAssetSaveRequest,
  GatewayVideoCatalogResponse,
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
  GatewayVideoRetryRequest,
  GatewayVideoReference,
} from '@lxp/contracts';
import type { ProviderAccessConfig } from '@lxp/provider-sdk';
import { Repository } from 'typeorm';

import type { GatewayAuthContext } from '../auth/auth.types';
import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { MediaAssetEntity } from '../persistence/entities/media-asset.entity';
import { MediaGenerationJobEntity } from '../persistence/entities/media-generation-job.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { GatewayTelemetryService } from '../gateway/gateway-telemetry.service';
import { IntegrationClientScopeService } from '../gateway/integration-client-scope.service';
import {
  ModelAccessLimitException,
  ModelAccessPolicyException,
  TenantModelAccessRuleService,
} from '../gateway/tenant-model-access-rule.service';
import {
  TenantPolicyLimitException,
  TenantPolicyService,
} from '../gateway/tenant-policy.service';
import { ProviderCredentialService } from '../gateway/provider-credential.service';
import { ProviderRegistryService } from '../gateway/provider-registry.service';
import { TenantProviderConfigurationService } from '../gateway/tenant-provider-configuration.service';
import { MediaStorageService } from './media-storage.service';

const VIDEO_HISTORY_PAGE_SIZE = 10;
const BASE_POLL_DELAY_MS = 2000;
const MAX_POLL_DELAY_MS = 30000;

type ProviderId = import('@lxp/domain').ProviderId;
const { validateVideoRequestAgainstFamily } = require('@lxp/model-family-capabilities');

@Injectable()
export class VideoApplicationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepository: Repository<TenantMembershipEntity>,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
    private readonly tenantProviderConfigurationService: TenantProviderConfigurationService,
    private readonly integrationClientScopeService: IntegrationClientScopeService,
    private readonly tenantModelAccessRuleService: TenantModelAccessRuleService,
    private readonly tenantPolicyService: TenantPolicyService,
    private readonly gatewayTelemetryService: GatewayTelemetryService,
    private readonly tenantRlsService: TenantRlsService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  async getCatalog(
    authContext: GatewayAuthContext,
  ): Promise<GatewayVideoCatalogResponse> {
    this.integrationClientScopeService.assertScope(authContext, 'models:list');
    const activeProviders = await this.providerRepository.find({
      where: { status: 'active' },
      order: { displayName: 'ASC' },
    });

    const providers: GatewayVideoCatalogResponse['providers'] = [];
    for (const providerEntity of activeProviders) {
      const configuration =
        await this.tenantProviderConfigurationService.resolveConfiguration(
          authContext.activeTenantId,
          providerEntity.providerId,
        );
      if (!configuration.enabled || configuration.providerStatus !== 'active') {
        continue;
      }

      const provider = this.providerRegistry
        .listProviders()
        .find((entry) => entry.providerId === providerEntity.providerId);

      if (
        !provider ||
        !provider.listVideoCatalog ||
        !provider.capabilities.videoGeneration
      ) {
        continue;
      }

      try {
        const providerAccess =
          await this.providerCredentialService
            .resolveProviderAccess(authContext, provider.providerId)
            .catch(() => ({
              headers: {},
            }));
        const catalog = await provider.listVideoCatalog({
          requestId: randomUUID(),
          userId: authContext.userId,
          providerAccess,
        });

        const filteredProvider =
          await this.tenantModelAccessRuleService.filterVideoCatalogProvider(
            authContext.activeTenantId,
            {
              providerId: provider.providerId,
              displayName: providerEntity.displayName,
              defaultModelId: catalog.defaultModelId,
              models: catalog.models.map((model) => ({
                id: model.id,
                displayName: model.displayName,
                family: model.family,
                capabilities: model.capabilities,
              })),
            },
          );
        if (!filteredProvider) {
          continue;
        }

        providers.push(filteredProvider);
      } catch {
        continue;
      }
    }

    return { providers };
  }

  async submitVideoGeneration(
    request: GatewayVideoGenerationRequest,
    authContext: GatewayAuthContext,
  ): Promise<GatewayVideoGenerationJob> {
    this.integrationClientScopeService.assertScope(authContext, 'video:generate');
    if (!request.model?.trim()) {
      throw new BadRequestException(
        'A video model is required for this MVP backend slice.',
      );
    }

    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const providerId = this.resolveProviderId(request.providerId);
    await this.tenantProviderConfigurationService.assertProviderEnabled(
      authContext.activeTenantId,
      providerId,
    );
    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider.capabilities.videoGeneration || !provider.submitVideoGeneration) {
      throw new NotFoundException(
        `Provider ${provider.providerId} does not support video generation.`,
      );
    }

    const mode = this.resolveMode(request);
    const startedAt = new Date();

    try {
      const requestId = randomUUID();
      const existingJob = await this.findJobByIdempotencyKey(
        authContext.activeTenantId,
        user.id,
        request.idempotencyKey,
      );
      if (existingJob) {
        return this.mapJob(
          existingJob,
          await this.loadAssetsForJob(authContext.activeTenantId, user.id, existingJob.id),
        );
      }

      const resolvedReferences = await this.resolveGatewayReferences(
        request.referenceImages ?? [],
        authContext.activeTenantId,
        user.id,
      );
      const resolvedFrameImages = request.frameImages
        ? await Promise.all(
            request.frameImages.map(async (frame) => ({
              frameType: frame.frameType,
              image: await this.resolveGatewayReference(
                frame.image,
                authContext.activeTenantId,
                user.id,
              ),
            })),
          )
        : undefined;

      const internalJob = await this.tenantRlsService.withTenantLockContext(
        authContext.activeTenantId,
        async (manager) => {
          await this.tenantModelAccessRuleService.assertVideoModelAllowed({
            tenantId: authContext.activeTenantId,
            providerId,
            model: request.model!,
            durationSeconds: request.durationSeconds,
            resolution: request.resolution ?? request.size,
          });
          await this.tenantPolicyService.assertVideoRequestAllowed(
            {
              tenantId: authContext.activeTenantId,
              providerId,
              model: request.model!,
            },
            manager,
          );
          await this.gatewayTelemetryService.reserveVideoUsageEvent(
            {
              authContext,
              requestId,
              providerId,
              model: request.model!,
              promptLength: request.prompt.length,
              sourceType: mode,
            },
            manager,
          );

          return manager.getRepository(MediaGenerationJobEntity).save({
            tenantId: authContext.activeTenantId,
            userId: user.id,
            requestId,
            providerId,
            capability: 'video',
            mode,
            model: request.model!,
            prompt: request.prompt,
            status: 'queued',
            providerJobId: null,
            idempotencyKey: request.idempotencyKey?.trim() || null,
            requestPayload: this.buildStoredRequestPayload(request),
            sourceAssetId:
              mode === 'image_to_video'
                ? this.extractPrimaryAssetId(request, resolvedReferences)
                : null,
            providerMetadata: null,
            errorMessage: null,
            submissionAttempts: 0,
            pollAttempts: 0,
            nextPollAfter: null,
            lastPolledAt: null,
            startedAt,
            completedAt: null,
            failedAt: null,
            cancelledAt: null,
          } satisfies Partial<MediaGenerationJobEntity>);
        },
      );

      const { providerAccess, credentialScopeUsed } =
        await this.providerCredentialService.resolveProviderAccessWithSource(
          authContext,
          provider.providerId,
        );

      const modelCatalogEntry = await this.resolveVideoModelCatalogEntry(
        provider,
        request.model!,
        authContext,
        providerAccess,
      );
      if (modelCatalogEntry) {
        const validation = validateVideoRequestAgainstFamily(
          request,
          modelCatalogEntry.family ?? modelCatalogEntry.capabilities.family,
        );
        if (!validation.ok) {
          throw new BadRequestException(validation.issues[0]?.message);
        }
      }

      const providerResponse = await provider.submitVideoGeneration(
        {
          ...request,
          providerId,
          model: request.model!,
          referenceImages: resolvedReferences,
          frameImages: resolvedFrameImages,
        },
        {
          requestId,
          userId: authContext.userId,
          providerAccess,
        },
      );

      const persistedJob = await this.tenantRlsService.withTenantContext(
        authContext.activeTenantId,
        async (manager) => {
          const repository = manager.getRepository(MediaGenerationJobEntity);
          const job = await repository.findOneByOrFail({ id: internalJob.id });
          job.providerJobId = providerResponse.id;
          job.status = providerResponse.status;
          job.providerMetadata = {
            ...(providerResponse.providerMetadata ?? {}),
            credentialScopeUsed,
          };
          job.submissionAttempts += 1;
          job.nextPollAfter =
            providerResponse.status === 'succeeded'
              ? null
              : this.computeNextPollAfter(0);
          job.pollAttempts = 0;
          if (job.status === 'running') {
            job.startedAt = job.startedAt ?? new Date();
          }
          if (job.status === 'succeeded') {
            job.completedAt = job.completedAt ?? new Date();
          }
          return repository.save(job);
        },
      );

      if (providerResponse.status === 'succeeded') {
        await this.ingestJobOutputs(persistedJob, providerResponse, authContext);
      }

      const latencyMs = Date.now() - startedAt.getTime();
      const mappedJob = this.mapJob(
        persistedJob,
        await this.loadAssetsForJob(authContext.activeTenantId, user.id, persistedJob.id),
      );
      await this.gatewayTelemetryService.recordVideoSuccess({
        authContext,
        requestId,
        providerId: provider.providerId,
        model: request.model!,
        route: '/api/v1/videos/generations',
        latencyMs,
        promptLength: request.prompt.length,
        credentialScopeUsed,
        job: mappedJob,
      });
      return mappedJob;
    } catch (error) {
      if (
        error instanceof ModelAccessPolicyException ||
        error instanceof ModelAccessLimitException ||
        error instanceof TenantPolicyLimitException
      ) {
        throw error;
      }

      await this.gatewayTelemetryService.recordVideoFailure({
        authContext,
        requestId: randomUUID(),
        providerId,
        model: request.model!,
        route: '/api/v1/videos/generations',
        latencyMs: Date.now() - startedAt.getTime(),
        promptLength: request.prompt.length,
        error: error instanceof Error ? error.message : 'Unknown gateway error.',
      });
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async getJob(jobId: string, authContext: GatewayAuthContext) {
    this.integrationClientScopeService.assertScope(authContext, 'video:generate');
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const job = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(MediaGenerationJobEntity).findOne({
          where: {
            id: jobId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );
    if (!job) {
      throw new NotFoundException('Video generation job not found.');
    }

    const hydratedJob = await this.refreshJobIfNeeded(job, authContext);
    return this.mapJob(
      hydratedJob,
      await this.loadAssetsForJob(
        authContext.activeTenantId,
        user.id,
        hydratedJob.id,
      ),
    );
  }

  async listHistory(page: number, authContext: GatewayAuthContext) {
    this.integrationClientScopeService.assertScope(authContext, 'video:generate');
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;

    const [jobs, totalItems] = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(MediaGenerationJobEntity).findAndCount({
          where: {
            tenantId: authContext.activeTenantId,
            userId: user.id,
            capability: 'video',
          },
          order: { createdAt: 'DESC' },
          skip: (safePage - 1) * VIDEO_HISTORY_PAGE_SIZE,
          take: VIDEO_HISTORY_PAGE_SIZE,
        }),
    );

    const hydratedJobs = await Promise.all(
      jobs.map((job) => this.refreshJobIfNeeded(job, authContext)),
    );
    const assets = await this.loadAssetsForJobs(
      authContext.activeTenantId,
      user.id,
      hydratedJobs.map((job) => job.id),
    );
    const assetsByJobId = new Map<string, MediaAssetEntity[]>();
    for (const asset of assets) {
      const list = assetsByJobId.get(asset.jobId ?? '');
      if (list) {
        list.push(asset);
      } else {
        assetsByJobId.set(asset.jobId ?? '', [asset]);
      }
    }

    return {
      items: hydratedJobs.map((job) =>
        this.mapJob(job, assetsByJobId.get(job.id) ?? []),
      ),
      page: safePage,
      pageSize: VIDEO_HISTORY_PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / VIDEO_HISTORY_PAGE_SIZE)),
    };
  }

  async cancelJob(jobId: string, authContext: GatewayAuthContext) {
    this.integrationClientScopeService.assertScope(authContext, 'video:generate');
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const job = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(MediaGenerationJobEntity).findOne({
          where: {
            id: jobId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );
    if (!job) {
      throw new NotFoundException('Video generation job not found.');
    }

    if (this.isTerminalStatus(job.status)) {
      return this.mapJob(
        job,
        await this.loadAssetsForJob(authContext.activeTenantId, user.id, job.id),
      );
    }

    const provider = this.providerRegistry.getProvider(job.providerId);
    if (job.providerJobId && provider.cancelVideoGeneration) {
      const { providerAccess } =
        await this.providerCredentialService.resolveProviderAccessWithSource(
          authContext,
          provider.providerId,
        );
      await provider.cancelVideoGeneration(job.providerJobId, {
        requestId: job.requestId,
        userId: authContext.userId,
        providerAccess,
      });
    }

    const cancelled = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) => {
        const repository = manager.getRepository(MediaGenerationJobEntity);
        const current = await repository.findOneByOrFail({ id: job.id });
        if (this.isTerminalStatus(current.status)) {
          return current;
        }

        current.status = 'cancelled';
        current.cancelledAt = current.cancelledAt ?? new Date();
        current.nextPollAfter = null;
        return repository.save(current);
      },
    );

    return this.mapJob(
      cancelled,
      await this.loadAssetsForJob(authContext.activeTenantId, user.id, cancelled.id),
    );
  }

  async deleteJob(jobId: string, authContext: GatewayAuthContext) {
    this.integrationClientScopeService.assertScope(authContext, 'video:generate');
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const job = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(MediaGenerationJobEntity).findOne({
          where: {
            id: jobId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );
    if (!job) {
      throw new NotFoundException('Video generation job not found.');
    }

    if (!this.isTerminalStatus(job.status)) {
      throw new BadRequestException(
        'Only terminal video jobs can be deleted. Cancel the job first if it is still queued or running.',
      );
    }

    const assets = await this.loadAssetsForJob(
      authContext.activeTenantId,
      user.id,
      job.id,
    );
    for (const asset of assets) {
      await this.mediaStorageService.deleteAsset(asset.storageKey);
    }

    await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) => {
        const assetRepository = manager.getRepository(MediaAssetEntity);
        const jobRepository = manager.getRepository(MediaGenerationJobEntity);

        for (const asset of assets) {
          await assetRepository.delete({ id: asset.id });
        }
        await jobRepository.delete({ id: job.id });
      },
    );

    return { deleted: true as const };
  }

  async setAssetSaved(
    assetId: string,
    request: GatewayVideoAssetSaveRequest,
    authContext: GatewayAuthContext,
  ) {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const asset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(MediaAssetEntity).findOne({
          where: {
            id: assetId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );
    if (!asset) {
      throw new NotFoundException('Video asset not found.');
    }

    asset.isSaved = request.saved;
    const savedAsset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) => manager.getRepository(MediaAssetEntity).save(asset),
    );

    return {
      asset: this.mapAssetOutput(savedAsset),
    };
  }

  async getAssetContent(
    assetId: string,
    authContext: GatewayAuthContext,
  ): Promise<{ mimeType: string; data: Buffer }> {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const asset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(MediaAssetEntity).findOne({
          where: {
            id: assetId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );
    if (!asset) {
      throw new NotFoundException('Video asset not found.');
    }

    return {
      mimeType: asset.mimeType ?? 'video/mp4',
      data: await this.mediaStorageService.readAsset(asset.storageKey),
    };
  }

  private async refreshJobIfNeeded(
    job: MediaGenerationJobEntity,
    authContext: GatewayAuthContext,
  ): Promise<MediaGenerationJobEntity> {
    if (this.isTerminalStatus(job.status)) {
      return job;
    }

    if (job.nextPollAfter && job.nextPollAfter.getTime() > Date.now()) {
      return job;
    }

    if (!job.providerJobId) {
      return job;
    }

    const provider = this.providerRegistry.getProvider(job.providerId);
    if (!provider.getVideoGenerationJob) {
      return job;
    }

    const { providerAccess, credentialScopeUsed } =
      await this.providerCredentialService.resolveProviderAccessWithSource(
        authContext,
        provider.providerId,
      );

    try {
      const providerJob = await provider.getVideoGenerationJob(job.providerJobId, {
        requestId: job.requestId,
        userId: authContext.userId,
        providerAccess,
        metadata: {
          requestedModel: job.model,
          prompt: job.prompt,
        },
      });

      return this.tenantRlsService.withTenantContext(
        authContext.activeTenantId,
        async (manager) => {
          const repository = manager.getRepository(MediaGenerationJobEntity);
          const current = await repository.findOneByOrFail({ id: job.id });
          if (this.isTerminalStatus(current.status)) {
            return current;
          }

          current.lastPolledAt = new Date();
          current.pollAttempts += 1;
          current.providerMetadata = {
            ...(current.providerMetadata ?? {}),
            credentialScopeUsed,
            ...(providerJob.providerMetadata ?? {}),
          };
          current.errorMessage = providerJob.error ?? current.errorMessage;

          const hasIngestibleOutputs = providerJob.outputs.some((output) =>
            typeof output.contentUrl === 'string' && output.contentUrl.trim().length > 0,
          );

          if (
            providerJob.status !== 'failed' &&
            providerJob.status !== 'cancelled' &&
            (providerJob.status === 'succeeded' || hasIngestibleOutputs)
          ) {
            current.status = 'succeeded';
            current.completedAt = current.completedAt ?? new Date();
            current.nextPollAfter = null;
            const savedJob = await repository.save(current);
            await this.ingestJobOutputs(savedJob, providerJob, authContext);
            return repository.findOneByOrFail({ id: current.id });
          }

          if (providerJob.status === 'queued' || providerJob.status === 'running') {
            current.status = providerJob.status;
            current.nextPollAfter = this.computeNextPollAfter(current.pollAttempts);
            if (providerJob.status === 'running' && !current.startedAt) {
              current.startedAt = new Date();
            }
            return repository.save(current);
          }

          if (providerJob.status === 'cancelled') {
            current.status = 'cancelled';
            current.cancelledAt = current.cancelledAt ?? new Date();
            current.nextPollAfter = null;
            return repository.save(current);
          }

          current.status = 'failed';
          current.failedAt = current.failedAt ?? new Date();
          current.nextPollAfter = null;
          return repository.save(current);
        },
      );
    } catch (error) {
      return this.tenantRlsService.withTenantContext(
        authContext.activeTenantId,
        async (manager) => {
          const repository = manager.getRepository(MediaGenerationJobEntity);
          const current = await repository.findOneByOrFail({ id: job.id });
          if (this.isTerminalStatus(current.status)) {
            return current;
          }

          current.lastPolledAt = new Date();
          current.pollAttempts += 1;
          current.status = 'failed';
          current.failedAt = current.failedAt ?? new Date();
          current.nextPollAfter = null;
          current.errorMessage =
            error instanceof Error ? error.message : 'Video polling failed.';
          current.providerMetadata = {
            ...(current.providerMetadata ?? {}),
            credentialScopeUsed,
            pollingFailure: current.errorMessage,
          };
          return repository.save(current);
        },
      );
    }
  }

  private async ingestJobOutputs(
    job: MediaGenerationJobEntity,
    providerJob: GatewayVideoGenerationJob,
    authContext: GatewayAuthContext,
  ): Promise<void> {
    const provider = this.providerRegistry.getProvider(job.providerId);
    if (!provider.downloadVideoOutput || !job.providerJobId) {
      return;
    }

    const { providerAccess } =
      await this.providerCredentialService.resolveProviderAccessWithSource(
        authContext,
        provider.providerId,
      );

    await this.tenantRlsService.withTenantContext(job.tenantId, async (manager) => {
      const assetRepository = manager.getRepository(MediaAssetEntity);

      for (const [index, output] of providerJob.outputs.entries()) {
        const existing = await assetRepository.findOne({
          where: {
            tenantId: job.tenantId,
            userId: job.userId,
            jobId: job.id,
            outputIndex: index,
          },
        });
        if (existing) {
          continue;
        }

        const downloadVideoOutput = provider.downloadVideoOutput;
        if (!downloadVideoOutput) {
          return;
        }

        const stream = await downloadVideoOutput(job.providerJobId!, index, {
          requestId: job.requestId,
          userId: authContext.userId,
          providerAccess,
        });
        const data = Buffer.from(await new Response(stream).arrayBuffer());
        const assetId = randomUUID();
        const mimeType = output.mimeType ?? 'video/mp4';
        const stored = await this.mediaStorageService.writeVideoAsset({
          tenantId: job.tenantId,
          assetId,
          mimeType,
          data,
        });

        await assetRepository.save({
          id: assetId,
          tenantId: job.tenantId,
          userId: job.userId,
          jobId: job.id,
          kind: 'video',
          sourceType: 'generated',
          outputIndex: index,
          label: `Generated video ${index + 1}`,
          mimeType,
          storageKey: stored.storageKey,
          originalUrl: output.contentUrl ?? null,
          byteSize: stored.byteSize,
          durationSeconds:
            typeof output.durationSeconds === 'number'
              ? output.durationSeconds.toFixed(3)
              : null,
          width: output.width ?? null,
          height: output.height ?? null,
          sha256: stored.sha256,
          isSaved: false,
          providerMetadata: output.providerMetadata ?? null,
        } as MediaAssetEntity);
      }
    });
  }

  private async loadAssetsForJob(
    tenantId: string,
    userId: string,
    jobId: string,
  ) {
    return this.tenantRlsService.withTenantContext(tenantId, async (manager) =>
      manager.getRepository(MediaAssetEntity).find({
        where: {
          tenantId,
          userId,
          jobId,
        },
      }),
    );
  }

  private async loadAssetsForJobs(
    tenantId: string,
    userId: string,
    jobIds: string[],
  ) {
    if (!jobIds.length) {
      return [];
    }

    return this.tenantRlsService.withTenantContext(tenantId, async (manager) =>
      manager.getRepository(MediaAssetEntity).find({
        where: jobIds.map((jobId) => ({
          tenantId,
          userId,
          jobId,
        })),
      }),
    );
  }

  private async findJobByIdempotencyKey(
    tenantId: string,
    userId: string,
    idempotencyKey: string | undefined,
  ): Promise<MediaGenerationJobEntity | null> {
    if (!idempotencyKey?.trim()) {
      return null;
    }

    return this.tenantRlsService.withTenantContext(tenantId, async (manager) =>
      manager.getRepository(MediaGenerationJobEntity).findOne({
        where: {
          tenantId,
          userId,
          idempotencyKey: idempotencyKey.trim(),
        },
      }),
    );
  }

  private async resolveGatewayReferences(
    images: GatewayVideoReference[],
    tenantId: string,
    userId: string,
  ): Promise<GatewayVideoReference[]> {
    return Promise.all(
      images.map((image) => this.resolveGatewayReference(image, tenantId, userId)),
    );
  }

  private async resolveGatewayReference(
    image: GatewayVideoReference,
    tenantId: string,
    userId: string,
  ): Promise<GatewayVideoReference> {
    if (image.type !== 'asset') {
      return image;
    }

    const asset = await this.tenantRlsService.withTenantContext(
      tenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).findOne({
          where: { id: image.assetId, tenantId, userId },
        }),
    );
    if (!asset) {
      throw new NotFoundException(`Reference asset ${image.assetId} was not found.`);
    }

    return {
      type: 'data_url',
      url: asset.dataUrl,
      mimeType: asset.mimeType ?? undefined,
    };
  }

  private extractPrimaryAssetId(
    request: GatewayVideoGenerationRequest,
    resolvedReferences: GatewayVideoReference[],
  ): string | null {
    const directAssetReference = request.referenceImages?.find(
      (image) => image.type === 'asset',
    );
    if (directAssetReference?.type === 'asset') {
      return directAssetReference.assetId;
    }

    return null;
  }

  private resolveMode(
    request: GatewayVideoGenerationRequest,
  ): 'image_to_video' | 'text_to_video' {
    return (request.referenceImages?.length ?? 0) > 0 ||
      (request.frameImages?.length ?? 0) > 0
      ? 'image_to_video'
      : 'text_to_video';
  }

  private resolveProviderId(requestedProviderId?: ProviderId): ProviderId {
    return requestedProviderId ?? 'openrouter';
  }

  private async resolveVideoModelCatalogEntry(
    provider: ReturnType<ProviderRegistryService['getProvider']>,
    modelId: string,
    authContext: GatewayAuthContext,
    providerAccess: ProviderAccessConfig,
  ) {
    if (!provider.listVideoCatalog) {
      return null;
    }

    try {
      const catalog = await provider.listVideoCatalog({
        requestId: randomUUID(),
        userId: authContext.userId,
        providerAccess,
      });

      return (
        catalog.models.find((model) => model.id === modelId) ??
        null
      );
    } catch {
      return null;
    }
  }

  private computeNextPollAfter(pollAttempts: number): Date {
    const delayMs = Math.min(
      BASE_POLL_DELAY_MS * 2 ** Math.max(0, pollAttempts),
      MAX_POLL_DELAY_MS,
    );
    return new Date(Date.now() + delayMs);
  }

  private isTerminalStatus(status: MediaGenerationJobEntity['status']): boolean {
    return (
      status === 'succeeded' || status === 'failed' || status === 'cancelled'
    );
  }

  private mapJob(
    job: MediaGenerationJobEntity,
    assets: MediaAssetEntity[],
  ): GatewayVideoGenerationJob {
    return {
      id: job.id,
      requestId: job.requestId,
      providerId: job.providerId,
      model: job.model,
      prompt: job.prompt,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      failedAt: job.failedAt?.toISOString(),
      cancelledAt: job.cancelledAt?.toISOString(),
      durationMs: this.computeJobDurationMs(job),
      error: job.errorMessage ?? undefined,
      request: this.mapStoredRequestPayload(job.requestPayload),
      outputs: assets
        .sort((left, right) => left.outputIndex - right.outputIndex)
        .map((asset) => this.mapAssetOutput(asset)),
      providerMetadata: job.providerMetadata ?? undefined,
    };
  }

  private mapAssetOutput(asset: MediaAssetEntity) {
    return {
      assetId: asset.id,
      contentUrl: `/api/v1/videos/assets/${asset.id}/content`,
      mimeType: asset.mimeType ?? undefined,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      durationSeconds:
        asset.durationSeconds !== null
          ? Number(asset.durationSeconds)
          : undefined,
      byteSize: asset.byteSize ?? undefined,
      saved: asset.isSaved,
      providerMetadata: asset.providerMetadata ?? undefined,
    };
  }

  private buildStoredRequestPayload(
    request: GatewayVideoGenerationRequest,
  ): GatewayVideoRetryRequest {
    return {
      providerId: request.providerId,
      model: request.model,
      prompt: request.prompt,
      durationSeconds: request.durationSeconds,
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
      size: request.size,
      generateAudio: request.generateAudio,
      seed: request.seed,
      frameImages: request.frameImages,
      referenceImages: request.referenceImages,
      providerOptions: request.providerOptions,
    };
  }

  private mapStoredRequestPayload(
    requestPayload: Record<string, unknown>,
  ): GatewayVideoRetryRequest | undefined {
    if (!requestPayload || typeof requestPayload !== 'object') {
      return undefined;
    }

    const payload = requestPayload as Partial<GatewayVideoRetryRequest>;
    if (!payload.prompt || typeof payload.prompt !== 'string') {
      return undefined;
    }

    return {
      providerId: payload.providerId,
      model: payload.model,
      prompt: payload.prompt,
      durationSeconds:
        typeof payload.durationSeconds === 'number'
          ? payload.durationSeconds
          : undefined,
      aspectRatio: payload.aspectRatio,
      resolution: payload.resolution,
      size: payload.size,
      generateAudio:
        typeof payload.generateAudio === 'boolean'
          ? payload.generateAudio
          : undefined,
      seed: typeof payload.seed === 'number' ? payload.seed : undefined,
      frameImages: Array.isArray(payload.frameImages)
        ? payload.frameImages
        : undefined,
      referenceImages: Array.isArray(payload.referenceImages)
        ? payload.referenceImages
        : undefined,
      providerOptions:
        payload.providerOptions &&
        typeof payload.providerOptions === 'object' &&
        !Array.isArray(payload.providerOptions)
          ? payload.providerOptions
          : undefined,
    };
  }

  private computeJobDurationMs(
    job: Pick<
      MediaGenerationJobEntity,
      'startedAt' | 'completedAt' | 'failedAt' | 'cancelledAt'
    >,
  ) {
    const terminal =
      job.completedAt ?? job.failedAt ?? job.cancelledAt ?? undefined;
    if (!job.startedAt || !terminal) {
      return undefined;
    }

    const durationMs = terminal.getTime() - job.startedAt.getTime();
    return durationMs >= 0 ? durationMs : undefined;
  }

  private async resolveUser(tenantId: string, emailHash: string) {
    const user = await this.userRepository.findOne({
      where: { emailHash, status: 'active' },
    });

    if (!user) {
      throw new NotFoundException('Authenticated gateway user was not found.');
    }

    const membership = await this.tenantMembershipRepository.findOne({
      where: {
        tenantId,
        userId: user.id,
      },
    });
    if (!membership) {
      throw new NotFoundException('Authenticated gateway user was not found.');
    }

    return user;
  }
}







