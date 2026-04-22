import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import {
  getXAiImageDefaultModelId,
  getXAiImageModelDescriptor,
} from './catalog.js';

export function resolveXAiImageModelDescriptor(
  modelId?: string,
): ImageModelDescriptor {
  const resolvedModelId = modelId ?? getXAiImageDefaultModelId();

  if (!resolvedModelId) {
    throw new Error('No xAI image models are available.');
  }

  const descriptor = getXAiImageModelDescriptor(resolvedModelId);
  if (!descriptor) {
    throw new Error(`xAI image model ${resolvedModelId} is not supported.`);
  }

  return descriptor;
}

export function validateXAiImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  assertGenerationSupported(model);
  assertAllowedAspectRatio(request.aspectRatio, model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedImageCount(request.n, model);
}

export function validateXAiImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  assertEditingSupported(model);
  assertAllowedAspectRatio(request.aspectRatio, model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedImageCount(request.n, model);

  if (request.images.length === 0) {
    throw new Error('xAI image editing requires at least one reference image.');
  }

  const maxReferences = model.capabilities.maxReferenceImagesPerRequest;
  if (maxReferences && request.images.length > maxReferences) {
    throw new Error(
      `xAI image model ${model.id} supports at most ${maxReferences} reference image(s).`,
    );
  }
}

function assertGenerationSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageGeneration) {
    throw new Error(`xAI image model ${model.id} does not support generation.`);
  }
}

function assertEditingSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageEditing) {
    throw new Error(`xAI image model ${model.id} does not support editing.`);
  }
}

function assertAllowedAspectRatio(
  aspectRatio: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!aspectRatio) {
    return;
  }

  const supportedAspectRatios = model.capabilities.supportedImageAspectRatios ?? [];
  if (!supportedAspectRatios.some((entry) => entry.value === aspectRatio)) {
    throw new Error(
      `xAI image model ${model.id} does not support aspect ratio ${aspectRatio}.`,
    );
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
      `xAI image model ${model.id} does not support response format ${responseFormat}.`,
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
  if (!supportedResolutions.some((entry) => entry.value === resolution)) {
    throw new Error(
      `xAI image model ${model.id} does not support resolution ${resolution}.`,
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
      `xAI image model ${model.id} supports at most ${maxImages} image(s) per request.`,
    );
  }
}
