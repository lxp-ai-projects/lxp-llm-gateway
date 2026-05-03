import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  GatewayGeneratedImage,
  GatewayImageAssetListResponse,
  GatewayImageAssetSaveRequest,
  GatewayImageAssetSummary,
  GatewayImageAssetUploadRequest,
  GatewayImageAssetUploadResponse,
  GatewayImageAssetUpdateRequest,
  GatewayImageCatalogResponse,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
  GatewayImageHistoryResponse,
  GatewayImageReference,
} from '@lxp/contracts';
import {
  fetchPublicImageReferenceAsDataUrl,
  parseDataUrlReference,
} from '@lxp/provider-sdk';
import { Repository } from 'typeorm';

import type { GatewayAuthContext } from '../auth/auth.types';
import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { ImageJobEntity } from '../persistence/entities/image-job.entity';
import { ImageJobResultEntity } from '../persistence/entities/image-job-result.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { ProviderCredentialService } from '../gateway/provider-credential.service';
import { ProviderRegistryService } from '../gateway/provider-registry.service';
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
import { TenantProviderConfigurationService } from '../gateway/tenant-provider-configuration.service';

const GATEWAY_IMAGE_ASSET_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const GATEWAY_MAX_IMAGE_ASSET_BYTES = Number(
  process.env.GATEWAY_MAX_IMAGE_ASSET_BYTES ?? String(20 * 1024 * 1024),
);
const IMAGE_HISTORY_PAGE_SIZE = 10;

