import type {
  UnsupportedFeatureReason,
  VideoGenerationMode,
} from '@lxp/domain';
import type {
  CanonicalVideoProviderCatalog,
  VideoModelDescriptor,
} from '@lxp/provider-sdk';
import {
  attachKlingVideoFamilyToModel,
  buildUnknownKlingNativeSpecDiagnostic,
  detectKlingVideoFamily,
  lookupKlingNativeVideoSpec,
  projectKlingVideoCapabilities,
} from '@lxp/model-family-capabilities';

import type { NanoGptVideoModelRecord } from './api-client.js';

const NANO_GPT_BASE_VIDEO_CAPABILITIES = {
  supportsStreaming: false,
  maxGeneratedVideosPerRequest: 1,
} as const;
const ROUTABLE_NANO_GPT_VIDEO_MODES = new Set<VideoGenerationMode>([
  'text-to-video',
  'image-to-video',
  'multi-image-to-video',
]);

export function buildNanoGptVideoCatalog(input: {
  subscriptionModels: NanoGptVideoModelRecord[];
  paidModels: NanoGptVideoModelRecord[];
  allModels?: NanoGptVideoModelRecord[];
}): CanonicalVideoProviderCatalog {
  const mergedModels = new Map<string, NanoGptVideoModelRecord>();
  const subscriptionModelIds = new Set(
    input.subscriptionModels.map((model) => model.id),
  );
  const paidModelIds = new Set(input.paidModels.map((model) => model.id));

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
    .filter((model) => model.category === 'video' || model.capabilities?.video_generation)
    .map((model) =>
      toVideoModelDescriptor(
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

function toVideoModelDescriptor(
  model: NanoGptVideoModelRecord,
  requiresPaidAccess: boolean,
): VideoModelDescriptor {
  const durations = resolveNanoGptDurations(model);
  const aspectRatios = resolveNanoGptAspectRatios(model);
  const resolutions = resolveNanoGptResolutions(model);
  const sizes = model.supported_parameters?.sizes ?? [];
  const overrides = resolveNanoGptVideoOverrides(model);
  const resolvedModes = resolveNanoGptVideoGenerationModes(model, overrides);
  let generationModes = resolvedModes.generationModes;
  let maxReferenceImages = resolveNanoGptMaxReferenceImages(
    model,
    generationModes,
    overrides.maxReferenceImages,
  );
  let supportsReferenceImages =
    generationModes.includes('image-to-video') ||
    generationModes.includes('multi-image-to-video');
  let generateAudio = resolveNanoGptAudioGeneration(model, overrides.generateAudio);
  const resolvedDurations = durations.length ? durations : overrides.durations;
  const resolvedAspectRatios = aspectRatios.length
    ? aspectRatios
    : overrides.aspectRatios;
  const resolvedResolutions = resolutions.length ? resolutions : overrides.resolutions;
  const capabilityDiagnostics: UnsupportedFeatureReason[] = [
    ...resolvedModes.unsupportedFeatures,
  ];
  const klingProjection = resolveNanoGptKlingProjection({
    model,
    generationModes,
    durations: resolvedDurations,
    aspectRatios: resolvedAspectRatios,
    resolutions: resolvedResolutions,
    generateAudio,
    maxReferenceImages,
    diagnostics: capabilityDiagnostics,
  });

  if (klingProjection) {
    generationModes = klingProjection.generationModes;
    maxReferenceImages = klingProjection.maxReferenceImages;
    supportsReferenceImages = klingProjection.supportsReferenceImages;
    generateAudio = klingProjection.supportsAudioGeneration;
  }

  const capabilities: VideoModelDescriptor['capabilities'] = {
    ...NANO_GPT_BASE_VIDEO_CAPABILITIES,
    supportsVideoGeneration: generationModes.length > 0,
    requiresPaidAccess,
    supportedVideoDurations: (klingProjection?.durations ?? resolvedDurations).map(
      (value) => ({
        value,
        label: `${value}s`,
      }),
    ),
    supportedVideoAspectRatios: (
      klingProjection?.aspectRatios ?? resolvedAspectRatios
    ).map((value) => ({
      value,
      label: value,
    })),
    supportedVideoResolutions: (
      klingProjection?.resolutions ?? resolvedResolutions
    ).map((value) => ({
      value,
      label: value,
    })),
    supportedVideoSizes: sizes.map((value) => ({
      value,
      label: value,
    })),
    supportsVideoReferenceImages: supportsReferenceImages,
    supportsVideoAudioGeneration: generateAudio,
    allowedVideoProviderParameters:
      klingProjection?.allowedPassthroughParameters ??
      model.supported_parameters?.allowed_passthrough_parameters ??
      overrides.allowedPassthroughParameters,
    maxReferenceImagesPerRequest: maxReferenceImages,
    videoDefaults: {
      durationSeconds: klingProjection?.durations[0] ?? resolvedDurations[0],
      aspectRatio: klingProjection?.aspectRatios[0] ?? resolvedAspectRatios[0],
      resolution: klingProjection?.resolutions[0] ?? resolvedResolutions[0],
      size: sizes[0],
      generateAudio,
      videoCount: 1,
    },
    pricingSkus: toPricingSkus(model.pricing),
    capabilityDiagnostics: klingProjection?.diagnostics ?? capabilityDiagnostics,
  };

  const descriptor: VideoModelDescriptor = {
    id: model.id,
    displayName: model.name ?? model.id,
    lifecycleStatus: resolveLifecycleStatus(model.tags),
    capabilities,
  };

  if (detectKlingVideoFamily({ id: model.id, displayName: descriptor.displayName })) {
    return attachKlingVideoFamilyToModel(descriptor, {
      providerId: 'nanogpt',
      durations: klingProjection?.durations ?? resolvedDurations,
      aspectRatios: klingProjection?.aspectRatios ?? resolvedAspectRatios,
      resolutions: klingProjection?.resolutions ?? resolvedResolutions,
      frameTypes: klingProjection?.frameTypes ?? [],
      supportsFrameImages: klingProjection?.supportsFrameImages ?? false,
      generateAudio,
      allowedPassthroughParameters:
        klingProjection?.allowedPassthroughParameters ??
        model.supported_parameters?.allowed_passthrough_parameters ??
        overrides.allowedPassthroughParameters,
      generationModes,
      maxReferenceImages,
      unsupportedFeatures: klingProjection?.diagnostics ?? capabilityDiagnostics,
    });
  }

  return descriptor;
}

function resolveNanoGptVideoOverrides(model: NanoGptVideoModelRecord) {
  const imageOnlyModes: VideoGenerationMode[] = ['image-to-video'];
  const multimodalModes: VideoGenerationMode[] = [
    'text-to-video',
    'image-to-video',
    'multi-image-to-video',
  ];
  const textOnlyModes: VideoGenerationMode[] = ['text-to-video'];
  const normalized = normalizeNanoGptModelId(model.id);
  const klingHaystack = [model.id, model.name]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => normalizeNanoGptModelId(value))
    .join(' ');
  const isKling21ImageOnly =
    normalized === 'kling-v21-standard' ||
    normalized === 'kling-v21-pro' ||
    normalized === 'kling-v21-master';
  const isKlingO1 =
    normalized === 'kling-video-o1' ||
    normalized === 'kling-video-o1-standard';
  const isModernKlingTextAndImage =
    normalized === 'kling-video' ||
    normalized === 'kling-video-v2' ||
    /^kling-v2-5-turbo-(pro|std)$/.test(normalized) ||
    /^kling-v25-turbo-(pro|std)$/.test(normalized) ||
    /^kling-v2-6-(pro|std)$/.test(normalized) ||
    /^kling-v26-(pro|std)$/.test(normalized) ||
    /^kling-v3-0-(pro|std)$/.test(normalized) ||
    /^kling-3-0-(pro|std)$/.test(normalized);
  const isKlingSpecializedTransport =
    /\bkling\b/.test(klingHaystack) &&
    /(avatar|lipsync|lip-sync|upscaler|face-swap|swap|edit|extend)\b/.test(
      klingHaystack,
    );
  const isGenericKlingVideoModel =
    detectKlingVideoFamily({
      id: model.id,
      displayName: model.name,
    }) && !isKlingSpecializedTransport;
  const supportsNativeAudio =
    /^kling-v2-6-(pro|std)$/.test(normalized) ||
    /^kling-v26-(pro|std)$/.test(normalized) ||
    /^kling-v3-0-(pro|std)$/.test(normalized) ||
    /^kling-3-0-(pro|std)$/.test(normalized);
  const isSeedance15Pro =
    normalized === 'seedance-1-5-pro' ||
    normalized === 'bytedance-seedance-1-5-pro';
  const isSeedance20Series =
    normalized === 'seedance-2-0' ||
    normalized === 'seedance-2-0-fast' ||
    normalized === 'dreamina-seedance-2-0' ||
    normalized === 'dreamina-seedance-2-0-fast' ||
    normalized === 'bytedance-seedance-2-0' ||
    normalized === 'bytedance-seedance-2-0-fast';
  const isSeedance10Series =
    normalized === 'seedance-video' ||
    normalized === 'seedance-1-0-lite' ||
    normalized === 'seedance-1-0-pro' ||
    normalized === 'seedance-1-0-pro-fast' ||
    normalized === 'bytedance-seedance-1-0-lite' ||
    normalized === 'bytedance-seedance-1-0-pro' ||
    normalized === 'bytedance-seedance-1-0-pro-fast';

  if (isKling21ImageOnly) {
    return {
      durations: [5, 10],
      aspectRatios: ['16:9'],
      resolutions: ['480p', '720p', '1080p'],
      generationModes: imageOnlyModes,
      supportsReferenceImages: true,
      generateAudio: false,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
      maxReferenceImages: 1,
    };
  }

  if (isKlingO1) {
    return {
      durations: [5, 10],
      aspectRatios: ['16:9'],
      resolutions: ['480p', '720p', '1080p'],
      generationModes: multimodalModes,
      supportsReferenceImages: true,
      generateAudio: false,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
      maxReferenceImages: 4,
    };
  }

  if (isModernKlingTextAndImage || isGenericKlingVideoModel) {
    return {
      durations: [5, 10],
      aspectRatios: ['16:9', '9:16', '1:1'],
      resolutions: ['480p', '720p', '1080p'],
      generationModes: ['text-to-video', 'image-to-video'] as VideoGenerationMode[],
      supportsReferenceImages: true,
      generateAudio: supportsNativeAudio,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
      maxReferenceImages: 1,
    };
  }

  if (isSeedance15Pro) {
    return {
      durations: [5, 10],
      aspectRatios: ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
      resolutions: ['480p', '720p', '1080p'],
      generationModes: ['text-to-video', 'image-to-video'] as VideoGenerationMode[],
      supportsReferenceImages: true,
      generateAudio: true,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
      maxReferenceImages: 1,
    };
  }

  if (isSeedance20Series) {
    return {
      durations: [5, 10],
      aspectRatios: ['16:9', '9:16', '1:1'],
      resolutions: ['480p', '720p', '1080p'],
      generationModes: ['text-to-video', 'image-to-video'] as VideoGenerationMode[],
      supportsReferenceImages: true,
      generateAudio: true,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
      maxReferenceImages: 1,
    };
  }

  if (isSeedance10Series) {
    return {
      durations: [5, 10],
      aspectRatios: ['16:9', '9:16', '1:1'],
      resolutions: ['480p', '720p', '1080p'],
      generationModes: ['text-to-video', 'image-to-video'] as VideoGenerationMode[],
      supportsReferenceImages: true,
      generateAudio: false,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
      maxReferenceImages: 1,
    };
  }

  return {
    durations: [5, 10],
    aspectRatios: ['16:9'],
    resolutions: ['480p', '720p', '1080p'],
    generationModes: textOnlyModes,
    supportsReferenceImages: false,
    generateAudio: false,
    allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
    maxReferenceImages: 0,
  };
}

function resolveNanoGptVideoGenerationModes(
  model: NanoGptVideoModelRecord,
  fallback: ReturnType<typeof resolveNanoGptVideoOverrides>,
) {
  const transportRequirements = resolveNanoGptTransportRequirements(model);
  const supportedParameterModes = resolveNanoGptModesFromSupportedParameters(model);
  if (supportedParameterModes) {
    return finalizeNanoGptGenerationModes(
      supportedParameterModes,
      transportRequirements,
    );
  }

  const architectureModes = resolveNanoGptModesFromArchitecture(model);
  if (architectureModes) {
    return finalizeNanoGptGenerationModes(architectureModes, transportRequirements);
  }

  const capabilityModes = resolveNanoGptModesFromCapabilities(model);
  if (capabilityModes) {
    return finalizeNanoGptGenerationModes(capabilityModes, transportRequirements);
  }

  return finalizeNanoGptGenerationModes(
    fallback.generationModes,
    transportRequirements,
    fallback.generationModes,
  );
}

function resolveNanoGptMaxReferenceImages(
  model: NanoGptVideoModelRecord,
  generationModes: VideoGenerationMode[],
  fallbackMaxReferenceImages: number,
) {
  if (!generationModes.length) {
    return 0;
  }

  const dynamicMaximum = model.supported_parameters?.max_reference_images;
  if (typeof dynamicMaximum === 'number' && Number.isFinite(dynamicMaximum)) {
    return dynamicMaximum;
  }

  if (generationModes.includes('multi-image-to-video')) {
    return Math.max(2, fallbackMaxReferenceImages || 4);
  }

  if (generationModes.includes('image-to-video')) {
    return Math.max(1, fallbackMaxReferenceImages || 1);
  }

  return fallbackMaxReferenceImages;
}

function resolveNanoGptAudioGeneration(
  model: NanoGptVideoModelRecord,
  fallbackGenerateAudio: boolean,
) {
  if (typeof model.capabilities?.audio_generation === 'boolean') {
    return model.capabilities.audio_generation;
  }

  return fallbackGenerateAudio;
}

function normalizeNanoGptGenerationMode(
  value: string,
): VideoGenerationMode | null {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s.]+/g, '-')
    .replace(/-+/g, '-');

  if (normalized === 'text-to-video' || normalized === 't2v') {
    return 'text-to-video';
  }

  if (
    normalized === 'image-to-video' ||
    normalized === 'i2v' ||
    normalized === 'first-frame-to-video' ||
    normalized === 'first-frame-image-to-video'
  ) {
    return 'image-to-video';
  }

  if (
    normalized === 'multi-image-to-video' ||
    normalized === 'reference-to-video' ||
    normalized === 'multi-reference-to-video'
  ) {
    return 'multi-image-to-video';
  }

  if (normalized === 'lip-sync' || normalized === 'lipsync') {
    return 'lip-sync';
  }

  return null;
}

