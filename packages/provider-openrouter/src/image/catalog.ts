import type {
  CanonicalImageProviderCatalog,
  ImageModelDescriptor,
  ProviderModel,
} from '@lxp/provider-sdk';

const OPENROUTER_IMAGE_RESPONSE_FORMATS = ['b64_json'] as const;
const OPENROUTER_GENERIC_IMAGE_DEFAULTS = {
  responseFormat: 'b64_json',
  imageCount: 1,
} as const;
const OPENROUTER_IMAGE_ASPECT_RATIOS = [
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
] as const;
const OPENROUTER_EXTENDED_GEMINI_IMAGE_ASPECT_RATIOS = [
  ...OPENROUTER_IMAGE_ASPECT_RATIOS,
  { value: '1:4', label: '1:4', useCase: 'Tall, narrow layouts' },
  { value: '4:1', label: '4:1', useCase: 'Hero banners' },
  { value: '1:8', label: '1:8', useCase: 'Extra-tall layouts' },
  { value: '8:1', label: '8:1', useCase: 'Panoramic banners' },
] as const;
const OPENROUTER_GEMINI_1K_ONLY_RESOLUTIONS = [{ value: '1K', label: '1K' }] as const;
const OPENROUTER_GEMINI_PRO_RESOLUTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const;
const OPENROUTER_GEMINI_FLASH_31_RESOLUTIONS = [
  { value: '0.5K', label: '0.5K' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const;
const OPENROUTER_SOURCEFUL_FAST_RESOLUTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
] as const;
const OPENROUTER_SOURCEFUL_PRO_RESOLUTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const;
const OPENROUTER_FLUX_MP_RESOLUTIONS = [
  { value: '1MP', label: '1MP' },
  { value: '2MP', label: '2MP' },
  { value: '4MP', label: '4MP' },
] as const;
const OPENROUTER_OPENAI_IMAGE_RESOLUTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: '1024x1024' },
  { value: '1536x1024', label: '1536x1024' },
  { value: '1024x1536', label: '1024x1536' },
] as const;
const OPENROUTER_OPENAI_IMAGE_OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
] as const;
const OPENROUTER_OPENAI_IMAGE_BACKGROUNDS = [
  { value: 'auto', label: 'Auto' },
  { value: 'opaque', label: 'Opaque' },
  { value: 'transparent', label: 'Transparent' },
] as const;
const OPENROUTER_OPENAI_IMAGE_QUALITIES = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
const OPENROUTER_OPENAI_IMAGE_MODERATIONS = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Use the default moderation level for OpenAI image models.',
  },
  {
    value: 'low',
    label: 'Low',
    description:
      'Less restrictive filtering, but prompts and images can still be rejected.',
  },
] as const;
const OPENROUTER_IMAGE_CONFIG_GENERIC_CAPABILITIES = {
  supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
  imageDefaults: {
    ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
    aspectRatio: '1:1',
  },
} as const;

