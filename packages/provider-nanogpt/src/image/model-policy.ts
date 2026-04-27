import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import { resolveNanoGptKnownImageCapabilities } from './catalog.js';

const NANO_GPT_DEFAULT_IMAGE_MODEL_ID = 'hidream';

export function resolveNanoGptImageModelDescriptor(
  modelId?: string,
): ImageModelDescriptor {
  const resolvedModelId = modelId ?? NANO_GPT_DEFAULT_IMAGE_MODEL_ID;

  return {
    id: resolvedModelId,
    displayName: resolvedModelId,
    lifecycleStatus: 'active',
    capabilities: resolveNanoGptKnownImageCapabilities(resolvedModelId),
  };
}

export function validateNanoGptImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  assertGenerationSupported(model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedImageCount(request.n, model);
}

export function validateNanoGptImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  assertEditingSupported(model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedImageCount(request.n, model);

  if (request.images.length === 0) {
    throw new Error('NanoGPT image editing requires at least one reference image.');
  }

  const maxReferences = model.capabilities.maxReferenceImagesPerRequest;
  if (maxReferences && request.images.length > maxReferences) {
    throw new Error(
      `NanoGPT image model ${model.id} supports at most ${maxReferences} reference image(s).`,
    );
  }

  assertCombinedSeedreamImageSetLimit(request, model);
}

function assertGenerationSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageGeneration) {
    throw new Error(`NanoGPT image model ${model.id} does not support generation.`);
  }
}

function assertEditingSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageEditing) {
    throw new Error(`NanoGPT image model ${model.id} does not support editing.`);
  }
}

function assertAllowedResponseFormat(
  responseFormat: CanonicalImageGenerateRequest['responseFormat'] | undefined,
  model: ImageModelDescriptor,
) {
  if (!responseFormat) {
    return;
  }

  const supportedFormats = model.capabilities.supportedImageResponseFormats ?? [];
  if (!supportedFormats.includes(responseFormat)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support response format ${responseFormat}.`,
    );
  }
}

function assertAllowedResolution(
  resolution: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!resolution) {
    return;
  }

  const supportedResolutions = model.capabilities.supportedImageResolutions ?? [];
  if (
    supportedResolutions.length > 0 &&
    !supportedResolutions.some((entry) => entry.value === resolution)
  ) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support resolution ${resolution}.`,
    );
  }
}

function assertAllowedImageCount(
  imageCount: number | undefined,
  model: ImageModelDescriptor,
) {
  if (imageCount === undefined) {
    return;
  }

  const maxImages = model.capabilities.maxGeneratedImagesPerRequest;
  if (maxImages && imageCount > maxImages) {
    throw new Error(
      `NanoGPT image model ${model.id} supports at most ${maxImages} image(s) per request.`,
    );
  }
}

function assertCombinedSeedreamImageSetLimit(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  if (!isSeedreamImageSetModel(model.id)) {
    return;
  }

  const requestedOutputCount = request.n ?? model.capabilities.imageDefaults?.imageCount ?? 1;
  if (request.images.length + requestedOutputCount > 15) {
    throw new Error(
      `NanoGPT image model ${model.id} supports at most 15 combined reference and output image(s) for Seedream image-set workflows.`,
    );
  }
}

function isSeedreamImageSetModel(modelId: string) {
  const normalized = modelId
    .trim()
    .toLowerCase()
    .replace(/[_/\s.]+/g, '-')
    .replace(/-+/g, '-');

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
