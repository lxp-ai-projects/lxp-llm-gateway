import type {
  CanonicalImageProviderCatalog,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';
import type { ProviderModel } from '@lxp/provider-sdk';

const OPENAI_IMAGE_RESPONSE_FORMATS = ['b64_json'] as const;
const OPENAI_IMAGE_RESOLUTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: '1024x1024' },
  { value: '1536x1024', label: '1536x1024' },
  { value: '1024x1536', label: '1024x1536' },
] as const;
const OPENAI_IMAGE_OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
] as const;
const OPENAI_IMAGE_BACKGROUNDS = [
  { value: 'auto', label: 'Auto' },
  { value: 'opaque', label: 'Opaque' },
  { value: 'transparent', label: 'Transparent' },
] as const;
const OPENAI_IMAGE_QUALITIES = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
const OPENAI_IMAGE_INPUT_FIDELITIES = [
  {
    value: 'low',
    label: 'Low',
    description: 'Looser adherence to the reference image.',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Preserve source details more strictly.',
  },
] as const;

export const OPENAI_IMAGE_MODEL_DESCRIPTORS = [
  {
    id: 'gpt-image-2',
    displayName: 'GPT Image 2',
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: true,
      supportedImageResponseFormats: [...OPENAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...OPENAI_IMAGE_RESOLUTIONS],
      supportedImageOutputFormats: [...OPENAI_IMAGE_OUTPUT_FORMATS],
      supportedImageBackgrounds: [...OPENAI_IMAGE_BACKGROUNDS],
      supportedImageQualities: [...OPENAI_IMAGE_QUALITIES],
      imageOutputCompressionRange: {
        min: 0,
        max: 100,
        defaultValue: 100,
        step: 1,
      },
      maxGeneratedImagesPerRequest: 10,
      maxReferenceImagesPerRequest: 16,
      imageDefaults: {
        responseFormat: 'b64_json',
        resolution: '1024x1024',
        background: 'auto',
        quality: 'auto',
        outputFormat: 'png',
        outputCompression: 100,
        imageCount: 1,
      } as const,
    },
  },
  {
    id: 'gpt-image-1.5',
    displayName: 'GPT Image 1.5',
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: true,
      supportedImageResponseFormats: [...OPENAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...OPENAI_IMAGE_RESOLUTIONS],
      supportedImageOutputFormats: [...OPENAI_IMAGE_OUTPUT_FORMATS],
      supportedImageBackgrounds: [...OPENAI_IMAGE_BACKGROUNDS],
      supportedImageQualities: [...OPENAI_IMAGE_QUALITIES],
      imageOutputCompressionRange: {
        min: 0,
        max: 100,
        defaultValue: 100,
        step: 1,
      },
      maxGeneratedImagesPerRequest: 10,
      maxReferenceImagesPerRequest: 16,
      imageDefaults: {
        responseFormat: 'b64_json',
        resolution: '1024x1024',
        background: 'auto',
        quality: 'auto',
        outputFormat: 'png',
        outputCompression: 100,
        imageCount: 1,
      } as const,
    },
  },
  {
    id: 'gpt-image-1',
    displayName: 'GPT Image 1',
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: true,
      supportedImageResponseFormats: [...OPENAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...OPENAI_IMAGE_RESOLUTIONS],
      supportedImageOutputFormats: [...OPENAI_IMAGE_OUTPUT_FORMATS],
      supportedImageBackgrounds: [...OPENAI_IMAGE_BACKGROUNDS],
      supportedImageQualities: [...OPENAI_IMAGE_QUALITIES],
      supportedImageInputFidelities: [...OPENAI_IMAGE_INPUT_FIDELITIES],
      imageOutputCompressionRange: {
        min: 0,
        max: 100,
        defaultValue: 100,
        step: 1,
      },
      maxGeneratedImagesPerRequest: 10,
      maxReferenceImagesPerRequest: 16,
      imageDefaults: {
        responseFormat: 'b64_json',
        resolution: '1024x1024',
        background: 'auto',
        quality: 'auto',
        outputFormat: 'png',
        outputCompression: 100,
        imageCount: 1,
      } as const,
    },
  },
  {
    id: 'gpt-image-1-mini',
    displayName: 'GPT Image 1 Mini',
    lifecycleStatus: 'preview',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: true,
      supportedImageResponseFormats: [...OPENAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...OPENAI_IMAGE_RESOLUTIONS],
      supportedImageOutputFormats: [...OPENAI_IMAGE_OUTPUT_FORMATS],
      supportedImageBackgrounds: [...OPENAI_IMAGE_BACKGROUNDS],
      supportedImageQualities: [...OPENAI_IMAGE_QUALITIES],
      imageOutputCompressionRange: {
        min: 0,
        max: 100,
        defaultValue: 100,
        step: 1,
      },
      maxGeneratedImagesPerRequest: 10,
      maxReferenceImagesPerRequest: 16,
      imageDefaults: {
        responseFormat: 'b64_json',
        resolution: '1024x1024',
        background: 'auto',
        quality: 'auto',
        outputFormat: 'png',
        outputCompression: 100,
        imageCount: 1,
      } as const,
    },
  },
] as const satisfies readonly ImageModelDescriptor[];

const OPENAI_IMAGE_MODEL_MAP = new Map<string, ImageModelDescriptor>(
  OPENAI_IMAGE_MODEL_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]),
);

export function getOpenAiImageModelDescriptor(modelId: string) {
  return OPENAI_IMAGE_MODEL_MAP.get(modelId);
}

export function isOpenAiImageModel(modelId: string): boolean {
  return OPENAI_IMAGE_MODEL_MAP.has(modelId);
}

export function resolveOpenAiModelDisplayName(modelId: string): string {
  return OPENAI_IMAGE_MODEL_MAP.get(modelId)?.displayName ?? modelId;
}

export function resolveOpenAiModelCapabilities(modelId: string) {
  return (
    OPENAI_IMAGE_MODEL_MAP.get(modelId)?.capabilities ?? {
      supportsStreaming: true,
    }
  );
}

export function getOpenAiImageDefaultModelId() {
  return OPENAI_IMAGE_MODEL_DESCRIPTORS[0]?.id ?? null;
}

export function buildOpenAiModelCatalog(listedModelIds: string[]): ProviderModel[] {
  const listedModels = listedModelIds.map((modelId) => ({
    id: modelId,
    displayName: resolveOpenAiModelDisplayName(modelId),
    capabilities: resolveOpenAiModelCapabilities(modelId),
  }));
  const knownImageModels = OPENAI_IMAGE_MODEL_DESCRIPTORS.filter(
    (descriptor) => !listedModels.some((model) => model.id === descriptor.id),
  );

  return [...listedModels, ...knownImageModels];
}

export function buildOpenAiImageCatalog(
  models: ProviderModel[],
): CanonicalImageProviderCatalog {
  return {
    providerId: 'openai',
    defaultModelId: getOpenAiImageDefaultModelId(),
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
      OPENAI_IMAGE_MODEL_MAP.get(model.id)?.lifecycleStatus ?? 'active',
    capabilities: {
      supportsStreaming: model.capabilities?.supportsStreaming ?? true,
      ...(model.capabilities ?? {}),
    },
  };
}