export interface OpenRouterImageModelRecord {
  id: string;
  name?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

interface OpenRouterImageModelMetadata {
  id: string;
  descriptor: ImageModelDescriptor;
  outputModalities: Array<'image' | 'text'>;
}

const OPENROUTER_KNOWN_IMAGE_MODELS = [
  {
    id: 'google/gemini-2.5-flash-image',
    descriptor: {
      id: 'google/gemini-2.5-flash-image',
      displayName: 'Google: Nano Banana (Gemini 2.5 Flash Image)',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_GEMINI_1K_ONLY_RESOLUTIONS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '1K',
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
  {
    id: 'google/gemini-3-pro-image-preview',
    descriptor: {
      id: 'google/gemini-3-pro-image-preview',
      displayName: 'Google: Nano Banana Pro (Gemini 3 Pro Image Preview)',
      lifecycleStatus: 'preview',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_GEMINI_PRO_RESOLUTIONS],
        maxReferenceImagesPerRequest: 14,
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '1K',
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
  {
    id: 'google/gemini-3.1-flash-image-preview',
    descriptor: {
      id: 'google/gemini-3.1-flash-image-preview',
      displayName: 'Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)',
      lifecycleStatus: 'preview',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [
          ...OPENROUTER_EXTENDED_GEMINI_IMAGE_ASPECT_RATIOS,
        ],
        supportedImageResolutions: [...OPENROUTER_GEMINI_FLASH_31_RESOLUTIONS],
        maxReferenceImagesPerRequest: 14,
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '0.5K',
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
  {
    id: 'openai/gpt-5.4-image-2',
    descriptor: {
      id: 'openai/gpt-5.4-image-2',
      displayName: 'OpenAI: GPT-5.4 Image 2',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageResolutions: [...OPENROUTER_OPENAI_IMAGE_RESOLUTIONS],
        supportedImageOutputFormats: [...OPENROUTER_OPENAI_IMAGE_OUTPUT_FORMATS],
        supportedImageBackgrounds: [...OPENROUTER_OPENAI_IMAGE_BACKGROUNDS],
        supportedImageQualities: [...OPENROUTER_OPENAI_IMAGE_QUALITIES],
        supportedImageModerations: [...OPENROUTER_OPENAI_IMAGE_MODERATIONS],
        imageOutputCompressionRange: {
          min: 0,
          max: 100,
          defaultValue: 100,
          step: 1,
        },
        maxReferenceImagesPerRequest: 16,
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          resolution: '1024x1024',
          background: 'auto',
          quality: 'auto',
          moderation: 'auto',
          outputFormat: 'png',
          outputCompression: 100,
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
  {
    id: 'openai/gpt-5-image',
    descriptor: {
      id: 'openai/gpt-5-image',
      displayName: 'OpenAI: GPT-5 Image',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageResolutions: [...OPENROUTER_OPENAI_IMAGE_RESOLUTIONS],
        supportedImageOutputFormats: [...OPENROUTER_OPENAI_IMAGE_OUTPUT_FORMATS],
        supportedImageBackgrounds: [...OPENROUTER_OPENAI_IMAGE_BACKGROUNDS],
        supportedImageQualities: [...OPENROUTER_OPENAI_IMAGE_QUALITIES],
        supportedImageModerations: [...OPENROUTER_OPENAI_IMAGE_MODERATIONS],
        supportedImageInputFidelities: [
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
        ],
        imageOutputCompressionRange: {
          min: 0,
          max: 100,
          defaultValue: 100,
          step: 1,
        },
        maxReferenceImagesPerRequest: 16,
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          resolution: '1024x1024',
          background: 'auto',
          quality: 'auto',
          moderation: 'auto',
          outputFormat: 'png',
          outputCompression: 100,
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
  {
    id: 'openai/gpt-5-image-mini',
    descriptor: {
      id: 'openai/gpt-5-image-mini',
      displayName: 'OpenAI: GPT-5 Image Mini',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageResolutions: [...OPENROUTER_OPENAI_IMAGE_RESOLUTIONS],
        supportedImageOutputFormats: [...OPENROUTER_OPENAI_IMAGE_OUTPUT_FORMATS],
        supportedImageBackgrounds: [...OPENROUTER_OPENAI_IMAGE_BACKGROUNDS],
        supportedImageQualities: [...OPENROUTER_OPENAI_IMAGE_QUALITIES],
        supportedImageModerations: [...OPENROUTER_OPENAI_IMAGE_MODERATIONS],
        imageOutputCompressionRange: {
          min: 0,
          max: 100,
          defaultValue: 100,
          step: 1,
        },
        maxReferenceImagesPerRequest: 16,
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          resolution: '1024x1024',
          background: 'auto',
          quality: 'auto',
          moderation: 'auto',
          outputFormat: 'png',
          outputCompression: 100,
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
  {
    id: 'bytedance-seed/seedream-4.5',
    descriptor: {
      id: 'bytedance-seed/seedream-4.5',
      displayName: 'ByteDance Seed: Seedream 4.5',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageResolutions: [
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K' },
        ],
        maxReferenceImagesPerRequest: 10,
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          resolution: '1K',
        },
      },
    },
    outputModalities: ['image'],
  },
  {
    id: 'sourceful/riverflow-v2-fast',
    descriptor: {
      id: 'sourceful/riverflow-v2-fast',
      displayName: 'Sourceful: Riverflow V2 Fast',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_SOURCEFUL_FAST_RESOLUTIONS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '1K',
        },
      },
    },
    outputModalities: ['image'],
  },
  {
    id: 'sourceful/riverflow-v2-pro',
    descriptor: {
      id: 'sourceful/riverflow-v2-pro',
      displayName: 'Sourceful: Riverflow V2 Pro',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_SOURCEFUL_PRO_RESOLUTIONS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '1K',
        },
      },
    },
    outputModalities: ['image'],
  },
  {
    id: 'black-forest-labs/flux.2-pro',
    descriptor: {
      id: 'black-forest-labs/flux.2-pro',
      displayName: 'Black Forest Labs: FLUX.2 Pro',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_FLUX_MP_RESOLUTIONS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '4MP',
        },
      },
    },
    outputModalities: ['image'],
  },
  {
    id: 'black-forest-labs/flux.2-max',
    descriptor: {
      id: 'black-forest-labs/flux.2-max',
      displayName: 'Black Forest Labs: FLUX.2 Max',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_FLUX_MP_RESOLUTIONS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '4MP',
        },
      },
    },
    outputModalities: ['image'],
  },
  {
    id: 'black-forest-labs/flux.2-klein-4b',
    descriptor: {
      id: 'black-forest-labs/flux.2-klein-4b',
      displayName: 'Black Forest Labs: FLUX.2 Klein 4B',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: false,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        supportedImageAspectRatios: [...OPENROUTER_IMAGE_ASPECT_RATIOS],
        supportedImageResolutions: [...OPENROUTER_FLUX_MP_RESOLUTIONS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
          aspectRatio: '1:1',
          resolution: '1MP',
        },
      },
    },
    outputModalities: ['image'],
  },
  {
    id: 'openrouter/auto',
    descriptor: {
      id: 'openrouter/auto',
      displayName: 'Auto Router',
      lifecycleStatus: 'active',
      capabilities: {
        supportsStreaming: false,
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
        imageDefaults: {
          ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
        },
      },
    },
    outputModalities: ['image', 'text'],
  },
] as const satisfies readonly OpenRouterImageModelMetadata[];

const OPENROUTER_KNOWN_IMAGE_MODEL_MAP = new Map<
  string,
  OpenRouterImageModelMetadata
>(
  OPENROUTER_KNOWN_IMAGE_MODELS.map((entry) => [entry.id, entry]),
);

export function buildOpenRouterImageCatalog(
  models: OpenRouterImageModelRecord[],
): CanonicalImageProviderCatalog {
  const mappedModels = models
    .filter((model) => isImageCapableRecord(model))
    .map((model) => toImageModelDescriptor(model));

  return {
    providerId: 'openrouter',
    defaultModelId:
      mappedModels.find((model) => model.id !== 'openrouter/auto')?.id ??
      mappedModels[0]?.id ??
      null,
    models: mappedModels,
  };
}

export function buildOpenRouterModelCatalog(
  models: Array<{ id: string; displayName: string }>,
): ProviderModel[] {
  return models.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    capabilities: resolveOpenRouterModelCapabilities(model.id),
  }));
}

