import type { ProviderModel } from '@lxp/provider-sdk';
import type {
  CanonicalImageProviderCatalog,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

export const GOOGLE_IMAGE_MODEL_DESCRIPTORS = [
  {
    id: 'gemini-2.5-flash-image',
    displayName: 'Nano Banana',
    lifecycleStatus: 'active',
    capabilities: buildGoogleImageCapabilities([{ value: '1K', label: '1K' }]),
  },
  {
    id: 'gemini-3-pro-image-preview',
    displayName: 'Nano Banana Pro',
    lifecycleStatus: 'preview',
    capabilities: buildGoogleImageCapabilities(
      [
        { value: '1K', label: '1K' },
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' },
      ],
      14,
    ),
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    displayName: 'Nano Banana 2',
    lifecycleStatus: 'preview',
    capabilities: buildGoogleImageCapabilities([
      { value: '512', label: '512' },
      { value: '1K', label: '1K' },
      { value: '2K', label: '2K' },
      { value: '4K', label: '4K' },
    ]),
  },
] as const satisfies readonly ImageModelDescriptor[];

const GOOGLE_IMAGE_MODEL_MAP = new Map<string, ImageModelDescriptor>(
  GOOGLE_IMAGE_MODEL_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]),
);

export function isGoogleImageModel(modelId: string): boolean {
  return GOOGLE_IMAGE_MODEL_MAP.has(modelId);
}

export function getGoogleImageModelDescriptor(modelId: string) {
  return GOOGLE_IMAGE_MODEL_MAP.get(modelId);
}

export function resolveGoogleModelDisplayName(modelId: string): string {
  return GOOGLE_IMAGE_MODEL_MAP.get(modelId)?.displayName ?? modelId;
}

export function resolveGoogleModelCapabilities(modelId: string) {
  return (
    GOOGLE_IMAGE_MODEL_MAP.get(modelId)?.capabilities ?? {
      supportsStreaming: true,
    }
  );
}

export function getGoogleImageDefaultModelId() {
  return GOOGLE_IMAGE_MODEL_DESCRIPTORS[0]?.id ?? null;
}

export function buildGoogleModelCatalog(listedModelIds: string[]): ProviderModel[] {
  const listedModels = listedModelIds.map((modelId) => ({
    id: modelId,
    displayName: resolveGoogleModelDisplayName(modelId),
    capabilities: resolveGoogleModelCapabilities(modelId),
  }));
  const knownImageModels = GOOGLE_IMAGE_MODEL_DESCRIPTORS.filter(
    (descriptor) => !listedModels.some((model) => model.id === descriptor.id),
  );

  return [...listedModels, ...knownImageModels];
}

export function buildGoogleImageCatalog(
  models: ProviderModel[],
): CanonicalImageProviderCatalog {
  return {
    providerId: 'google',
    defaultModelId: getGoogleImageDefaultModelId(),
    models: models.filter(isImageCapableModel).map(toProviderModelDescriptor),
  };
}

function buildGoogleImageCapabilities(
  supportedImageResolutions: Array<{ value: string; label: string }>,
  maxReferenceImagesPerRequest?: number,
) {
  return {
    supportsStreaming: false,
    supportsImageGeneration: true,
    supportsImageEditing: true,
    supportedImageAspectRatios: [
      { value: '1:1', label: '1:1', useCase: 'Square assets and social posts' },
      { value: '2:3', label: '2:3', useCase: 'Portrait photography' },
      { value: '3:2', label: '3:2', useCase: 'Landscape photography' },
      { value: '3:4', label: '3:4', useCase: 'Portrait layouts' },
      { value: '4:3', label: '4:3', useCase: 'Presentations and illustrations' },
      { value: '4:5', label: '4:5', useCase: 'Tall social formats' },
      { value: '5:4', label: '5:4', useCase: 'Product and editorial crops' },
      { value: '9:16', label: '9:16', useCase: 'Stories and vertical mobile' },
      { value: '16:9', label: '16:9', useCase: 'Widescreen and banners' },
      { value: '21:9', label: '21:9', useCase: 'Ultra-wide hero visuals' },
    ],
    supportedImageResponseFormats: ['b64_json'] as Array<'url' | 'b64_json'>,
    supportedImageResolutions: [...supportedImageResolutions],
    imageDefaults: {
      responseFormat: 'b64_json',
      resolution: supportedImageResolutions[0]?.value,
      aspectRatio: '1:1',
      imageCount: 1,
    } as const,
    ...(typeof maxReferenceImagesPerRequest === 'number'
      ? { maxReferenceImagesPerRequest }
      : {}),
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
    lifecycleStatus:
      GOOGLE_IMAGE_MODEL_MAP.get(model.id)?.lifecycleStatus ?? 'active',
    capabilities: {
      supportsStreaming: model.capabilities?.supportsStreaming ?? true,
      ...(model.capabilities ?? {}),
    },
  };
}
