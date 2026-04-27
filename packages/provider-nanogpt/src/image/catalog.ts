import type {
  CanonicalImageProviderCatalog,
  ImageModelCapabilities,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import type { NanoGptImageModelRecord } from './api-client.js';

interface NanoGptImageModelCapabilityOverride {
  matches(modelId: string): boolean;
  capabilities: Partial<ImageModelCapabilities>;
}

const NANO_GPT_DEFAULT_IMAGE_RESPONSE_FORMATS = ['url', 'b64_json'] as const;
const NANO_GPT_SEEDREAM_IMAGE_SET_RESOLUTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const;
const NANO_GPT_SEEDREAM_IMAGE_SET_CAPABILITY_OVERRIDE = {
  supportsImageGeneration: true,
  supportsImageEditing: true,
  supportedImageResponseFormats: [...NANO_GPT_DEFAULT_IMAGE_RESPONSE_FORMATS],
  supportedImageResolutions: [...NANO_GPT_SEEDREAM_IMAGE_SET_RESOLUTIONS],
  maxGeneratedImagesPerRequest: 15,
  // BytePlus documents a 2-10 multi-reference input limit for Seedream image-set
  // flows. The 14-image figure applies to output count with a single reference image.
  maxReferenceImagesPerRequest: 10,
  imageDefaults: {
    responseFormat: 'b64_json',
    resolution: '1K',
    imageCount: 1,
  },
} as const satisfies Partial<ImageModelCapabilities>;
const NANO_GPT_IMAGE_MODEL_CAPABILITY_OVERRIDES: readonly NanoGptImageModelCapabilityOverride[] =
  [
    {
      matches: (modelId) => modelId === 'flux-kontext' || modelId === 'flux-kontext/dev',
      capabilities: {
        maxReferenceImagesPerRequest: 5,
      },
    },
    {
      matches: (modelId) =>
        modelId === 'gpt-image-1' ||
        modelId === 'gpt-image-1.5' ||
        modelId === 'gpt-image-1-mini' ||
        modelId === 'chatgpt-image-latest',
      capabilities: {
        maxReferenceImagesPerRequest: 16,
        maxGeneratedImagesPerRequest: 10,
      },
    },
    {
      matches: (modelId) =>
        modelId === 'nano-banana' ||
        modelId === 'nano-banana-edit' ||
        modelId === 'gemini-flash-edit',
      capabilities: {
        maxReferenceImagesPerRequest: 5,
      },
    },
    {
      matches: (modelId) =>
        modelId === 'nano-banana-2' ||
        modelId === 'nano-banana-2-fast',
      capabilities: {
        maxReferenceImagesPerRequest: 14,
      },
    },
    {
      matches: (modelId) =>
        modelId === 'nano-banana-pro' ||
        modelId === 'nano-banana-pro-edit' ||
        modelId === 'nano-banana-pro-ultra',
      capabilities: {
        maxReferenceImagesPerRequest: 14,
      },
    },
    {
      matches: (modelId) => modelId === 'nano-banana-pro-edit-ultra',
      capabilities: {
        maxReferenceImagesPerRequest: 10,
      },
    },
    {
      matches: isSeedreamImageSetModelId,
      capabilities: NANO_GPT_SEEDREAM_IMAGE_SET_CAPABILITY_OVERRIDE,
    },
    {
      matches: isSeedream3TextToImageModelId,
      capabilities: {
        supportsImageGeneration: true,
        supportsImageEditing: false,
        supportedImageResponseFormats: [...NANO_GPT_DEFAULT_IMAGE_RESPONSE_FORMATS],
        supportedImageResolutions: [{ value: '2K', label: '2K' }],
        maxGeneratedImagesPerRequest: 1,
        imageDefaults: {
          responseFormat: 'b64_json',
          resolution: '2K',
          imageCount: 1,
        },
      },
    },
    {
      matches: isSeedEdit3ModelId,
      capabilities: {
        supportsImageGeneration: false,
        supportsImageEditing: true,
        supportedImageResponseFormats: [...NANO_GPT_DEFAULT_IMAGE_RESPONSE_FORMATS],
        maxGeneratedImagesPerRequest: 1,
        maxReferenceImagesPerRequest: 1,
        imageDefaults: {
          responseFormat: 'b64_json',
          imageCount: 1,
        },
      },
    },
  ];

const NANO_GPT_BASE_KNOWN_MODEL_CAPABILITIES = {
  supportsStreaming: false,
  supportsImageGeneration: true,
  supportsImageEditing: true,
  supportedImageResponseFormats: [...NANO_GPT_DEFAULT_IMAGE_RESPONSE_FORMATS],
  imageDefaults: {
    responseFormat: 'b64_json',
    imageCount: 1,
  },
} as const satisfies ImageModelCapabilities;

export function buildNanoGptImageCatalog(input: {
  subscriptionModels: NanoGptImageModelRecord[];
  paidModels: NanoGptImageModelRecord[];
  allModels?: NanoGptImageModelRecord[];
}): CanonicalImageProviderCatalog {
  const mergedModels = new Map<string, NanoGptImageModelRecord>();
  const subscriptionModelIds = new Set<string>(
    input.subscriptionModels.map((model) => model.id),
  );
  const paidModelIds = new Set<string>(input.paidModels.map((model) => model.id));

  for (const model of input.allModels ?? []) {
    mergedModels.set(model.id, model);
  }

  for (const model of input.subscriptionModels) {
    mergedModels.set(model.id, model);
  }

  for (const model of input.paidModels) {
    mergedModels.set(model.id, model);
  }

  const models = Array.from(mergedModels.values())
    .filter((model) => model.category === 'image' || model.capabilities?.image_generation)
    .map((model) =>
      toImageModelDescriptor(
        model,
        paidModelIds.has(model.id) && !subscriptionModelIds.has(model.id),
      ),
    );

  return {
    providerId: 'nanogpt',
    defaultModelId:
      models.find((model) => !model.capabilities.requiresPaidAccess)?.id ??
      models[0]?.id ??
      null,
    models,
  };
}

export function resolveNanoGptKnownImageCapabilities(
  modelId: string,
): ImageModelCapabilities {
  return applyCapabilityOverrides(modelId, {
    ...NANO_GPT_BASE_KNOWN_MODEL_CAPABILITIES,
    imageDefaults: {
      ...NANO_GPT_BASE_KNOWN_MODEL_CAPABILITIES.imageDefaults,
    },
  });
}

function toImageModelDescriptor(
  model: NanoGptImageModelRecord,
  requiresPaidAccess: boolean,
): ImageModelDescriptor {
  const resolutions = model.supported_parameters?.resolutions ?? [];
  const maxImages =
    model.supported_parameters?.fixed_image_count ??
    model.supported_parameters?.max_images;
  const supportsEditing = Boolean(
    model.capabilities?.image_to_image || model.capabilities?.inpainting,
  );
  const baseCapabilities: ImageModelCapabilities = {
    supportsStreaming: false,
    supportsImageGeneration: model.capabilities?.image_generation ?? true,
    supportsImageEditing: supportsEditing,
    requiresPaidAccess,
    supportedImageResponseFormats: [...NANO_GPT_DEFAULT_IMAGE_RESPONSE_FORMATS],
    supportedImageResolutions: resolutions.map((resolution) => ({
      value: resolution,
      label: resolution,
    })),
    ...(typeof maxImages === 'number'
      ? { maxGeneratedImagesPerRequest: maxImages }
      : {}),
    ...(supportsEditing ? { maxReferenceImagesPerRequest: 1 } : {}),
    imageDefaults: {
      responseFormat: 'b64_json',
      resolution: resolutions[0],
      imageCount: model.supported_parameters?.fixed_image_count ?? 1,
    },
  };
  const capabilities = applyCapabilityOverrides(model.id, baseCapabilities);

  return {
    id: model.id,
    displayName: model.name ?? model.id,
    lifecycleStatus: resolveLifecycleStatus(model),
    capabilities,
  };
}

function applyCapabilityOverrides(
  modelId: string,
  baseCapabilities: ImageModelCapabilities,
): ImageModelCapabilities {
  return NANO_GPT_IMAGE_MODEL_CAPABILITY_OVERRIDES.reduce(
    (capabilities, override) =>
      override.matches(modelId)
        ? {
            ...capabilities,
            ...override.capabilities,
          }
        : capabilities,
    baseCapabilities,
  );
}

function isSeedreamImageSetModelId(modelId: string) {
  const normalized = normalizeNanoGptModelId(modelId);

  return (
    normalized === 'seedream-4-0-250828' ||
    normalized === 'seedream-4-5-251128' ||
    normalized === 'seedream-5-0-lite-260128' ||
    normalized === 'seedream-4-0' ||
    normalized === 'seedream-4-5' ||
    normalized === 'seedream-5-0-lite' ||
    normalized === 'seedream-5-lite'
  );
}

function isSeedream3TextToImageModelId(modelId: string) {
  const normalized = normalizeNanoGptModelId(modelId);

  return (
    normalized === 'seedream-3-0-t2i-250415' ||
    normalized === 'seedream-3-0-t2i' ||
    normalized === 'seedream-3-0'
  );
}

function isSeedEdit3ModelId(modelId: string) {
  const normalized = normalizeNanoGptModelId(modelId);

  return (
    normalized === 'seededit-3-0-i2i-250628' ||
    normalized === 'seededit-3-0-i2i' ||
    normalized === 'seededit-3-0'
  );
}

function normalizeNanoGptModelId(modelId: string) {
  return modelId
    .trim()
    .toLowerCase()
    .replace(/[_/\s.]+/g, '-')
    .replace(/-+/g, '-');
}

function resolveLifecycleStatus(
  model: NanoGptImageModelRecord,
): ImageModelDescriptor['lifecycleStatus'] {
  if (model.tags?.includes('preview')) {
    return 'preview';
  }

  if (model.tags?.includes('deprecated')) {
    return 'deprecated';
  }

  return 'active';
}