export function resolveOpenRouterModelCapabilities(modelId: string) {
  return OPENROUTER_KNOWN_IMAGE_MODEL_MAP.get(modelId)?.descriptor.capabilities;
}

export function resolveOpenRouterImageOutputModalities(
  modelId: string,
): Array<'image' | 'text'> {
  const known = OPENROUTER_KNOWN_IMAGE_MODEL_MAP.get(modelId)?.outputModalities;
  if (known) {
    return known;
  }

  return modelId.startsWith('google/') ||
    modelId.startsWith('openai/') ||
    modelId === 'openrouter/auto'
    ? ['image', 'text']
    : ['image'];
}

export function supportsOpenRouterImageEditing(
  modelId: string,
  inputModalities?: string[],
) {
  const known = OPENROUTER_KNOWN_IMAGE_MODEL_MAP.get(modelId);
  if (known) {
    return known.descriptor.capabilities.supportsImageEditing === true;
  }

  return inputModalities?.includes('image') ?? false;
}

export function resolveOpenRouterImageModelDescriptor(
  modelId?: string,
): ImageModelDescriptor {
  const resolvedModelId = modelId?.trim();
  if (!resolvedModelId) {
    throw new Error('OpenRouter image generation requires a model id.');
  }

  const known = OPENROUTER_KNOWN_IMAGE_MODEL_MAP.get(resolvedModelId);
  if (known) {
    return known.descriptor;
  }

  return {
    id: resolvedModelId,
    displayName: resolvedModelId,
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: false,
      supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
      supportedImageAspectRatios: [
        ...OPENROUTER_IMAGE_CONFIG_GENERIC_CAPABILITIES.supportedImageAspectRatios,
      ],
      imageDefaults: {
        ...OPENROUTER_IMAGE_CONFIG_GENERIC_CAPABILITIES.imageDefaults,
      },
    },
  };
}

function isImageCapableRecord(model: OpenRouterImageModelRecord) {
  return model.architecture?.output_modalities?.includes('image') ?? true;
}

function toImageModelDescriptor(
  model: OpenRouterImageModelRecord,
): ImageModelDescriptor {
  const known = OPENROUTER_KNOWN_IMAGE_MODEL_MAP.get(model.id);
  if (known) {
    return {
      ...known.descriptor,
      displayName: model.name ?? known.descriptor.displayName,
    };
  }

  return {
    id: model.id,
    displayName: model.name ?? model.id,
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: supportsOpenRouterImageEditing(
        model.id,
        model.architecture?.input_modalities,
      ),
      supportedImageResponseFormats: [...OPENROUTER_IMAGE_RESPONSE_FORMATS],
      imageDefaults: {
        ...OPENROUTER_GENERIC_IMAGE_DEFAULTS,
      },
    },
  };
}
