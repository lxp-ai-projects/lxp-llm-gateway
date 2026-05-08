import type {
  FamilyValidationResult,
  ModelFamilyProfile,
  ProviderPassthroughSchema,
  UnsupportedFeatureReason,
  VideoGenerationMode,
} from '@lxp/domain';
import type { GatewayVideoGenerationRequest } from '@lxp/contracts';

export function normalizeVideoGenerationMode(
  request: Pick<
    GatewayVideoGenerationRequest,
    'referenceImages' | 'frameImages'
  >,
): VideoGenerationMode {
  const visualInputCount =
    (request.referenceImages?.length ?? 0) + (request.frameImages?.length ?? 0);

  if (visualInputCount <= 0) {
    return 'text-to-video';
  }

  if (visualInputCount === 1) {
    return 'image-to-video';
  }

  return 'multi-image-to-video';
}

export function collectPassthroughIssues(
  providerOptions: Record<string, unknown> | undefined,
  schema: ProviderPassthroughSchema | undefined,
): UnsupportedFeatureReason[] {
  if (!providerOptions || !schema) {
    return [];
  }

  const issues: UnsupportedFeatureReason[] = [];
  for (const key of Object.keys(providerOptions)) {
    if (!schema.allowedParameters.includes(key)) {
      issues.push({
        code: 'provider_passthrough_not_allowed',
        field: `providerOptions.${key}`,
        feature: key,
        message: `Provider passthrough parameter "${key}" is not allowed for this model family.`,
      });
    }
  }

  return issues;
}

export function validateVideoRequestAgainstFamily(
  request: GatewayVideoGenerationRequest,
  family: ModelFamilyProfile | undefined,
): FamilyValidationResult {
  const issues: UnsupportedFeatureReason[] = [];
  const normalizedMode = resolveVideoGenerationModeForValidation(request, family);

  if (!family?.video) {
    return {
      ok: true,
      normalizedMode,
      issues,
    };
  }

  if (!family.video.generationModes.includes(normalizedMode)) {
    const unsupportedReason = resolveUnsupportedModeReason(
      normalizedMode,
      family,
    );
    issues.push(
      unsupportedReason ?? {
        code: 'video_mode_not_supported',
        field: 'referenceImages',
        feature: normalizedMode,
        message: `Video mode "${normalizedMode}" is not supported by ${family.displayName}.`,
      },
    );
  }

  const inputRequirement = family.video.inputRequirements.find(
    (entry) => entry.mode === normalizedMode,
  );
  const referenceImageCount = request.referenceImages?.length ?? 0;
  const frameImageCount = request.frameImages?.length ?? 0;

  if (
    inputRequirement &&
    typeof inputRequirement.minReferenceImages === 'number' &&
    referenceImageCount < inputRequirement.minReferenceImages &&
    frameImageCount < inputRequirement.minReferenceImages
  ) {
    issues.push({
      code: 'reference_images_below_minimum',
      field: 'referenceImages',
      message: `At least ${inputRequirement.minReferenceImages} reference image(s) are required for ${normalizedMode}.`,
    });
  }

  const totalReferenceImages = referenceImageCount + frameImageCount;
  if (
    inputRequirement &&
    typeof inputRequirement.maxReferenceImages === 'number' &&
    totalReferenceImages > inputRequirement.maxReferenceImages
  ) {
    issues.push({
      code: 'reference_images_above_maximum',
      field: 'referenceImages',
      message: `At most ${inputRequirement.maxReferenceImages} image input(s) are supported for ${normalizedMode}.`,
    });
  }

  if (
    frameImageCount > 0 &&
    inputRequirement &&
    inputRequirement.supportsFrameImages === false
  ) {
    issues.push({
      code: 'frame_images_not_supported',
      field: 'frameImages',
      feature: normalizedMode,
      message: `Frame images are not supported for ${normalizedMode} on ${family.displayName}.`,
    });
  }

  if (
    request.frameImages?.length &&
    family.video.frameImageSupport?.supportedFrameTypes?.length
  ) {
    for (const frame of request.frameImages) {
      if (
        !family.video.frameImageSupport.supportedFrameTypes.includes(
          frame.frameType,
        )
      ) {
        issues.push({
          code: 'frame_type_not_supported',
          field: 'frameImages',
          feature: frame.frameType,
          message: `Frame type "${frame.frameType}" is not supported by ${family.displayName}.`,
        });
      }
    }
  }

  if (
    typeof request.durationSeconds === 'number' &&
    family.video.durationConstraint
  ) {
    const { allowedValues, minSeconds, maxSeconds } =
      family.video.durationConstraint;
    if (allowedValues?.length && !allowedValues.includes(request.durationSeconds)) {
      issues.push({
        code: 'duration_not_supported',
        field: 'durationSeconds',
        feature: String(request.durationSeconds),
        message: `Duration ${request.durationSeconds}s is not supported by ${family.displayName}.`,
      });
    }
    if (
      typeof minSeconds === 'number' &&
      request.durationSeconds < minSeconds
    ) {
      issues.push({
        code: 'duration_below_minimum',
        field: 'durationSeconds',
        feature: String(request.durationSeconds),
        message: `Duration must be at least ${minSeconds}s for ${family.displayName}.`,
      });
    }
    if (
      typeof maxSeconds === 'number' &&
      request.durationSeconds > maxSeconds
    ) {
      issues.push({
        code: 'duration_above_maximum',
        field: 'durationSeconds',
        feature: String(request.durationSeconds),
        message: `Duration must be at most ${maxSeconds}s for ${family.displayName}.`,
      });
    }
  }

  if (
    request.aspectRatio &&
    family.video.aspectRatioConstraint?.allowedValues?.length &&
    !family.video.aspectRatioConstraint.allowedValues.includes(request.aspectRatio)
  ) {
    issues.push({
      code: 'aspect_ratio_not_supported',
      field: 'aspectRatio',
      feature: request.aspectRatio,
      message: `Aspect ratio "${request.aspectRatio}" is not supported by ${family.displayName}.`,
    });
  }

  if (
    request.resolution &&
    family.video.resolutionConstraint?.allowedValues?.length &&
    !family.video.resolutionConstraint.allowedValues.includes(request.resolution)
  ) {
    issues.push({
      code: 'resolution_not_supported',
      field: 'resolution',
      feature: request.resolution,
      message: `Resolution "${request.resolution}" is not supported by ${family.displayName}.`,
    });
  }

  if (
    request.generateAudio === true &&
    family.video.audioSupport &&
    !family.video.audioSupport.supportsGeneration
  ) {
    issues.push(
      family.video.audioSupport.unsupportedReason ?? {
        code: 'audio_generation_not_supported',
        field: 'generateAudio',
        feature: 'generateAudio',
        message: `${family.displayName} does not support audio generation for this profile.`,
      },
    );
  }

  const passthroughRule = family.video.providerPassthroughRules?.find(
    (rule) =>
      !rule.providerId ||
      !request.providerId ||
      rule.providerId === request.providerId,
  )?.schema;
  issues.push(
    ...collectPassthroughIssues(
      request.providerOptions as Record<string, unknown> | undefined,
      passthroughRule,
    ),
  );

  return {
    ok: issues.length === 0,
    normalizedMode,
    issues,
  };
}

