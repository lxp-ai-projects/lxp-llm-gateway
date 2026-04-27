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
  assertAllowedResponseFormat(request.responseFormat, model, 'generation');
  assertAllowedResolution(request.resolution, model, 'generation');
  assertAllowedBackground(request.background, model, 'generation');
  assertAllowedQuality(request.quality, model, 'generation');
  assertAllowedModeration(request.moderation, model, 'generation');
  assertAllowedOutputFormat(request.outputFormat, model, 'generation');
  assertAllowedOutputCompression(request.outputCompression, model, 'generation');
  assertAllowedImageCount(request.n, model, 'generation');
}

export function validateNanoGptImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
) {
  assertEditingSupported(model);
  assertAllowedResponseFormat(request.responseFormat, model, 'edit');
  assertAllowedResolution(request.resolution, model, 'edit');
  assertAllowedBackground(request.background, model, 'edit');
  assertAllowedQuality(request.quality, model, 'edit');
  assertAllowedModeration(request.moderation, model, 'edit');
  assertAllowedOutputFormat(request.outputFormat, model, 'edit');
  assertAllowedOutputCompression(request.outputCompression, model, 'edit');
  assertAllowedInputFidelity(request.inputFidelity, model, 'edit');
  assertAllowedImageCount(request.n, model, 'edit');

  if (request.images.length === 0) {
    throw new Error('NanoGPT image editing requires at least one reference image.');
  }

  const maxReferences =
    resolveModeCapabilities(model, 'edit').maxReferenceImagesPerRequest ??
    model.capabilities.maxReferenceImagesPerRequest;
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
  mode: 'generation' | 'edit',
) {
  if (!responseFormat) {
    return;
  }

  const supportedFormats =
    resolveModeCapabilities(model, mode).supportedImageResponseFormats ??
    model.capabilities.supportedImageResponseFormats ??
    [];
  if (!supportedFormats.includes(responseFormat)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support response format ${responseFormat}.`,
    );
  }
}

function assertAllowedResolution(
  resolution: string | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (!resolution) {
    return;
  }

  const supportedResolutions =
    resolveModeCapabilities(model, mode).supportedImageResolutions ??
    model.capabilities.supportedImageResolutions ??
    [];
  if (
    supportedResolutions.length > 0 &&
    !supportedResolutions.some(
      (entry: { value: string; label: string }) => entry.value === resolution,
    )
  ) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support resolution ${resolution}.`,
    );
  }
}

function assertAllowedImageCount(
  imageCount: number | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (imageCount === undefined) {
    return;
  }

  const maxImages =
    resolveModeCapabilities(model, mode).maxGeneratedImagesPerRequest ??
    model.capabilities.maxGeneratedImagesPerRequest;
  if (maxImages && imageCount > maxImages) {
    throw new Error(
      `NanoGPT image model ${model.id} supports at most ${maxImages} image(s) per request.`,
    );
  }
}

function assertAllowedBackground(
  background: string | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (!background) {
    return;
  }

  const supportedBackgrounds =
    resolveModeCapabilities(model, mode).supportedImageBackgrounds ??
    model.capabilities.supportedImageBackgrounds ??
    [];
  if (!supportedBackgrounds.some((entry) => entry.value === background)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support background ${background}.`,
    );
  }
}

function assertAllowedQuality(
  quality: string | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (!quality) {
    return;
  }

  const supportedQualities =
    resolveModeCapabilities(model, mode).supportedImageQualities ??
    model.capabilities.supportedImageQualities ??
    [];
  if (!supportedQualities.some((entry) => entry.value === quality)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support quality ${quality}.`,
    );
  }
}

function assertAllowedModeration(
  moderation: string | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (!moderation) {
    return;
  }

  const supportedModerations =
    resolveModeCapabilities(model, mode).supportedImageModerations ??
    model.capabilities.supportedImageModerations ??
    [];
  if (!supportedModerations.some((entry) => entry.value === moderation)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support moderation ${moderation}.`,
    );
  }
}

function assertAllowedOutputFormat(
  outputFormat: string | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (!outputFormat) {
    return;
  }

  const supportedFormats =
    resolveModeCapabilities(model, mode).supportedImageOutputFormats ??
    model.capabilities.supportedImageOutputFormats ??
    [];
  if (!supportedFormats.some((entry) => entry.value === outputFormat)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support output format ${outputFormat}.`,
    );
  }
}

function assertAllowedOutputCompression(
  outputCompression: number | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (outputCompression === undefined) {
    return;
  }

  const range =
    resolveModeCapabilities(model, mode).imageOutputCompressionRange ??
    model.capabilities.imageOutputCompressionRange;
  if (!range) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support output compression.`,
    );
  }

  if (outputCompression < range.min || outputCompression > range.max) {
    throw new Error(
      `NanoGPT image model ${model.id} supports output compression between ${range.min} and ${range.max}.`,
    );
  }
}

function assertAllowedInputFidelity(
  inputFidelity: string | undefined,
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  if (!inputFidelity) {
    return;
  }

  const supportedFidelities =
    resolveModeCapabilities(model, mode).supportedImageInputFidelities ??
    model.capabilities.supportedImageInputFidelities ??
    [];
  if (!supportedFidelities.some((entry) => entry.value === inputFidelity)) {
    throw new Error(
      `NanoGPT image model ${model.id} does not support input fidelity ${inputFidelity}.`,
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

  const editDefaults = resolveModeCapabilities(model, 'edit').imageDefaults;
  const fallbackOutputCount =
    editDefaults?.imageCount ?? model.capabilities.imageDefaults?.imageCount ?? 1;
  if (request.images.length + (request.n ?? fallbackOutputCount) > 15) {
    throw new Error(
      `NanoGPT image model ${model.id} supports at most 15 combined reference and output image(s) for Seedream image-set workflows.`,
    );
  }
}

function resolveModeCapabilities(
  model: ImageModelDescriptor,
  mode: 'generation' | 'edit',
) {
  return mode === 'edit'
    ? (model.capabilities.imageEditOptions ?? {})
    : (model.capabilities.imageGenerationOptions ?? {});
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
