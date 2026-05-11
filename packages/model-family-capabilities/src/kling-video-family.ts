import type {
  ModelFamilyProfile,
  UnsupportedFeatureReason,
  VideoGenerationMode,
  VideoFrameType,
  VideoProviderModelCatalogEntry,
} from '@lxp/domain';
import type { GatewayVideoGenerationRequest } from '@lxp/contracts';

import { validateVideoRequestAgainstFamily } from './video-validation.js';

export const KLING_VIDEO_FAMILY_ID = 'kling';
export const KLING_VIDEO_PROFILE_ID = 'kling-video-family';

const BASE_KLING_UNSUPPORTED_REASONS: UnsupportedFeatureReason[] = [
  {
    code: 'mode_requires_transport_mapping',
    feature: 'video-extension',
    message:
      'Video extension is part of the Kling family profile, but this transport may not expose it yet.',
  },
  {
    code: 'mode_requires_transport_mapping',
    feature: 'lip-sync',
    message:
      'Lip-sync is part of the Kling family profile, but this transport may not expose it yet.',
  },
];

export function buildKlingVideoFamilyProfile(
  overrides?: Partial<ModelFamilyProfile>,
): ModelFamilyProfile {
  return {
    familyId: KLING_VIDEO_FAMILY_ID,
    profileId: KLING_VIDEO_PROFILE_ID,
    modality: 'video',
    displayName: 'Kling Video',
    summary:
      'Reusable Kling-family video capability profile for direct and aggregator transports.',
    capabilityDescriptors: [
      { key: 'text-to-video', label: 'Text to Video', category: 'mode' },
      { key: 'image-to-video', label: 'Image to Video', category: 'mode' },
      {
        key: 'multi-image-to-video',
        label: 'Multi-Image to Video',
        category: 'mode',
      },
      { key: 'video-extension', label: 'Video Extension', category: 'mode' },
      { key: 'lip-sync', label: 'Lip Sync', category: 'mode' },
    ],
    parameterSchema: {
      durationSeconds: {
        type: 'integer',
        allowedValues: [5, 10],
        defaultValue: 5,
        description: 'Supported Kling clip durations.',
      },
      aspectRatio: {
        type: 'string',
        allowedValues: ['16:9', '9:16', '1:1'],
        defaultValue: '16:9',
      },
      resolution: {
        type: 'string',
        allowedValues: ['720p', '1080p'],
        defaultValue: '720p',
      },
      generateAudio: {
        type: 'boolean',
        defaultValue: false,
      },
    },
    uiHints: {
      recommendedMode: 'image-to-video',
      preferredAspectRatio: '16:9',
      previewableFields: [
        'durationSeconds',
        'aspectRatio',
        'resolution',
        'generateAudio',
      ],
      chips: [
        { key: 'first-frame', label: 'First Frame', category: 'input' },
        { key: 'last-frame', label: 'Last Frame', category: 'input' },
        { key: 'audio', label: 'Optional Audio', category: 'output' },
      ],
    },
    video: {
      generationModes: [
        'text-to-video',
        'image-to-video',
        'multi-image-to-video',
        'video-extension',
        'lip-sync',
      ],
      inputRequirements: [
        {
          mode: 'text-to-video',
          minReferenceImages: 0,
          maxReferenceImages: 0,
          supportsReferenceImages: false,
          supportsFrameImages: false,
        },
        {
          mode: 'image-to-video',
          minReferenceImages: 1,
          maxReferenceImages: 1,
          supportsReferenceImages: true,
          supportsFrameImages: true,
          supportedFrameTypes: ['first_frame', 'last_frame'],
        },
        {
          mode: 'multi-image-to-video',
          minReferenceImages: 2,
          maxReferenceImages: 4,
          supportsReferenceImages: true,
          supportsFrameImages: true,
          supportedFrameTypes: ['first_frame', 'last_frame'],
        },
        {
          mode: 'video-extension',
          supportsReferenceImages: true,
          notes: ['Requires a transport-specific source video contract.'],
        },
        {
          mode: 'lip-sync',
          supportsReferenceImages: true,
          notes: ['Requires transport support for source audio/video mapping.'],
        },
      ],
      frameImageSupport: {
        supportedFrameTypes: ['first_frame', 'last_frame'],
        maxFrameImages: 2,
        allowsFirstFrame: true,
        allowsLastFrame: true,
      },
      durationConstraint: {
        allowedValues: [5, 10],
        defaultSeconds: 5,
      },
      aspectRatioConstraint: {
        allowedValues: ['16:9', '9:16', '1:1'],
        defaultValue: '16:9',
      },
      resolutionConstraint: {
        allowedValues: ['720p', '1080p'],
        defaultValue: '720p',
      },
      audioSupport: {
        supportsGeneration: true,
        defaultEnabled: false,
      },
      providerPassthroughRules: [
        {
          schema: {
            strategy: 'allow-list',
            namespace: 'providerOptions',
            allowedParameters: [],
          },
        },
      ],
      unsupportedFeatures: [...BASE_KLING_UNSUPPORTED_REASONS],
    },
    ...overrides,
  };
}

