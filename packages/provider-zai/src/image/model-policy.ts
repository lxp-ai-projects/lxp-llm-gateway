import type {
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import {
  getZaiImageDefaultModelId,
  getZaiImageModelDescriptor,
} from './catalog.js';

export function resolveZaiImageModelDescriptor(
  modelId?: string,
): ImageModelDescriptor {
  const resolvedModelId = modelId ?? getZaiImageDefaultModelId();

  if (!resolvedModelId) {
    throw new Error('No Z.ai image models are available.');
  }

  const descriptor = getZaiImageModelDescriptor(resolvedModelId);
  if (!descriptor) {
    throw new Error(`Z.ai image model ${resolvedModelId} is not supported.`);
  }

  return descriptor;
}

export function validateZaiImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  if (!model.capabilities.supportsImageGeneration) {
    throw new Error(`Z.ai image model ${model.id} does not support generation.`);
  }

  if (request.responseFormat) {
    const supportedFormats = model.capabilities.supportedImageResponseFormats ?? [];
    if (!supportedFormats.includes(request.responseFormat)) {
      throw new Error(
        `Z.ai image model ${model.id} does not support response format ${request.responseFormat}.`,
      );
    }
  }

  if (request.resolution) {
    const supportedResolutions = model.capabilities.supportedImageResolutions ?? [];
    if (!supportedResolutions.some((entry) => entry.value === request.resolution)) {
      throw new Error(
        `Z.ai image model ${model.id} does not support resolution ${request.resolution}.`,
      );
    }
  }

  if (request.quality) {
    const supportedQualities = model.capabilities.supportedImageQualities ?? [];
    if (!supportedQualities.some((entry) => entry.value === request.quality)) {
      throw new Error(
        `Z.ai image model ${model.id} does not support quality ${request.quality}.`,
      );
    }
  }

  if (request.n !== undefined) {
    if (!Number.isInteger(request.n) || request.n <= 0) {
      throw new Error(
        `Z.ai image model ${model.id} requires a positive integer image count.`,
      );
    }
  }

  const maxImages = model.capabilities.maxGeneratedImagesPerRequest;
  if (
    maxImages !== undefined &&
    request.n !== undefined &&
    request.n > maxImages
  ) {
    throw new Error(
      `Z.ai image model ${model.id} supports at most ${maxImages} image(s) per request.`,
    );
  }
}
