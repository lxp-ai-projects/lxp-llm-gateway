import type {
  CanonicalVideoProviderCatalog,
  VideoModelDescriptor,
} from '@lxp/provider-sdk';

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

const OPENROUTER_KNOWN_VIDEO_MODELS = [
  {
    id: 'google/veo-3.1',
    displayName: 'Google: Veo 3.1',
    generateAudio: true,
    supportedAspectRatios: ['16:9'],
    supportedDurations: [5, 8],
    supportedFrameImages: ['first_frame', 'last_frame'],
    supportedResolutions: ['720p'],
    supportedSizes: [],
    allowedPassthroughParameters: [],
    pricingSkus: {
      generate: '0.50',
    },
  },
] as const;

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

export function buildKnownOpenRouterVideoCatalog(): CanonicalVideoProviderCatalog {
  return buildOpenRouterVideoCatalog(
    OPENROUTER_KNOWN_VIDEO_MODELS.map((model) => ({
      id: model.id,
      name: model.displayName,
      generate_audio: model.generateAudio,
      supported_aspect_ratios: [...model.supportedAspectRatios],
      supported_durations: [...model.supportedDurations],
      supported_frame_images: [...model.supportedFrameImages],
      supported_resolutions: [...model.supportedResolutions],
      supported_sizes: [...model.supportedSizes],
      allowed_passthrough_parameters: [...model.allowedPassthroughParameters],
      pricing_skus: { ...model.pricingSkus },
    })),
  );
}

export function toVideoModelDescriptor(
  model: OpenRouterVideoModelRecord,
): VideoModelDescriptor {
  return {
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
}
