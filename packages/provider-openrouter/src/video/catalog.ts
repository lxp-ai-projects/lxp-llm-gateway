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
import type { VideoGenerationMode } from '@lxp/domain';

export interface OpenRouterVideoModelRecord {
  id: string;
  canonical_slug?: string;
  name?: string;
  generate_audio?: boolean;
  supported_aspect_ratios?: string[] | null;
  supported_durations?: number[] | null;
  supported_frame_images?: Array<'first_frame' | 'last_frame'> | null;
  supported_resolutions?: string[] | null;
  supported_sizes?: string[] | null;
  allowed_passthrough_parameters?: string[] | null;
  pricing_skus?: Record<string, string> | null;
}

export function buildOpenRouterVideoCatalog(
  models: OpenRouterVideoModelRecord[],
): CanonicalVideoProviderCatalog {
  const mappedModels = models.map(toVideoModelDescriptor);

  return {
    providerId: 'openrouter',
    defaultModelId: mappedModels[0]?.id ?? null,
    models: mappedModels,
  };
}

export function toVideoModelDescriptor(
  model: OpenRouterVideoModelRecord,
): VideoModelDescriptor {
  const klingProjection = resolveOpenRouterKlingProjection(model);
  const descriptor: VideoModelDescriptor = {
    id: model.id,
    displayName: model.name ?? model.canonical_slug ?? model.id,
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsVideoGeneration:
        klingProjection?.generationModes.length
          ? true
          : !detectKlingVideoFamily({
              id: model.id,
              displayName: model.name,
              canonicalSlug: model.canonical_slug,
            }),
      supportedVideoAspectRatios: (klingProjection?.aspectRatios ??
        model.supported_aspect_ratios ??
        []
      ).map(
        (value) => ({
          value,
          label: value,
        }),
      ),
      supportedVideoDurations: (klingProjection?.durations ??
        model.supported_durations ??
        []
      ).map((value) => ({
        value,
        label: `${value}s`,
      })),
      supportedVideoFrameTypes: [
        ...(klingProjection?.frameTypes ?? model.supported_frame_images ?? []),
      ],
      supportedVideoResolutions: (klingProjection?.resolutions ??
        model.supported_resolutions ??
        []
      ).map(
        (value) => ({
          value,
          label: value,
        }),
      ),
      supportedVideoSizes: (model.supported_sizes ?? []).map((value) => ({
        value,
        label: value,
      })),
      supportsVideoReferenceImages:
        klingProjection?.supportsReferenceImages ??
        (model.supported_frame_images?.length ?? 0) > 0,
      supportsVideoAudioGeneration:
        klingProjection?.supportsAudioGeneration ?? (model.generate_audio ?? false),
      allowedVideoProviderParameters: [
        ...(klingProjection?.allowedPassthroughParameters ??
          model.allowed_passthrough_parameters ??
          []),
      ],
      maxGeneratedVideosPerRequest: 1,
      maxReferenceImagesPerRequest: klingProjection?.maxReferenceImages,
      videoDefaults: {
        durationSeconds: klingProjection?.durations[0] ?? model.supported_durations?.[0],
        aspectRatio:
          klingProjection?.aspectRatios[0] ?? model.supported_aspect_ratios?.[0],
        resolution:
          klingProjection?.resolutions[0] ?? model.supported_resolutions?.[0],
        size: model.supported_sizes?.[0] ?? undefined,
        generateAudio:
          klingProjection?.supportsAudioGeneration ?? (model.generate_audio ?? false),
        videoCount: 1,
      },
      pricingSkus: model.pricing_skus ?? undefined,
      capabilityDiagnostics: klingProjection?.diagnostics,
    },
  };

  if (
    detectKlingVideoFamily({
      id: model.id,
      displayName: descriptor.displayName,
      canonicalSlug: model.canonical_slug,
    })
  ) {
    return attachKlingVideoFamilyToModel(descriptor, {
      durations: klingProjection?.durations ?? model.supported_durations ?? undefined,
      aspectRatios:
        klingProjection?.aspectRatios ?? model.supported_aspect_ratios ?? undefined,
      resolutions:
        klingProjection?.resolutions ?? model.supported_resolutions ?? undefined,
      frameTypes:
        klingProjection?.frameTypes ?? model.supported_frame_images ?? undefined,
      generateAudio:
        klingProjection?.supportsAudioGeneration ?? model.generate_audio ?? undefined,
      allowedPassthroughParameters:
        klingProjection?.allowedPassthroughParameters ??
        model.allowed_passthrough_parameters ??
        undefined,
      generationModes: klingProjection?.generationModes,
      supportsFrameImages: klingProjection?.supportsFrameImages,
      maxReferenceImages: klingProjection?.maxReferenceImages,
      unsupportedFeatures: klingProjection?.diagnostics,
    });
  }

  return descriptor;
}

function resolveOpenRouterKlingProjection(model: OpenRouterVideoModelRecord) {
  if (
    !detectKlingVideoFamily({
      id: model.id,
      displayName: model.name,
      canonicalSlug: model.canonical_slug,
    })
  ) {
    return null;
  }

  const nativeSpec = lookupKlingNativeVideoSpec({
    id: model.id,
    displayName: model.name,
    canonicalSlug: model.canonical_slug,
  });
  const inferredGenerationModes: VideoGenerationMode[] = ['text-to-video'];
  if ((model.supported_frame_images?.length ?? 0) > 0) {
    inferredGenerationModes.push('image-to-video');
  }

  return projectKlingVideoCapabilities({
    nativeSpec,
    providerId: 'openrouter',
    modelId: model.id,
    liveMetadata: {
      inferredGenerationModes,
      durations: model.supported_durations ?? undefined,
      aspectRatios: model.supported_aspect_ratios ?? undefined,
      resolutions: model.supported_resolutions ?? undefined,
      frameTypes: model.supported_frame_images ?? undefined,
      generateAudio: model.generate_audio ?? undefined,
      allowedPassthroughParameters:
        model.allowed_passthrough_parameters ?? undefined,
      maxReferenceImages:
        (model.supported_frame_images?.length ?? 0) > 0 ? 1 : 0,
    },
    transportCapabilities: {
      supportedGenerationModes: ['text-to-video', 'image-to-video'],
      supportedFrameTypes: model.supported_frame_images ?? [],
      supportsFrameImages: (model.supported_frame_images?.length ?? 0) > 0,
      supportedPassthroughParameters:
        model.allowed_passthrough_parameters ?? undefined,
    },
    baseDiagnostics: nativeSpec ? [] : [buildUnknownKlingNativeSpecDiagnostic()],
  });
}
