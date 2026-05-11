import type {
  UnsupportedFeatureReason,
  VideoFrameType,
  VideoGenerationMode,
} from '@lxp/domain';

import type { KlingNativeVideoSpec } from './kling-native-spec.js';

export interface KlingTransportCapabilityProfile {
  supportedGenerationModes: VideoGenerationMode[];
  supportedFrameTypes?: VideoFrameType[] | null;
  supportsFrameImages?: boolean | null;
  supportedPassthroughParameters?: string[] | null;
}

export interface KlingProviderLiveMetadata {
  declaredGenerationModes?: VideoGenerationMode[] | null;
  inferredGenerationModes?: VideoGenerationMode[] | null;
  durations?: number[] | null;
  aspectRatios?: string[] | null;
  resolutions?: string[] | null;
  frameTypes?: VideoFrameType[] | null;
  generateAudio?: boolean | null;
  allowedPassthroughParameters?: string[] | null;
  maxReferenceImages?: number | null;
}

export interface KlingVideoProjectionResult {
  generationModes: VideoGenerationMode[];
  durations: number[];
  aspectRatios: string[];
  resolutions: string[];
  frameTypes: VideoFrameType[];
  supportsFrameImages: boolean;
  supportsReferenceImages: boolean;
  supportsAudioGeneration: boolean;
  allowedPassthroughParameters: string[];
  maxReferenceImages: number;
  diagnostics: UnsupportedFeatureReason[];
}

export function projectKlingVideoCapabilities(input: {
  nativeSpec: KlingNativeVideoSpec | null;
  providerId: string;
  modelId: string;
  liveMetadata: KlingProviderLiveMetadata;
  transportCapabilities: KlingTransportCapabilityProfile;
  baseDiagnostics?: UnsupportedFeatureReason[] | null;
}): KlingVideoProjectionResult {
  const diagnostics = [...(input.baseDiagnostics ?? [])];
  const nativeSpec = input.nativeSpec;
  const liveModes =
    input.liveMetadata.declaredGenerationModes?.length
      ? [...input.liveMetadata.declaredGenerationModes]
      : input.liveMetadata.inferredGenerationModes?.length
        ? [...input.liveMetadata.inferredGenerationModes]
        : [];

  if (!input.liveMetadata.declaredGenerationModes?.length) {
    diagnostics.push({
      code: 'provider_metadata_incomplete',
      feature: 'generationModes',
      message: `Provider metadata for ${input.modelId} did not declare explicit Kling generation modes. Conservative projection was applied.`,
    });
  }

  const nativeModes = nativeSpec?.supportedModes ?? liveModes;
  const generationModes = intersectOrdered(
    liveModes,
    nativeModes,
    input.transportCapabilities.supportedGenerationModes,
  );

  diagnostics.push(
    ...compareSets({
      nativeValues: nativeSpec?.supportedModes,
      providerValues: liveModes,
      feature: 'generationModes',
      missingCode: 'missing_native_capability_from_provider',
      unknownCode: 'provider_claims_capability_unknown_to_native_spec',
      providerLabel: input.providerId,
    }),
  );

  const durations = intersectOrdered(
    input.liveMetadata.durations ?? nativeSpec?.supportedDurations ?? [],
    nativeSpec?.supportedDurations,
  );
  diagnostics.push(
    ...compareSets({
      nativeValues: nativeSpec?.supportedDurations,
      providerValues: input.liveMetadata.durations ?? undefined,
      feature: 'durations',
      missingCode: 'missing_native_capability_from_provider',
      unknownCode: 'provider_claims_capability_unknown_to_native_spec',
      providerLabel: input.providerId,
    }),
  );

  const aspectRatios = intersectOrdered(
    input.liveMetadata.aspectRatios ?? nativeSpec?.supportedAspectRatios ?? [],
    nativeSpec?.supportedAspectRatios,
  );
  diagnostics.push(
    ...compareSets({
      nativeValues: nativeSpec?.supportedAspectRatios,
      providerValues: input.liveMetadata.aspectRatios ?? undefined,
      feature: 'aspectRatios',
      missingCode: 'missing_native_capability_from_provider',
      unknownCode: 'provider_claims_capability_unknown_to_native_spec',
      providerLabel: input.providerId,
    }),
  );

  const frameTypes = intersectOrdered(
    input.liveMetadata.frameTypes ??
      input.transportCapabilities.supportedFrameTypes ??
      nativeSpec?.supportedFrameTypes ??
      [],
    nativeSpec?.supportedFrameTypes,
    input.transportCapabilities.supportedFrameTypes,
  );
  const supportsFrameImages =
    (input.transportCapabilities.supportsFrameImages ?? frameTypes.length > 0) &&
    frameTypes.length > 0;

  const resolutions = intersectOrdered(
    input.liveMetadata.resolutions ?? nativeSpec?.supportedResolutions ?? [],
    nativeSpec?.supportedResolutions,
  );
  diagnostics.push(
    ...compareSets({
      nativeValues: nativeSpec?.supportedResolutions,
      providerValues: input.liveMetadata.resolutions ?? undefined,
      feature: 'resolutions',
      missingCode: 'missing_native_capability_from_provider',
      unknownCode: 'provider_claims_capability_unknown_to_native_spec',
      providerLabel: input.providerId,
    }),
  );

  const supportsAudioGeneration =
    Boolean(input.liveMetadata.generateAudio) &&
    Boolean(nativeSpec?.supportsAudioGeneration);

  if (
    nativeSpec?.supportsAudioGeneration &&
    input.liveMetadata.generateAudio === false
  ) {
    diagnostics.push({
      code: 'missing_native_capability_from_provider',
      feature: 'audioGeneration',
      message: `${input.providerId} metadata does not expose audio generation for ${input.modelId}, even though the native Kling spec can support it.`,
    });
  }

  const allowedPassthroughParameters = intersectOrdered(
    input.liveMetadata.allowedPassthroughParameters ??
      nativeSpec?.allowedPassthroughParameters ??
      [],
    nativeSpec?.allowedPassthroughParameters,
    input.transportCapabilities.supportedPassthroughParameters,
  );

  const maxReferenceImages = resolveMaxReferenceImages(
    generationModes,
    input.liveMetadata.maxReferenceImages,
  );
  const supportsReferenceImages =
    generationModes.includes('image-to-video') ||
    generationModes.includes('multi-image-to-video');

  return {
    generationModes,
    durations,
    aspectRatios,
    resolutions,
    frameTypes,
    supportsFrameImages,
    supportsReferenceImages,
    supportsAudioGeneration,
    allowedPassthroughParameters,
    maxReferenceImages,
    diagnostics: dedupeDiagnostics(diagnostics),
  };
}