@Injectable()
export class ImageApplicationService {
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
  ) {}

  async getCatalog(
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageCatalogResponse> {
    this.integrationClientScopeService.assertScope(
      authContext,
      'models:list',
    );
    const activeProviders = await this.providerRepository.find({
      where: { status: 'active' },
      order: { displayName: 'ASC' },
    });

    const providers: GatewayImageCatalogResponse['providers'] = [];
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
        !provider.listImageCatalog ||
        (!provider.capabilities.imageGeneration &&
          !provider.capabilities.imageEditing)
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
        const catalog = await provider.listImageCatalog({
          requestId: crypto.randomUUID(),
          userId: authContext.userId,
          providerAccess,
        });

        const filteredProvider =
          await this.tenantModelAccessRuleService.filterImageCatalogProvider(
            authContext.activeTenantId,
            {
              providerId: provider.providerId,
              displayName: providerEntity.displayName,
              defaultModelId:
                configuration.defaultImageModel ?? catalog.defaultModelId,
              models: catalog.models.map((model) => ({
                id: model.id,
                displayName: model.displayName,
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

  async generateImage(
    request: GatewayImageGenerationRequest,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageGenerationResponse> {
    this.integrationClientScopeService.assertScope(
      authContext,
      'image:generate',
    );
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const configuration =
      await this.tenantProviderConfigurationService.assertProviderEnabled(
        authContext.activeTenantId,
        providerId,
      );
    const model = this.tenantProviderConfigurationService.resolveImageModel(
      request.model,
      providerId,
      authContext,
      configuration,
    );
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider.capabilities.imageGeneration || !provider.generateImage) {
      throw new NotFoundException(
        `Provider ${provider.providerId} does not support image generation.`,
      );
    }

    const startedAt = new Date();
    try {
      const requestId = crypto.randomUUID();
      await this.tenantModelAccessRuleService.assertImageModelAllowed({
        tenantId: authContext.activeTenantId,
        providerId,
        model,
        imageCount: request.n,
        resolution: request.resolution,
      });
      await this.tenantPolicyService?.assertImageRequestAllowed({
        tenantId: authContext.activeTenantId,
        providerId,
        model,
      });
      const { providerAccess, credentialScopeUsed } =
        await this.providerCredentialService.resolveProviderAccessWithSource(
          authContext,
          provider.providerId,
        );
      const providerResponse = await provider.generateImage(
        { ...request, providerId, model },
        {
          requestId,
          userId: authContext.userId,
          providerAccess,
        },
      );
      const latencyMs = Date.now() - startedAt.getTime();
      await this.gatewayTelemetryService.recordImageSuccess({
        authContext,
        requestId,
        providerId: provider.providerId,
        model,
        operation: 'image_generation',
        route: '/api/v1/images/generations',
        latencyMs,
        promptLength: request.prompt.length,
        credentialScopeUsed,
        response: providerResponse,
      });
      return this.persistImageJob(
        authContext.activeTenantId,
        user.id,
        providerResponse,
        request.prompt,
        'generation',
        startedAt,
      );
    } catch (error) {
      const requestId = crypto.randomUUID();
      if (
        error instanceof ModelAccessPolicyException ||
        error instanceof ModelAccessLimitException
      ) {
        await this.gatewayTelemetryService.recordBlockedByPolicy({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          operation: 'image_generation',
          capability: 'image',
          route: '/api/v1/images/generations',
          latencyMs: Date.now() - startedAt.getTime(),
          error: error instanceof Error ? error.message : 'Policy blocked request.',
          errorCode:
            error instanceof ModelAccessPolicyException
              ? 'model_access_denied'
              : 'model_access_limit',
          metadata: {
            promptLength: request.prompt.length,
          },
        });
        throw error;
      }
      if (error instanceof TenantPolicyLimitException) {
        await this.gatewayTelemetryService.recordBlockedByQuota({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          operation: 'image_generation',
          capability: 'image',
          route: '/api/v1/images/generations',
          latencyMs: Date.now() - startedAt.getTime(),
          error: error instanceof Error ? error.message : 'Policy blocked request.',
          errorCode: error.errorCode,
          metadata: {
            promptLength: request.prompt.length,
            ...(error.metadata ?? {}),
          },
        });
        throw error;
      }
      await this.gatewayTelemetryService.recordImageFailure({
        authContext,
        requestId,
        providerId: provider.providerId,
        model,
        operation: 'image_generation',
        route: '/api/v1/images/generations',
        latencyMs: Date.now() - startedAt.getTime(),
        promptLength: request.prompt.length,
        errorCode:
          error instanceof ModelAccessLimitException
            ? 'model_access_limit'
            : 'gateway_error',
        error: error instanceof Error ? error.message : 'Unknown gateway error.',
      });
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async editImage(
    request: GatewayImageEditRequest,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageGenerationResponse> {
    this.integrationClientScopeService.assertScope(authContext, 'image:edit');
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const configuration =
      await this.tenantProviderConfigurationService.assertProviderEnabled(
        authContext.activeTenantId,
        providerId,
      );
    const model = this.tenantProviderConfigurationService.resolveImageModel(
      request.model,
      providerId,
      authContext,
      configuration,
    );
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider.capabilities.imageEditing || !provider.editImage) {
      throw new NotFoundException(
        `Provider ${provider.providerId} does not support image editing.`,
      );
    }

    const startedAt = new Date();
    try {
      const requestId = crypto.randomUUID();
      await this.tenantModelAccessRuleService.assertImageModelAllowed({
        tenantId: authContext.activeTenantId,
        providerId,
        model,
        imageCount: request.n,
        resolution: request.resolution,
      });
      await this.tenantPolicyService?.assertImageRequestAllowed({
        tenantId: authContext.activeTenantId,
        providerId,
        model,
      });
      const { providerAccess, credentialScopeUsed } =
        await this.providerCredentialService.resolveProviderAccessWithSource(
          authContext,
          provider.providerId,
        );
      const resolvedImages = await this.resolveGatewayReferences(
        request.images,
        authContext.activeTenantId,
        user.id,
      );
      const providerResponse = await provider.editImage(
        { ...request, providerId, model, images: resolvedImages },
        {
          requestId,
          userId: authContext.userId,
          providerAccess,
        },
      );
      const latencyMs = Date.now() - startedAt.getTime();
      await this.gatewayTelemetryService.recordImageSuccess({
        authContext,
        requestId,
        providerId: provider.providerId,
        model,
        operation: 'image_edit',
        route: '/api/v1/images/edits',
        latencyMs,
        promptLength: request.prompt.length,
        credentialScopeUsed,
        response: providerResponse,
      });
      return this.persistImageJob(
        authContext.activeTenantId,
        user.id,
        providerResponse,
        request.prompt,
        'edit',
        startedAt,
      );
    } catch (error) {
      const requestId = crypto.randomUUID();
      if (
        error instanceof ModelAccessPolicyException ||
        error instanceof ModelAccessLimitException
      ) {
        await this.gatewayTelemetryService.recordBlockedByPolicy({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          operation: 'image_edit',
          capability: 'image',
          route: '/api/v1/images/edits',
          latencyMs: Date.now() - startedAt.getTime(),
          error: error instanceof Error ? error.message : 'Policy blocked request.',
          errorCode:
            error instanceof ModelAccessPolicyException
              ? 'model_access_denied'
              : 'model_access_limit',
          metadata: {
            promptLength: request.prompt.length,
          },
        });
        throw error;
      }
      if (error instanceof TenantPolicyLimitException) {
        await this.gatewayTelemetryService.recordBlockedByQuota({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          operation: 'image_edit',
          capability: 'image',
          route: '/api/v1/images/edits',
          latencyMs: Date.now() - startedAt.getTime(),
          error: error instanceof Error ? error.message : 'Policy blocked request.',
          errorCode: error.errorCode,
          metadata: {
            promptLength: request.prompt.length,
            ...(error.metadata ?? {}),
          },
        });
        throw error;
      }
      await this.gatewayTelemetryService.recordImageFailure({
        authContext,
        requestId,
        providerId: provider.providerId,
        model,
        operation: 'image_edit',
        route: '/api/v1/images/edits',
        latencyMs: Date.now() - startedAt.getTime(),
        promptLength: request.prompt.length,
        errorCode:
          error instanceof ModelAccessLimitException
            ? 'model_access_limit'
            : 'gateway_error',
        error: error instanceof Error ? error.message : 'Unknown gateway error.',
      });
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async uploadAsset(
    request: GatewayImageAssetUploadRequest,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageAssetUploadResponse> {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const parsedDataUrl = parseDataUrlReference(request.dataUrl);
    const dataBytes = Buffer.byteLength(parsedDataUrl.dataBase64, 'base64');
    const contentHash = this.computeImageContentHash(parsedDataUrl.dataBase64);

    if (!GATEWAY_IMAGE_ASSET_MIME_TYPES.has(parsedDataUrl.mimeType)) {
      throw new BadRequestException(
        'Uploaded image assets must use a supported image MIME type.',
      );
    }

    if (dataBytes > GATEWAY_MAX_IMAGE_ASSET_BYTES) {
      throw new BadRequestException(
        `Uploaded image assets must be ${GATEWAY_MAX_IMAGE_ASSET_BYTES} bytes or smaller.`,
      );
    }

    const existingAsset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).findOne({
          where: {
            userId: user.id,
            tenantId: authContext.activeTenantId,
            sourceType: 'upload',
            contentHash,
          },
        }),
    );

    if (existingAsset) {
      return {
        asset: this.mapAssetSummary(existingAsset),
      };
    }

    const asset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).save({
          tenantId: authContext.activeTenantId,
          userId: user.id,
          sourceType: 'upload',
          label: request.label?.trim() || null,
          mimeType: parsedDataUrl.mimeType,
          dataUrl: request.dataUrl,
          contentHash,
          originalUrl: null,
          isSaved: false,
        }),
    );

    return {
      asset: this.mapAssetSummary(asset),
    };
  }

  async listAssets(
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageAssetListResponse> {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const assets = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).find({
          where: {
            tenantId: authContext.activeTenantId,
            userId: user.id,
            sourceType: 'upload',
          },
          order: { createdAt: 'DESC' },
        }),
    );

    return {
      items: assets.map((asset) => this.mapAssetSummary(asset)),
    };
  }

  async listHistory(
    page: number,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageHistoryResponse> {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const { jobs, totalItems, jobResults, assets } =
      await this.tenantRlsService.withTenantContext(
        authContext.activeTenantId,
        async (manager) => {
          const imageJobRepository = manager.getRepository(ImageJobEntity);
          const imageJobResultRepository =
            manager.getRepository(ImageJobResultEntity);
          const imageAssetRepository = manager.getRepository(ImageAssetEntity);
          const [jobs, totalItems] = await imageJobRepository.findAndCount({
            where: {
              tenantId: authContext.activeTenantId,
              userId: user.id,
            },
            order: { createdAt: 'DESC' },
            skip: (safePage - 1) * IMAGE_HISTORY_PAGE_SIZE,
            take: IMAGE_HISTORY_PAGE_SIZE,
          });

          const jobIds = jobs.map((job) => job.id);
          const jobResults = jobIds.length
            ? await imageJobResultRepository.find({
                where: jobIds.map((jobId) => ({
                  jobId,
                  tenantId: authContext.activeTenantId,
                })),
                order: { resultIndex: 'ASC' },
              })
            : [];
          const assetIds = jobResults.map((jobResult) => jobResult.assetId);
          const assets = assetIds.length
            ? await imageAssetRepository.find({
                where: assetIds.map((id) => ({
                  id,
                  tenantId: authContext.activeTenantId,
                  userId: user.id,
                })),
              })
            : [];

          return { jobs, totalItems, jobResults, assets };
        },
      );
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const resultsByJobId = new Map<string, ImageJobResultEntity[]>();

    for (const result of jobResults) {
      const results = resultsByJobId.get(result.jobId);
      if (results) {
        results.push(result);
      } else {
        resultsByJobId.set(result.jobId, [result]);
      }
    }

    return {
      items: jobs.map((job) => ({
        id: job.id,
        requestId: job.requestId,
        providerId: job.providerId,
        model: job.model,
        prompt: job.prompt,
        mode: job.mode,
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        createdAt: job.createdAt.toISOString(),
        durationMs: this.computeJobDurationMs(job),
        providerMetadata: job.providerMetadata ?? undefined,
        images: (resultsByJobId.get(job.id) ?? []).reduce<
          GatewayImageHistoryResponse['items'][number]['images']
        >((items, result) => {
            const asset = assetMap.get(result.assetId);
            if (!asset) {
              return items;
            }

            items.push({
              ...this.mapAssetSummary(asset),
              revisedPrompt: result.revisedPrompt ?? undefined,
              providerMetadata: result.providerMetadata ?? undefined,
            });
            return items;
          }, []),
      })),
      page: safePage,
      pageSize: IMAGE_HISTORY_PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / IMAGE_HISTORY_PAGE_SIZE)),
    };
  }

  async setAssetSaved(
    assetId: string,
    request: GatewayImageAssetSaveRequest,
    authContext: GatewayAuthContext,
  ) {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const asset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).findOne({
          where: {
            id: assetId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );

    if (!asset) {
      throw new NotFoundException('Image asset not found.');
    }

    asset.isSaved = request.saved;
    const savedAsset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) => manager.getRepository(ImageAssetEntity).save(asset),
    );
    return {
      asset: this.mapAssetSummary(savedAsset),
    };
  }

  async updateAsset(
    assetId: string,
    request: GatewayImageAssetUpdateRequest,
    authContext: GatewayAuthContext,
  ) {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const asset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).findOne({
          where: {
            id: assetId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );

    if (!asset) {
      throw new NotFoundException('Image asset not found.');
    }

    if (asset.sourceType !== 'upload') {
      throw new BadRequestException('Only uploaded reference assets can be renamed.');
    }

    asset.label = request.label.trim();
    const savedAsset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) => manager.getRepository(ImageAssetEntity).save(asset),
    );
    return {
      asset: this.mapAssetSummary(savedAsset),
    };
  }

  async deleteAsset(assetId: string, authContext: GatewayAuthContext) {
    const user = await this.resolveUser(
      authContext.activeTenantId,
      authContext.emailHash,
    );
    const asset = await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).findOne({
          where: {
            id: assetId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );

    if (!asset) {
      throw new NotFoundException('Image asset not found.');
    }

    if (asset.sourceType !== 'upload') {
      throw new BadRequestException('Only uploaded reference assets can be deleted.');
    }

    await this.tenantRlsService.withTenantContext(
      authContext.activeTenantId,
      async (manager) =>
        manager.getRepository(ImageAssetEntity).delete({
          id: asset.id,
          tenantId: authContext.activeTenantId,
          userId: user.id,
        }),
    );
    return { deleted: true as const };
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
        manager.getRepository(ImageAssetEntity).findOne({
          where: {
            id: assetId,
            tenantId: authContext.activeTenantId,
            userId: user.id,
          },
        }),
    );

    if (!asset) {
      throw new NotFoundException('Image asset not found.');
    }

    const parsedDataUrl = parseDataUrlReference(asset.dataUrl, asset.mimeType ?? undefined);
    return {
      mimeType: parsedDataUrl.mimeType,
      data: Buffer.from(parsedDataUrl.dataBase64, 'base64'),
    };
  }

  private async persistImageJob(
    tenantId: string,
    userId: string,
    providerResponse: GatewayImageGenerationResponse,
    prompt: string,
    mode: 'generation' | 'edit',
    startedAt: Date,
  ): Promise<GatewayImageGenerationResponse> {
    return this.tenantRlsService.withTenantContext(tenantId, async (manager) => {
      const imageJobRepository = manager.getRepository(ImageJobEntity);
      const imageJobResultRepository = manager.getRepository(ImageJobResultEntity);
      const imageAssetRepository = manager.getRepository(ImageAssetEntity);
      const job = await imageJobRepository.save({
        tenantId,
        userId,
        requestId: providerResponse.requestId,
        providerId: providerResponse.providerId,
        model: providerResponse.model,
        prompt,
        mode,
        startedAt,
        completedAt: null,
        providerMetadata: providerResponse.providerMetadata ?? null,
      } as ImageJobEntity);

      const images: GatewayGeneratedImage[] = [];
      for (const [index, image] of providerResponse.images.entries()) {
        const storedAsset = await this.persistGeneratedAsset(
          imageAssetRepository,
          tenantId,
          userId,
          image,
          index,
        );
        await imageJobResultRepository.save({
          tenantId,
          jobId: job.id,
          assetId: storedAsset.id,
          resultIndex: index,
          revisedPrompt: image.revisedPrompt ?? null,
          providerMetadata: image.providerMetadata ?? null,
        } as ImageJobResultEntity);
        images.push({
          ...image,
          assetId: storedAsset.id,
          contentUrl: this.buildAssetContentPath(storedAsset.id),
          mimeType: storedAsset.mimeType ?? image.mimeType,
          saved: storedAsset.isSaved,
        });
      }

      job.completedAt = new Date();
      await imageJobRepository.save(job);

      return {
        ...providerResponse,
        jobId: job.id,
        images,
      };
    });
  }

  private async persistGeneratedAsset(
    imageAssetRepository: Repository<ImageAssetEntity>,
    tenantId: string,
    userId: string,
    image: GatewayGeneratedImage,
    index: number,
  ) {
    const dataUrl = image.b64Json
      ? this.buildDataUrl(image.b64Json, image.mimeType)
      : image.url
        ? (
            await fetchPublicImageReferenceAsDataUrl(image.url, {
              allowedMimeTypes: GATEWAY_IMAGE_ASSET_MIME_TYPES,
              fetchWithTimeout: (url, init, timeoutMs) =>
                this.fetchWithTimeout(url, init, timeoutMs),
              lookupHostname: undefined,
              maxBytes: GATEWAY_MAX_IMAGE_ASSET_BYTES,
              timeoutMs: 30000,
            })
          ).url
        : null;

    if (!dataUrl) {
      throw new BadRequestException(
        `Generated image ${index + 1} did not include storable content.`,
      );
    }

    const parsedDataUrl = parseDataUrlReference(dataUrl, image.mimeType);
    return imageAssetRepository.save({
      tenantId,
      userId,
      sourceType: 'generated',
      label: `Generated image ${index + 1}`,
      mimeType: parsedDataUrl.mimeType,
      dataUrl,
      contentHash: this.computeImageContentHash(parsedDataUrl.dataBase64),
      originalUrl: image.url ?? null,
      isSaved: false,
    } as ImageAssetEntity);
  }

  private async resolveGatewayReferences(
    images: GatewayImageReference[],
    tenantId: string,
    userId: string,
  ): Promise<GatewayImageReference[]> {
    return this.tenantRlsService.withTenantContext(tenantId, async (manager) =>
      Promise.all(
        images.map(async (image) => {
          if (image.type !== 'asset') {
            return image;
          }

          const asset = await manager.getRepository(ImageAssetEntity).findOne({
            where: { id: image.assetId, tenantId, userId },
          });
          if (!asset) {
            throw new NotFoundException(`Reference asset ${image.assetId} was not found.`);
          }

          return {
            type: 'data_url' as const,
            url: asset.dataUrl,
            mimeType: asset.mimeType ?? undefined,
          };
        }),
      ),
    );
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

  private resolveProviderId(
    requestedProviderId: GatewayImageGenerationRequest['providerId'],
    authContext: GatewayAuthContext,
  ) {
    if (requestedProviderId) {
      return requestedProviderId;
    }

    if (authContext.defaultImageProviderId) {
      return authContext.defaultImageProviderId;
    }

    throw new BadRequestException(
      'No provider was supplied and no default image provider is configured for the authenticated user.',
    );
  }
  private mapAssetSummary(asset: ImageAssetEntity): GatewayImageAssetSummary {
    return {
      id: asset.id,
      label: asset.label,
      mimeType: asset.mimeType,
      contentUrl: this.buildAssetContentPath(asset.id),
      sourceType: asset.sourceType,
      saved: asset.isSaved,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private buildAssetContentPath(assetId: string) {
    return `/api/v1/images/assets/${assetId}/content`;
  }

  private buildDataUrl(dataBase64: string, mimeType?: string) {
    return `data:${mimeType ?? 'image/png'};base64,${dataBase64}`;
  }

  private computeJobDurationMs(job: Pick<ImageJobEntity, 'startedAt' | 'completedAt'>) {
    if (!job.startedAt || !job.completedAt) {
      return undefined;
    }

    const durationMs = job.completedAt.getTime() - job.startedAt.getTime();
    return durationMs >= 0 ? durationMs : undefined;
  }

  private computeImageContentHash(dataBase64: string) {
    return createHash('sha256')
      .update(Buffer.from(dataBase64, 'base64'))
      .digest('hex');
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number | null,
  ): Promise<Response> {
    if (timeoutMs === null || timeoutMs <= 0) {
      return fetch(url, init);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
