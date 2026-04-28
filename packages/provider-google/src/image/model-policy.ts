import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import {
  getGoogleImageDefaultModelId,
  getGoogleImageModelDescriptor,
} from './catalog.js';

export function resolveGoogleImageModelDescriptor(
  modelId?: string,
): ImageModelDescriptor {
  const resolvedModelId = modelId ?? getGoogleImageDefaultModelId();

  if (!resolvedModelId) {
    throw new Error('No Google image models are available.');
  }

  const descriptor = getGoogleImageModelDescriptor(resolvedModelId);
  if (!descriptor) {
    throw new Error(`Google image model ${resolvedModelId} is not supported.`);
  }

  return descriptor;
}

export function validateGoogleImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  assertGenerationSupported(model);
  assertAllowedAspectRatio(request.aspectRatio, model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
}

export function validateGoogleImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  assertEditingSupported(model);
  assertAllowedAspectRatio(request.aspectRatio, model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);

  if (request.images.length === 0) {
    throw new Error('Google Gemini image editing requires at least one reference image.');
  }

  const maxReferences = model.capabilities.maxReferenceImagesPerRequest;
  if (maxReferences && request.images.length > maxReferences) {
    throw new Error(
      `Google image model ${model.id} supports at most ${maxReferences} reference image(s).`,
    );
  }
}

function assertGenerationSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageGeneration) {
    throw new Error(`Google image model ${model.id} does not support generation.`);
  }
}

function assertEditingSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageEditing) {
    throw new Error(`Google image model ${model.id} does not support editing.`);
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
      `Google image model ${model.id} does not support aspect ratio ${aspectRatio}.`,
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
      `Google image model ${model.id} does not support response format ${responseFormat}.`,
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
      `Google image model ${model.id} does not support resolution ${resolution}.`,
    );
  }
}