function resolveMaxReferenceImages(
  generationModes: VideoGenerationMode[],
  providerMaximum: number | null | undefined,
) {
  if (typeof providerMaximum === 'number' && Number.isFinite(providerMaximum)) {
    return providerMaximum;
  }

  if (generationModes.includes('multi-image-to-video')) {
    return 4;
  }

  if (generationModes.includes('image-to-video')) {
    return 1;
  }

  return 0;
}

function compareSets<T extends string | number>(input: {
  nativeValues?: readonly T[] | null;
  providerValues?: readonly T[] | null;
  feature: string;
  missingCode: string;
  unknownCode: string;
  providerLabel: string;
}): UnsupportedFeatureReason[] {
  if (!input.nativeValues?.length || !input.providerValues?.length) {
    return [];
  }

  const diagnostics: UnsupportedFeatureReason[] = [];
  for (const nativeValue of input.nativeValues) {
    if (!input.providerValues.includes(nativeValue)) {
      diagnostics.push({
        code: input.missingCode,
        feature: input.feature,
        message: `${input.providerLabel} does not expose native Kling ${input.feature} value "${String(nativeValue)}" for this route.`,
      });
    }
  }

  for (const providerValue of input.providerValues) {
    if (!input.nativeValues.includes(providerValue)) {
      diagnostics.push({
        code: input.unknownCode,
        feature: input.feature,
        message: `${input.providerLabel} exposed ${input.feature} value "${String(providerValue)}" that is not part of the native Kling spec used by the gateway.`,
      });
    }
  }

  return diagnostics;
}

function intersectOrdered<T extends string | number>(
  source: readonly T[],
  ...constraints: Array<readonly T[] | null | undefined>
): T[] {
  return source.filter((value, index) => {
    if (source.indexOf(value) !== index) {
      return false;
    }

    return constraints.every(
      (constraint) => !constraint?.length || constraint.includes(value),
    );
  });
}

function dedupeDiagnostics(
  diagnostics: UnsupportedFeatureReason[],
): UnsupportedFeatureReason[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = [
      diagnostic.code,
      diagnostic.field ?? '',
      diagnostic.feature ?? '',
      diagnostic.message,
    ].join('|');
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
