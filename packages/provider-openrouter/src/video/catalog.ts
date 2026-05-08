import type {
  CanonicalVideoProviderCatalog,
  VideoModelDescriptor,
} from '@lxp/provider-sdk';
import {
  attachKlingVideoFamilyToModel,
  detectKlingVideoFamily,
} from '@lxp/model-family-capabilities';

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
  const descriptor: VideoModelDescriptor = {
    id: model.id,
    displayName: model.name ?? model.canonical_slug ?? model.id,
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsVideoGeneration: true,
      supportedVideoAspectRatios: (model.supported_aspect_ratios ?? []).map(
        (value) => ({
          value,
          label: value,
        }),
      ),
      supportedVideoDurations: (model.supported_durations ?? []).map((value) => ({
        value,
        label: `${value}s`,
      })),
      supportedVideoFrameTypes: [...(model.supported_frame_images ?? [])],
      supportedVideoResolutions: (model.supported_resolutions ?? []).map(
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
        (model.supported_frame_images?.length ?? 0) > 0,
      supportsVideoAudioGeneration: model.generate_audio ?? false,
      allowedVideoProviderParameters: [
        ...(model.allowed_passthrough_parameters ?? []),
      ],
      maxGeneratedVideosPerRequest: 1,
      videoDefaults: {
        durationSeconds: model.supported_durations?.[0],
        aspectRatio: model.supported_aspect_ratios?.[0],
        resolution: model.supported_resolutions?.[0],
        size: model.supported_sizes?.[0] ?? undefined,
        generateAudio: model.generate_audio ?? false,
        videoCount: 1,
      },
      pricingSkus: model.pricing_skus ?? undefined,
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
      durations: model.supported_durations ?? undefined,
      aspectRatios: model.supported_aspect_ratios ?? undefined,
      resolutions: model.supported_resolutions ?? undefined,
      frameTypes: model.supported_frame_images ?? undefined,
      generateAudio: model.generate_audio ?? undefined,
      allowedPassthroughParameters:
        model.allowed_passthrough_parameters ?? undefined,
    });
  }

  return descriptor;
}