function resolveVideoGenerationModeForValidation(
  request: Pick<GatewayVideoGenerationRequest, 'referenceImages' | 'frameImages'>,
  family: ModelFamilyProfile | undefined,
): VideoGenerationMode {
  const fallbackMode = normalizeVideoGenerationMode(request);
  const visualInputCount =
    (request.referenceImages?.length ?? 0) + (request.frameImages?.length ?? 0);
  const requirements = family?.video?.inputRequirements ?? [];
  const visualModes = requirements.filter(
    (entry) =>
      entry.mode === 'image-to-video' || entry.mode === 'multi-image-to-video',
  );

  if (visualInputCount <= 0) {
    return family?.video?.generationModes.includes('text-to-video')
      ? 'text-to-video'
      : fallbackMode;
  }

  const exactMatch = visualModes.find((entry) => {
    const minReferenceImages = entry.minReferenceImages ?? 0;
    const maxReferenceImages = entry.maxReferenceImages;
    return (
      visualInputCount >= minReferenceImages &&
      (typeof maxReferenceImages !== 'number' ||
        visualInputCount <= maxReferenceImages)
    );
  });
  if (exactMatch) {
    return exactMatch.mode;
  }

  if (visualModes.length === 1) {
    return visualModes[0]!.mode;
  }

  return fallbackMode;
}

function resolveUnsupportedModeReason(
  normalizedMode: VideoGenerationMode,
  family: ModelFamilyProfile,
): UnsupportedFeatureReason | undefined {
  return family.video?.unsupportedFeatures?.find(
    (issue) =>
      issue.feature === normalizedMode ||
      issue.field === 'referenceImages' ||
      issue.field === 'frameImages',
  );
}