function resolveNanoGptModesFromSupportedParameters(
  model: NanoGptVideoModelRecord,
): VideoGenerationMode[] | null {
  const rawModes = model.supported_parameters?.supported_modes;
  if (!rawModes?.length) {
    return null;
  }

  const modes = new Set<VideoGenerationMode>();
  for (const mode of rawModes) {
    const normalizedMode = normalizeNanoGptGenerationMode(mode);
    if (normalizedMode) {
      modes.add(normalizedMode);
    }
  }

  return Array.from(modes);
}

function resolveNanoGptModesFromArchitecture(
  model: NanoGptVideoModelRecord,
): VideoGenerationMode[] | null {
  const inputModalities = new Set(
    (model.architecture?.input_modalities ?? []).map((value) =>
      String(value).trim().toLowerCase(),
    ),
  );
  const outputModalities = new Set(
    (model.architecture?.output_modalities ?? []).map((value) =>
      String(value).trim().toLowerCase(),
    ),
  );

  if (!inputModalities.size || !outputModalities.has('video')) {
    return null;
  }

  const modes = new Set<VideoGenerationMode>();
  if (inputModalities.has('text')) {
    modes.add('text-to-video');
  }

  if (inputModalities.has('image') && !inputModalities.has('video')) {
    modes.add('image-to-video');
  }

  return Array.from(modes);
}