export function detectKlingVideoFamily(model: {
  id: string;
  displayName?: string;
  canonicalSlug?: string;
}): boolean {
  const haystack = [model.id, model.displayName, model.canonicalSlug]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return /(^|[\s/:_-])kling([\s/:._-]|$)/i.test(haystack);
}

export function normalizeKlingVideoFamilyProfile(input: {
  providerId?: string | null;
  durations?: number[] | null;
  aspectRatios?: string[] | null;
  resolutions?: string[] | null;
  frameTypes?: VideoFrameType[] | null;
  generateAudio?: boolean | null;
  allowedPassthroughParameters?: string[] | null;
  generationModes?: VideoGenerationMode[] | null;
  supportsFrameImages?: boolean | null;
  maxReferenceImages?: number | null;
  unsupportedFeatures?: UnsupportedFeatureReason[] | null;
}): ModelFamilyProfile {
  const base = buildKlingVideoFamilyProfile();
  const generationModes =
    input.generationModes
      ? [...input.generationModes]
      : [...(base.video?.generationModes ?? [])];
  const unsupportedFeatures =
    input.unsupportedFeatures !== undefined && input.unsupportedFeatures !== null
      ? [...input.unsupportedFeatures]
      : [...(base.video?.unsupportedFeatures ?? [])];
  const frameTypes = input.frameTypes ? [...input.frameTypes] : null;
  const supportsFrameImages =
    input.supportsFrameImages ??
    (frameTypes ? frameTypes.length > 0 : true);
  const maxReferenceImages =
    typeof input.maxReferenceImages === 'number'
      ? input.maxReferenceImages
      : generationModes.includes('multi-image-to-video')
        ? 4
        : generationModes.includes('image-to-video')
          ? 1
          : 0;

  return {
    ...base,
    parameterSchema: {
      ...base.parameterSchema,
      durationSeconds: {
        type: 'integer',
        description: base.parameterSchema?.durationSeconds?.description,
        allowedValues:
          input.durations?.length ? [...input.durations] : [5, 10],
        defaultValue: input.durations?.[0] ?? 5,
      },
      aspectRatio: {
        type: 'string',
        description: base.parameterSchema?.aspectRatio?.description,
        allowedValues:
          input.aspectRatios?.length ? [...input.aspectRatios] : ['16:9', '9:16', '1:1'],
        defaultValue: input.aspectRatios?.[0] ?? '16:9',
      },
      resolution: {
        type: 'string',
        description: base.parameterSchema?.resolution?.description,
        allowedValues:
          input.resolutions?.length ? [...input.resolutions] : ['720p', '1080p'],
        defaultValue: input.resolutions?.[0] ?? '720p',
      },
      generateAudio: {
        type: 'boolean',
        description: base.parameterSchema?.generateAudio?.description,
        defaultValue: input.generateAudio ?? false,
      },
    },
    video: {
      ...base.video!,
      generationModes,
      inputRequirements: buildKlingInputRequirements({
        generationModes,
        supportsFrameImages,
        frameTypes,
        maxReferenceImages,
      }),
      durationConstraint: {
        allowedValues: input.durations?.length ? [...input.durations] : [5, 10],
        defaultSeconds: input.durations?.[0] ?? 5,
      },
      aspectRatioConstraint: {
        allowedValues:
          input.aspectRatios?.length ? [...input.aspectRatios] : ['16:9', '9:16', '1:1'],
        defaultValue: input.aspectRatios?.[0] ?? '16:9',
      },
      resolutionConstraint: {
        allowedValues:
          input.resolutions?.length ? [...input.resolutions] : ['720p', '1080p'],
        defaultValue: input.resolutions?.[0] ?? '720p',
      },
      frameImageSupport: {
        supportedFrameTypes:
          supportsFrameImages && frameTypes ? [...frameTypes] : [],
        maxFrameImages: 2,
        allowsFirstFrame: supportsFrameImages && (frameTypes ?? []).includes('first_frame'),
        allowsLastFrame: supportsFrameImages && (frameTypes ?? []).includes('last_frame'),
      },
      audioSupport: {
        supportsGeneration: input.generateAudio ?? false,
        defaultEnabled: false,
      },
      providerPassthroughRules: [
        {
          ...(input.providerId ? { providerId: input.providerId } : {}),
          schema: {
            strategy: 'allow-list',
            namespace: 'providerOptions',
            allowedParameters: [...(input.allowedPassthroughParameters ?? [])],
          },
        },
      ],
      unsupportedFeatures,
    },
  };
}

