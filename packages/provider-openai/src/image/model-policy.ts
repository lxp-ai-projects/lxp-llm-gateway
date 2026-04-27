import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

import {
  getOpenAiImageDefaultModelId,
  getOpenAiImageModelDescriptor,
} from './catalog.js';

export function resolveOpenAiImageModelDescriptor(
  modelId?: string,
): ImageModelDescriptor {
  const resolvedModelId = modelId ?? getOpenAiImageDefaultModelId();

  if (!resolvedModelId) {
    throw new Error('No OpenAI image models are available.');
  }

  const descriptor = getOpenAiImageModelDescriptor(resolvedModelId);
  if (!descriptor) {
    throw new Error(`OpenAI image model ${resolvedModelId} is not supported.`);
  }

  return descriptor;
}

export function validateOpenAiImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  assertOpenAiGenerationSupported(model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedBackground(request.background, model);
  assertAllowedQuality(request.quality, model);
  assertAllowedModeration(request.moderation, model);
  assertAllowedOutputFormat(request.outputFormat, model);
  assertAllowedOutputCompression(request.outputCompression, model);
  assertAllowedImageCount(request.n, model);
}

export function validateOpenAiImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  assertOpenAiEditingSupported(model);
  assertAllowedResponseFormat(request.responseFormat, model);
  assertAllowedResolution(request.resolution, model);
  assertAllowedBackground(request.background, model);
  assertAllowedQuality(request.quality, model);
  assertAllowedModeration(request.moderation, model);
  assertAllowedOutputFormat(request.outputFormat, model);
  assertAllowedOutputCompression(request.outputCompression, model);
  assertAllowedInputFidelity(request.inputFidelity, model);
  assertAllowedImageCount(request.n, model);

  if (request.images.length === 0) {
    throw new Error('OpenAI image editing requires at least one reference image.');
  }

  const maxReferences = model.capabilities.maxReferenceImagesPerRequest;
  if (maxReferences && request.images.length > maxReferences) {
    throw new Error(
      `OpenAI image editing supports at most ${maxReferences} reference image(s).`,
    );
  }
}

function assertOpenAiGenerationSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageGeneration) {
    throw new Error(`OpenAI image model ${model.id} does not support generation.`);
  }
}

function assertOpenAiEditingSupported(model: ImageModelDescriptor) {
  if (!model.capabilities.supportsImageEditing) {
    throw new Error(`OpenAI image model ${model.id} does not support editing.`);
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
      `OpenAI image model ${model.id} does not support response format ${responseFormat}.`,
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
      `OpenAI image model ${model.id} does not support resolution ${resolution}.`,
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
  if (!supportedBackgrounds.some((entry) => entry.value === background)) {
    throw new Error(
      `OpenAI image model ${model.id} does not support background ${background}.`,
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
  if (!supportedQualities.some((entry) => entry.value === quality)) {
    throw new Error(
      `OpenAI image model ${model.id} does not support quality ${quality}.`,
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
  if (!supportedFormats.some((entry) => entry.value === outputFormat)) {
    throw new Error(
      `OpenAI image model ${model.id} does not support output format ${outputFormat}.`,
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
  if (!supportedModerations.some((entry) => entry.value === moderation)) {
    throw new Error(
      `OpenAI image model ${model.id} does not support moderation ${moderation}.`,
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
    throw new Error(
      `OpenAI image model ${model.id} does not support output compression.`,
    );
  }

  if (outputCompression < range.min || outputCompression > range.max) {
    throw new Error(
      `OpenAI image model ${model.id} supports output compression between ${range.min} and ${range.max}.`,
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
  if (!supportedFidelities.some((entry) => entry.value === inputFidelity)) {
    throw new Error(
      `OpenAI image model ${model.id} does not support input fidelity ${inputFidelity}.`,
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
      `OpenAI image model ${model.id} supports at most ${maxImages} image(s) per request.`,
    );
  }
}
