import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import { resolveOpenRouterImageModelDescriptor } from './catalog.js';

export { resolveOpenRouterImageModelDescriptor };

export function validateOpenRouterImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  if (!model.capabilities.supportsImageGeneration) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support generation.`,
    );
  }

  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedAspectRatio(request.aspectRatio, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedBackground(request.background, model);
  assertAllowedQuality(request.quality, model);
  assertAllowedModeration(request.moderation, model);
  assertAllowedOutputFormat(request.outputFormat, model);
  assertAllowedOutputCompression(request.outputCompression, model);

  if (request.n !== undefined && request.n !== 1) {
    throw new Error(
      `OpenRouter image model ${model.id} currently supports 1 image per request through this gateway path.`,
    );
  }
}

export function validateOpenRouterImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  if (!model.capabilities.supportsImageEditing) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support editing.`,
    );
  }

  if (request.images.length === 0) {
    throw new Error(
      'OpenRouter image editing requires at least one reference image.',
    );
  }

  validateOpenRouterImageGenerationRequest(request, model);
  assertAllowedInputFidelity(request.inputFidelity, model);

  const maxReferences = model.capabilities.maxReferenceImagesPerRequest;
  if (maxReferences && request.images.length > maxReferences) {
    throw new Error(
      `OpenRouter image model ${model.id} supports at most ${maxReferences} reference image(s).`,
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
  if (supportedFormats.length > 0 && !supportedFormats.includes(responseFormat)) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support response format ${responseFormat}.`,
    );
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
  if (
    supportedAspectRatios.length > 0 &&
    !supportedAspectRatios.some((entry) => entry.value === aspectRatio)
  ) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support aspect ratio ${aspectRatio}.`,
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
      `OpenRouter image model ${model.id} does not support resolution ${resolution}.`,
    );
  }
}

function assertAllowedBackground(
  background: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!background) {
    return;
  }

  const supportedBackgrounds = model.capabilities.supportedImageBackgrounds ?? [];
  if (
    supportedBackgrounds.length > 0 &&
    !supportedBackgrounds.some((entry) => entry.value === background)
  ) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support background ${background}.`,
    );
  }
}

function assertAllowedQuality(
  quality: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!quality) {
    return;
  }

  const supportedQualities = model.capabilities.supportedImageQualities ?? [];
  if (
    supportedQualities.length > 0 &&
    !supportedQualities.some((entry) => entry.value === quality)
  ) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support quality ${quality}.`,
    );
  }
}

function assertAllowedModeration(
  moderation: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!moderation) {
    return;
  }

  const supportedModerations = model.capabilities.supportedImageModerations ?? [];
  if (
    supportedModerations.length > 0 &&
    !supportedModerations.some((entry) => entry.value === moderation)
  ) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support moderation ${moderation}.`,
    );
  }
}

function assertAllowedOutputFormat(
  outputFormat: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!outputFormat) {
    return;
  }

  const supportedFormats = model.capabilities.supportedImageOutputFormats ?? [];
  if (
    supportedFormats.length > 0 &&
    !supportedFormats.some((entry) => entry.value === outputFormat)
  ) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support output format ${outputFormat}.`,
    );
  }
}

function assertAllowedOutputCompression(
  outputCompression: number | undefined,
  model: ImageModelDescriptor,
) {
  if (outputCompression === undefined) {
    return;
  }

  const range = model.capabilities.imageOutputCompressionRange;
  if (!range) {
    return;
  }

  if (outputCompression < range.min || outputCompression > range.max) {
    throw new Error(
      `OpenRouter image model ${model.id} supports output compression between ${range.min} and ${range.max}.`,
    );
  }
}

function assertAllowedInputFidelity(
  inputFidelity: string | undefined,
  model: ImageModelDescriptor,
) {
  if (!inputFidelity) {
    return;
  }

  const supportedFidelities = model.capabilities.supportedImageInputFidelities ?? [];
  if (
    supportedFidelities.length > 0 &&
    !supportedFidelities.some((entry) => entry.value === inputFidelity)
  ) {
    throw new Error(
      `OpenRouter image model ${model.id} does not support input fidelity ${inputFidelity}.`,
    );
  }
}