export function attachKlingVideoFamilyToModel<T extends VideoProviderModelCatalogEntry>(
  model: T,
  input: {
    providerId?: string | null;
    durations?: number[] | null;
    aspectRatios?: string[] | null;
    resolutions?: string[] | null;
    frameTypes?: VideoFrameType[] | null;
    generateAudio?: boolean | null;
    allowedPassthroughParameters?: string[] | null;
    generationModes?: VideoGenerationMode[] | null;
    supportsFrameImages?: boolean | null;
    maxReferenceImages?: number | null;
    unsupportedFeatures?: UnsupportedFeatureReason[] | null;
  },
): T & Pick<VideoProviderModelCatalogEntry, 'family'> {
  const family = normalizeKlingVideoFamilyProfile(input);

  return {
    ...model,
    family,
    capabilities: {
      ...model.capabilities,
      family,
    },
  };
}

export function validateKlingVideoRequest(
  request: GatewayVideoGenerationRequest,
  family?: ModelFamilyProfile,
) {
  return validateVideoRequestAgainstFamily(
    request,
    family ?? buildKlingVideoFamilyProfile(),
  );
}

function buildKlingInputRequirements(input: {
  generationModes: VideoGenerationMode[];
  supportsFrameImages: boolean;
  frameTypes: VideoFrameType[] | null;
  maxReferenceImages: number;
}) {
  const requirements = [];

  if (input.generationModes.includes('text-to-video')) {
    requirements.push({
      mode: 'text-to-video' as const,
      minReferenceImages: 0,
      maxReferenceImages: 0,
      supportsReferenceImages: false,
      supportsFrameImages: false,
    });
  }

  if (input.generationModes.includes('image-to-video')) {
    requirements.push({
      mode: 'image-to-video' as const,
      minReferenceImages: 1,
      maxReferenceImages: Math.max(1, input.maxReferenceImages || 1),
      supportsReferenceImages: true,
      supportsFrameImages: input.supportsFrameImages,
      ...(input.supportsFrameImages && input.frameTypes
        ? { supportedFrameTypes: [...input.frameTypes] }
        : {}),
    });
  }

  if (input.generationModes.includes('multi-image-to-video')) {
    requirements.push({
      mode: 'multi-image-to-video' as const,
      minReferenceImages: 2,
      maxReferenceImages: Math.max(2, input.maxReferenceImages || 4),
      supportsReferenceImages: true,
      supportsFrameImages: input.supportsFrameImages,
      ...(input.supportsFrameImages && input.frameTypes
        ? { supportedFrameTypes: [...input.frameTypes] }
        : {}),
    });
  }

  if (input.generationModes.includes('video-extension')) {
    requirements.push({
      mode: 'video-extension' as const,
      supportsReferenceImages: true,
      notes: ['Requires a transport-specific source video contract.'],
    });
  }

  if (input.generationModes.includes('lip-sync')) {
    requirements.push({
      mode: 'lip-sync' as const,
      supportsReferenceImages: true,
      notes: ['Requires transport support for source audio/video mapping.'],
    });
  }

  return requirements;
}