function resolveNanoGptModesFromCapabilities(
  model: NanoGptVideoModelRecord,
): VideoGenerationMode[] | null {
  const modes = new Set<VideoGenerationMode>();

  if (model.capabilities?.text_to_video) {
    modes.add('text-to-video');
  }

  if (model.capabilities?.image_to_video) {
    modes.add('image-to-video');
  }

  if (model.capabilities?.reference_to_video) {
    modes.add('multi-image-to-video');
  }

  return modes.size ? Array.from(modes) : null;
}

function resolveNanoGptTransportRequirements(model: NanoGptVideoModelRecord) {
  const inputModalities = new Set(
    (model.architecture?.input_modalities ?? []).map((value) =>
      String(value).trim().toLowerCase(),
    ),
  );
  const normalizedModelId = normalizeNanoGptModelId(model.id);
  const normalizedDisplayName = normalizeNanoGptModelId(model.name ?? '');
  const haystack = `${normalizedModelId} ${normalizedDisplayName}`;
  const requiresSourceVideo = inputModalities.has('video');
  const specializedKeyword =
    /\bmotion-control\b/.test(haystack) ||
    /\bmotion\b/.test(haystack) ||
    /\bextend\b/.test(haystack) ||
    /\bextension\b/.test(haystack) ||
    /\bedit\b/.test(haystack) ||
    /\blipsync\b/.test(haystack) ||
    /\blip-sync\b/.test(haystack);

  if (requiresSourceVideo) {
    return {
      unsupportedFeatures: [
        {
          code: 'mode_requires_transport_mapping',
          feature: 'source-video',
          field: 'referenceImages',
          message:
            'This NanoGPT video model requires a source video input. The current NanoGPT transport only routes text-to-video, image-to-video, and multi-image-to-video requests.',
        },
      ],
    };
  }

  if (specializedKeyword) {
    return {
      unsupportedFeatures: [
        {
          code: 'mode_requires_transport_mapping',
          feature: 'specialized-video-mode',
          field: 'referenceImages',
          message:
            'This NanoGPT video model exposes a specialized workflow that is not mapped by the current NanoGPT transport.',
        },
      ],
    };
  }

  return {
    unsupportedFeatures: [] as Array<{
      code: string;
      feature: string;
      field: string;
      message: string;
    }>,
  };
}

