import type { ProviderModel } from '@lxp/provider-sdk';
import type {
  CanonicalImageProviderCatalog,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

export const XAI_IMAGE_MODEL_DESCRIPTORS = [
  {
    id: 'grok-imagine-image',
    displayName: 'Grok Imagine Image',
    lifecycleStatus: 'active',
    capabilities: buildXAiImageCapabilities(),
  },
  {
    id: 'grok-imagine-image-pro',
    displayName: 'Grok Imagine Image Pro',
    lifecycleStatus: 'active',
    capabilities: buildXAiImageCapabilities(),
  },
] as const satisfies readonly ImageModelDescriptor[];

const XAI_IMAGE_MODEL_MAP = new Map<string, ImageModelDescriptor>(
  XAI_IMAGE_MODEL_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]),
);

export function isXAiImageModel(modelId: string): boolean {
  return XAI_IMAGE_MODEL_MAP.has(modelId);
}

export function getXAiImageModelDescriptor(modelId: string) {
  return XAI_IMAGE_MODEL_MAP.get(modelId);
}

export function resolveXAiModelDisplayName(modelId: string): string {
  return XAI_IMAGE_MODEL_MAP.get(modelId)?.displayName ?? modelId;
}

export function resolveXAiModelCapabilities(modelId: string) {
  return (
    XAI_IMAGE_MODEL_MAP.get(modelId)?.capabilities ?? {
      supportsStreaming: true,
    }
  );
}

export function getXAiImageDefaultModelId() {
  return XAI_IMAGE_MODEL_DESCRIPTORS[0]?.id ?? null;
}

export function buildXAiModelCatalog(listedModelIds: string[]): ProviderModel[] {
  const listedModels = listedModelIds.map((modelId) => ({
    id: modelId,
    displayName: resolveXAiModelDisplayName(modelId),
    capabilities: resolveXAiModelCapabilities(modelId),
  }));
  const knownImageModels = XAI_IMAGE_MODEL_DESCRIPTORS.filter(
    (descriptor) => !listedModels.some((model) => model.id === descriptor.id),
  );

  return [...listedModels, ...knownImageModels];
}

export function buildXAiImageCatalog(
  models: ProviderModel[],
): CanonicalImageProviderCatalog {
  return {
    providerId: 'xai',
    defaultModelId: getXAiImageDefaultModelId(),
    models: models.filter(isImageCapableModel).map(toProviderModelDescriptor),
  };
}

function buildXAiImageCapabilities() {
  return {
    supportsStreaming: false,
    supportsImageGeneration: true,
    supportsImageEditing: true,
    supportedImageAspectRatios: [
      {
        value: 'auto',
        label: 'Auto',
        useCase: 'Model auto-selects the best ratio for the prompt.',
      },
      {
        value: '1:1',
        label: '1:1',
        useCase: 'Social media, thumbnails',
      },
      {
        value: '16:9',
        label: '16:9',
        useCase: 'Widescreen, mobile, stories',
      },
      {
        value: '9:16',
        label: '9:16',
        useCase: 'Widescreen, mobile, stories',
      },
      {
        value: '4:3',
        label: '4:3',
        useCase: 'Presentations, portraits',
      },
      {
        value: '3:4',
        label: '3:4',
        useCase: 'Presentations, portraits',
      },
      {
        value: '3:2',
        label: '3:2',
        useCase: 'Photography',
      },
      {
        value: '2:3',
        label: '2:3',
        useCase: 'Photography',
      },
      {
        value: '2:1',
        label: '2:1',
        useCase: 'Banners, headers',
      },
      {
        value: '1:2',
        label: '1:2',
        useCase: 'Banners, headers',
      },
      {
        value: '19.5:9',
        label: '19.5:9',
        useCase: 'Modern smartphone displays',
      },
      {
        value: '9:19.5',
        label: '9:19.5',
        useCase: 'Modern smartphone displays',
      },
      {
        value: '20:9',
        label: '20:9',
        useCase: 'Ultra-wide displays',
      },
      {
        value: '9:20',
        label: '9:20',
        useCase: 'Ultra-wide displays',
      },
    ],
    supportedImageResponseFormats: ['url', 'b64_json'] as Array<'url' | 'b64_json'>,
    supportedImageResolutions: [
      { value: '1k', label: '1k' },
      { value: '2k', label: '2k' },
    ],
    maxGeneratedImagesPerRequest: 4,
    maxReferenceImagesPerRequest: 5,
    imageDefaults: {
      aspectRatio: 'auto',
      responseFormat: 'url',
      resolution: '1k',
      imageCount: 1,
    } as const,
  };
}

function isImageCapableModel(model: ProviderModel) {
  return Boolean(model.capabilities) &&
    (model.capabilities?.supportsImageGeneration ||
      model.capabilities?.supportsImageEditing);
}

function toProviderModelDescriptor(
  model: ProviderModel,
): ImageModelDescriptor {
  return {
    id: model.id,
    displayName: model.displayName,
    lifecycleStatus: XAI_IMAGE_MODEL_MAP.get(model.id)?.lifecycleStatus ?? 'active',
    capabilities: {
      supportsStreaming: model.capabilities?.supportsStreaming ?? true,
      ...(model.capabilities ?? {}),
    },
  };
}
