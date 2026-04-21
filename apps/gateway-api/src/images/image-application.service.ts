import { Buffer } from 'node:buffer';

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  GatewayGeneratedImage,
  GatewayImageAssetSaveRequest,
  GatewayImageAssetSummary,
  GatewayImageAssetUploadRequest,
  GatewayImageAssetUploadResponse,
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
import { UserEntity } from '../persistence/entities/user.entity';
import { ProviderCredentialService } from '../gateway/provider-credential.service';
import { ProviderRegistryService } from '../gateway/provider-registry.service';

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
    @InjectRepository(ImageAssetEntity)
    private readonly imageAssetRepository: Repository<ImageAssetEntity>,
    @InjectRepository(ImageJobEntity)
    private readonly imageJobRepository: Repository<ImageJobEntity>,
    @InjectRepository(ImageJobResultEntity)
    private readonly imageJobResultRepository: Repository<ImageJobResultEntity>,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
  ) {}

  async getCatalog(
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageCatalogResponse> {
    const activeProviders = await this.providerRepository.find({
      where: { status: 'active' },
      order: { displayName: 'ASC' },
    });

    const providers: GatewayImageCatalogResponse['providers'] = [];
    for (const providerEntity of activeProviders) {
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
          await this.providerCredentialService.resolveProviderAccess(
            authContext.emailHash,
            provider.providerId,
          );
        const catalog = await provider.listImageCatalog({
          requestId: crypto.randomUUID(),
          userId: authContext.userId,
          providerAccess,
        });

        providers.push({
          providerId: provider.providerId,
          displayName: providerEntity.displayName,
          defaultModelId: catalog.defaultModelId,
          models: catalog.models.map((model) => ({
            id: model.id,
            displayName: model.displayName,
            capabilities: model.capabilities,
          })),
        });
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
    const user = await this.resolveUser(authContext.emailHash);
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const model = this.resolveModel(request.model, providerId, authContext);
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider.capabilities.imageGeneration || !provider.generateImage) {
      throw new NotFoundException(
        `Provider ${provider.providerId} does not support image generation.`,
      );
    }

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext.emailHash,
          provider.providerId,
        );
      const providerResponse = await provider.generateImage(
        { ...request, providerId, model },
        {
          requestId: crypto.randomUUID(),
          userId: authContext.userId,
          providerAccess,
        },
      );

      return this.persistImageJob(user.id, providerResponse, request.prompt, 'generation');
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async editImage(
    request: GatewayImageEditRequest,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageGenerationResponse> {
    const user = await this.resolveUser(authContext.emailHash);
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const model = this.resolveModel(request.model, providerId, authContext);
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider.capabilities.imageEditing || !provider.editImage) {
      throw new NotFoundException(
        `Provider ${provider.providerId} does not support image editing.`,
      );
    }

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext.emailHash,
          provider.providerId,
        );
      const resolvedImages = await this.resolveGatewayReferences(
        request.images,
        user.id,
      );
      const providerResponse = await provider.editImage(
        { ...request, providerId, model, images: resolvedImages },
        {
          requestId: crypto.randomUUID(),
          userId: authContext.userId,
          providerAccess,
        },
      );

      return this.persistImageJob(user.id, providerResponse, request.prompt, 'edit');
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async uploadAsset(
    request: GatewayImageAssetUploadRequest,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageAssetUploadResponse> {
    const user = await this.resolveUser(authContext.emailHash);
    const parsedDataUrl = parseDataUrlReference(request.dataUrl);
    const asset = await this.imageAssetRepository.save({
      userId: user.id,
      sourceType: 'upload',
      label: request.label?.trim() || null,
      mimeType: parsedDataUrl.mimeType,
      dataUrl: request.dataUrl,
      originalUrl: null,
      isSaved: false,
    });

    return {
      asset: this.mapAssetSummary(asset),
    };
  }

  async listHistory(
    page: number,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageHistoryResponse> {
    const user = await this.resolveUser(authContext.emailHash);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const [jobs, totalItems] = await this.imageJobRepository.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * IMAGE_HISTORY_PAGE_SIZE,
      take: IMAGE_HISTORY_PAGE_SIZE,
    });

    const jobIds = jobs.map((job) => job.id);
    const jobResults = jobIds.length
      ? await this.imageJobResultRepository.find({
          where: jobIds.map((jobId) => ({ jobId })),
          order: { resultIndex: 'ASC' },
        })
      : [];
    const assetIds = jobResults.map((jobResult) => jobResult.assetId);
    const assets = assetIds.length
      ? await this.imageAssetRepository.find({
          where: assetIds.map((id) => ({ id, userId: user.id })),
        })
      : [];
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
        createdAt: job.createdAt.toISOString(),
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
    const user = await this.resolveUser(authContext.emailHash);
    const asset = await this.imageAssetRepository.findOne({
      where: { id: assetId, userId: user.id },
    });

    if (!asset) {
      throw new NotFoundException('Image asset not found.');
    }

    asset.isSaved = request.saved;
    const savedAsset = await this.imageAssetRepository.save(asset);
    return {
      asset: this.mapAssetSummary(savedAsset),
    };
  }

  async getAssetContent(
    assetId: string,
    authContext: GatewayAuthContext,
  ): Promise<{ mimeType: string; data: Buffer }> {
    const user = await this.resolveUser(authContext.emailHash);
    const asset = await this.imageAssetRepository.findOne({
      where: { id: assetId, userId: user.id },
    });

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
    userId: string,
    providerResponse: GatewayImageGenerationResponse,
    prompt: string,
    mode: 'generation' | 'edit',
  ): Promise<GatewayImageGenerationResponse> {
    const job = await this.imageJobRepository.save({
      userId,
      requestId: providerResponse.requestId,
      providerId: providerResponse.providerId,
      model: providerResponse.model,
      prompt,
      mode,
    } as ImageJobEntity);

    const images: GatewayGeneratedImage[] = [];
    for (const [index, image] of providerResponse.images.entries()) {
      const storedAsset = await this.persistGeneratedAsset(userId, image, index);
      await this.imageJobResultRepository.save({
        jobId: job.id,
        assetId: storedAsset.id,
        resultIndex: index,
        revisedPrompt: image.revisedPrompt ?? null,
      } as ImageJobResultEntity);
      images.push({
        ...image,
        assetId: storedAsset.id,
        contentUrl: this.buildAssetContentPath(storedAsset.id),
        mimeType: storedAsset.mimeType ?? image.mimeType,
        saved: storedAsset.isSaved,
      });
    }

    return {
      ...providerResponse,
      jobId: job.id,
      images,
    };
  }

  private async persistGeneratedAsset(
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
    return this.imageAssetRepository.save({
      userId,
      sourceType: 'generated',
      label: `Generated image ${index + 1}`,
      mimeType: parsedDataUrl.mimeType,
      dataUrl,
      originalUrl: image.url ?? null,
      isSaved: false,
    } as ImageAssetEntity);
  }

  private async resolveGatewayReferences(
    images: GatewayImageReference[],
    userId: string,
  ): Promise<GatewayImageReference[]> {
    return Promise.all(
      images.map(async (image) => {
        if (image.type !== 'asset') {
          return image;
        }

        const asset = await this.imageAssetRepository.findOne({
          where: { id: image.assetId, userId },
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
    );
  }

  private async resolveUser(emailHash: string) {
    const user = await this.userRepository.findOne({
      where: { emailHash, status: 'active' },
    });

    if (!user) {
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

    if (authContext.defaultProviderId) {
      return authContext.defaultProviderId;
    }

    throw new BadRequestException(
      'No provider was supplied and no default provider is configured for the authenticated user.',
    );
  }

  private resolveModel(
    requestedModel: string | undefined,
    providerId: string,
    authContext: GatewayAuthContext,
  ) {
    if (requestedModel) {
      return requestedModel;
    }

    if (authContext.defaultProviderId === providerId && authContext.defaultModel) {
      return authContext.defaultModel;
    }

    throw new BadRequestException(
      'No model was supplied and no default model is configured for the selected provider.',
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