function finalizeNanoGptGenerationModes(
  candidateModes: VideoGenerationMode[],
  transportRequirements: ReturnType<typeof resolveNanoGptTransportRequirements>,
  fallbackModes?: VideoGenerationMode[],
) {
  const generationModes =
    transportRequirements.unsupportedFeatures.length > 0
      ? []
      : candidateModes.filter((mode) => ROUTABLE_NANO_GPT_VIDEO_MODES.has(mode));

  if (!generationModes.length && !transportRequirements.unsupportedFeatures.length) {
    return {
      generationModes: fallbackModes ?? [],
      unsupportedFeatures: [],
    };
  }

  return {
    generationModes,
    unsupportedFeatures: transportRequirements.unsupportedFeatures,
  };
}

function resolveNanoGptKlingProjection(input: {
  model: NanoGptVideoModelRecord;
  generationModes: VideoGenerationMode[];
  durations: number[];
  aspectRatios: string[];
  resolutions: string[];
  generateAudio: boolean;
  maxReferenceImages: number;
  diagnostics: UnsupportedFeatureReason[];
}) {
  if (
    !detectKlingVideoFamily({
      id: input.model.id,
      displayName: input.model.name,
    })
  ) {
    return null;
  }

  const nativeSpec = lookupKlingNativeVideoSpec({
    id: input.model.id,
    displayName: input.model.name,
  });

  return projectKlingVideoCapabilities({
    nativeSpec,
    providerId: 'nanogpt',
    modelId: input.model.id,
    liveMetadata: {
      declaredGenerationModes: input.generationModes,
      durations: input.durations,
      aspectRatios: input.aspectRatios,
      resolutions: input.resolutions,
      frameTypes: [],
      generateAudio: input.generateAudio,
      allowedPassthroughParameters:
        input.model.supported_parameters?.allowed_passthrough_parameters ??
        undefined,
      maxReferenceImages: input.maxReferenceImages,
    },
    transportCapabilities: {
      supportedGenerationModes: [
        'text-to-video',
        'image-to-video',
        'multi-image-to-video',
      ],
      supportedFrameTypes: [],
      supportsFrameImages: false,
      supportedPassthroughParameters:
        input.model.supported_parameters?.allowed_passthrough_parameters ??
        undefined,
    },
    baseDiagnostics: nativeSpec
      ? input.diagnostics
      : [...input.diagnostics, buildUnknownKlingNativeSpecDiagnostic()],
  });
}

