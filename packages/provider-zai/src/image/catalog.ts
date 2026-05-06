import type {
  CanonicalImageProviderCatalog,
  ImageModelDescriptor,
  ProviderModel,
} from '@lxp/provider-sdk';

const ZAI_TEXT_MODEL_METADATA = new Map<
  string,
  { displayName: string; supportsStreaming?: boolean }
>([
  ['glm-5.1', { displayName: 'GLM-5.1', supportsStreaming: true }],
  ['glm-5', { displayName: 'GLM-5', supportsStreaming: true }],
  ['glm-5-turbo', { displayName: 'GLM-5 Turbo', supportsStreaming: true }],
  ['glm-4.7', { displayName: 'GLM-4.7', supportsStreaming: true }],
  ['glm-4.7-flash', { displayName: 'GLM-4.7 Flash', supportsStreaming: true }],
  ['glm-4.7-flashx', { displayName: 'GLM-4.7 FlashX', supportsStreaming: true }],
  ['glm-4.6', { displayName: 'GLM-4.6', supportsStreaming: true }],
  ['glm-4.5', { displayName: 'GLM-4.5', supportsStreaming: true }],
  ['glm-4.5-air', { displayName: 'GLM-4.5 Air', supportsStreaming: true }],
  ['glm-4.5-x', { displayName: 'GLM-4.5 X', supportsStreaming: true }],
  ['glm-4.5-airx', { displayName: 'GLM-4.5 AirX', supportsStreaming: true }],
  ['glm-4.5-flash', { displayName: 'GLM-4.5 Flash', supportsStreaming: true }],
  ['glm-4-32b-0414-128k', { displayName: 'GLM-4 32B 0414 128K', supportsStreaming: true }],
]);

const ZAI_IMAGE_RESPONSE_FORMATS = ['url'] as const;
const GLM_IMAGE_QUALITIES = [
  { value: 'hd', label: 'HD' },
  { value: 'standard', label: 'Standard' },
] as const;
const GLM_IMAGE_SIZES = [
  { value: '1280x1280', label: '1280x1280' },
  { value: '1568x1056', label: '1568x1056' },
  { value: '1056x1568', label: '1056x1568' },
  { value: '1472x1088', label: '1472x1088' },
  { value: '1088x1472', label: '1088x1472' },
  { value: '1728x960', label: '1728x960' },
  { value: '960x1728', label: '960x1728' },
] as const;
const COGVIEW_IMAGE_SIZES = [
  { value: '1024x1024', label: '1024x1024' },
  { value: '768x1344', label: '768x1344' },
  { value: '864x1152', label: '864x1152' },
  { value: '1344x768', label: '1344x768' },
  { value: '1152x864', label: '1152x864' },
  { value: '1440x720', label: '1440x720' },
  { value: '720x1440', label: '720x1440' },
] as const;

export const ZAI_IMAGE_MODEL_DESCRIPTORS = [
  {
    id: 'glm-image',
    displayName: 'GLM-Image',
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: false,
      supportedImageResponseFormats: [...ZAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...GLM_IMAGE_SIZES],
      supportedImageQualities: [...GLM_IMAGE_QUALITIES],
      maxGeneratedImagesPerRequest: 1,
      imageDefaults: {
        responseFormat: 'url',
        resolution: '1280x1280',
        quality: 'hd',
        imageCount: 1,
      } as const,
    },
  },
  {
    id: 'cogview-4-250304',
    displayName: 'CogView-4-250304',
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: false,
      supportedImageResponseFormats: [...ZAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...COGVIEW_IMAGE_SIZES],
      supportedImageQualities: [...GLM_IMAGE_QUALITIES],
      maxGeneratedImagesPerRequest: 1,
      imageDefaults: {
        responseFormat: 'url',
        resolution: '1024x1024',
        quality: 'standard',
        imageCount: 1,
      } as const,
    },
  },
] as const satisfies readonly ImageModelDescriptor[];

const ZAI_IMAGE_MODEL_MAP = new Map<string, ImageModelDescriptor>(
  ZAI_IMAGE_MODEL_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]),
);

export function getZaiImageDefaultModelId() {
  return ZAI_IMAGE_MODEL_DESCRIPTORS[0]?.id ?? null;
}

export function getZaiImageModelDescriptor(modelId: string) {
  return ZAI_IMAGE_MODEL_MAP.get(modelId);
}

export function resolveZaiModelDisplayName(modelId: string): string {
  return (
    ZAI_TEXT_MODEL_METADATA.get(modelId)?.displayName ??
    ZAI_IMAGE_MODEL_MAP.get(modelId)?.displayName ??
    modelId
  );
}

export function resolveZaiModelCapabilities(modelId: string) {
  const imageCapabilities = ZAI_IMAGE_MODEL_MAP.get(modelId)?.capabilities;
  if (imageCapabilities) {
    return imageCapabilities;
  }

  return {
    supportsStreaming:
      ZAI_TEXT_MODEL_METADATA.get(modelId)?.supportsStreaming ?? true,
  };
}

export function buildZaiModelCatalog(listedModelIds: string[]): ProviderModel[] {
  const orderedModelIds =
    listedModelIds.length > 0
      ? listedModelIds
      : Array.from(
          new Set([
            ...ZAI_TEXT_MODEL_METADATA.keys(),
            ...ZAI_IMAGE_MODEL_MAP.keys(),
          ]),
        );

  return orderedModelIds.map((modelId) => ({
    id: modelId,
    displayName: resolveZaiModelDisplayName(modelId),
    capabilities: resolveZaiModelCapabilities(modelId),
  }));
}

export function buildZaiImageCatalog(
  models: ProviderModel[],
): CanonicalImageProviderCatalog {
  return {
    providerId: 'zai',
    defaultModelId: getZaiImageDefaultModelId(),
    models: models.filter(isImageCapableModel).map(toImageModelDescriptor),
  };
}

function isImageCapableModel(model: ProviderModel) {
  return Boolean(model.capabilities) &&
    (model.capabilities?.supportsImageGeneration ||
      model.capabilities?.supportsImageEditing);
}

function toImageModelDescriptor(model: ProviderModel): ImageModelDescriptor {
  return {
    id: model.id,
    displayName: model.displayName,
    lifecycleStatus:
      ZAI_IMAGE_MODEL_MAP.get(model.id)?.lifecycleStatus ?? 'active',
    capabilities: {
      supportsStreaming: model.capabilities?.supportsStreaming ?? true,
      ...(model.capabilities ?? {}),
    },
  };
}