function parseNumericValues(values: Array<number | string> | undefined) {
  return (values ?? [])
    .map((value) =>
      typeof value === 'number'
        ? value
        : Number(String(value).trim().replace(/s$/i, '')),
    )
    .filter((value): value is number => Number.isFinite(value));
}

function resolveNanoGptDurations(model: NanoGptVideoModelRecord) {
  const flatDurations = parseNumericValues(model.supported_parameters?.durations);
  if (flatDurations.length) {
    return flatDurations;
  }

  const options = model.supported_parameters?.parameters?.duration?.options;
  return parseNumericValues(
    options?.map((option) => option.value).filter((value) => value !== undefined) as
      | Array<number | string>
      | undefined,
  );
}

function resolveNanoGptAspectRatios(model: NanoGptVideoModelRecord) {
  const flatAspectRatios = model.supported_parameters?.aspect_ratios ?? [];
  if (flatAspectRatios.length) {
    return flatAspectRatios;
  }

  const options = model.supported_parameters?.parameters?.aspect_ratio?.options;
  return (options ?? [])
    .map((option) => option.value)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function resolveNanoGptResolutions(model: NanoGptVideoModelRecord) {
  const flatResolutions = model.supported_parameters?.resolutions ?? [];
  if (flatResolutions.length) {
    return flatResolutions;
  }

  const options = model.supported_parameters?.parameters?.resolution?.options;
  return (options ?? [])
    .map((option) => option.value)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function toPricingSkus(
  pricing: Record<string, unknown> | undefined,
): Record<string, string> | undefined {
  if (!pricing) {
    return undefined;
  }

  const pairs = Object.entries(pricing).flatMap(([key, value]) =>
    typeof value === 'number' ? [[key, String(value)]] : [],
  );
  return pairs.length ? Object.fromEntries(pairs) : undefined;
}

function normalizeNanoGptModelId(modelId: string) {
  return modelId
    .trim()
    .toLowerCase()
    .replace(/[_/\s.]+/g, '-')
    .replace(/-+/g, '-');
}

function resolveLifecycleStatus(
  tags: string[] | undefined,
): VideoModelDescriptor['lifecycleStatus'] {
  if (tags?.includes('preview')) {
    return 'preview';
  }

  if (tags?.includes('deprecated')) {
    return 'deprecated';
  }

  return 'active';
}
