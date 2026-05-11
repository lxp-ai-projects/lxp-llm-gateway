import type {
  UnsupportedFeatureReason,
  VideoFrameType,
  VideoGenerationMode,
} from '@lxp/domain';

export interface KlingNativeVideoSpec {
  familyId: 'kling';
  profileId: 'kling-video-family';
  version: '2.1' | '2.6' | '3.0' | 'o1';
  tier: 'standard' | 'pro' | 'master' | 'unknown';
  supportedModes: VideoGenerationMode[];
  supportedDurations: number[];
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  supportsFrameImages: boolean;
  supportedFrameTypes: VideoFrameType[];
  supportsAudioGeneration: boolean;
  allowedPassthroughParameters: string[];
}

export function lookupKlingNativeVideoSpec(model: {
  id: string;
  displayName?: string;
  canonicalSlug?: string;
}): KlingNativeVideoSpec | null {
  const normalized = normalizeKlingToken(
    [model.id, model.displayName, model.canonicalSlug]
      .filter((value): value is string => typeof value === 'string')
      .join(' '),
  );

  if (!/\bkling\b/.test(normalized)) {
    return null;
  }

  if (/\bkling-video-o1\b/.test(normalized) || /\bo1\b/.test(normalized)) {
    return {
      familyId: 'kling',
      profileId: 'kling-video-family',
      version: 'o1',
      tier: 'unknown',
      supportedModes: [
        'text-to-video',
        'image-to-video',
        'multi-image-to-video',
      ],
      supportedDurations: [5, 10],
      supportedAspectRatios: ['16:9'],
      supportedResolutions: ['720p', '1080p'],
      supportsFrameImages: true,
      supportedFrameTypes: ['first_frame', 'last_frame'],
      supportsAudioGeneration: false,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
    };
  }

  if (/\b(v21|2-1|2\.1)\b/.test(normalized)) {
    return {
      familyId: 'kling',
      profileId: 'kling-video-family',
      version: '2.1',
      tier: resolveKlingTier(normalized),
      supportedModes: ['image-to-video'],
      supportedDurations: [5, 10],
      supportedAspectRatios: ['16:9'],
      supportedResolutions: ['720p', '1080p'],
      supportsFrameImages: false,
      supportedFrameTypes: [],
      supportsAudioGeneration: false,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
    };
  }

  if (/\b(v26|2-6|2\.6)\b/.test(normalized)) {
    return {
      familyId: 'kling',
      profileId: 'kling-video-family',
      version: '2.6',
      tier: resolveKlingTier(normalized),
      supportedModes: ['text-to-video', 'image-to-video'],
      supportedDurations: [5, 10],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      supportedResolutions: ['720p', '1080p'],
      supportsFrameImages: true,
      supportedFrameTypes: ['first_frame', 'last_frame'],
      supportsAudioGeneration: true,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
    };
  }

  if (/\b(v30|3-0|3\.0)\b/.test(normalized)) {
    return {
      familyId: 'kling',
      profileId: 'kling-video-family',
      version: '3.0',
      tier: resolveKlingTier(normalized),
      supportedModes: ['text-to-video', 'image-to-video'],
      supportedDurations: [5, 10],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      supportedResolutions: ['720p', '1080p'],
      supportsFrameImages: true,
      supportedFrameTypes: ['first_frame', 'last_frame'],
      supportsAudioGeneration: true,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
    };
  }

  return null;
}

export function buildUnknownKlingNativeSpecDiagnostic(): UnsupportedFeatureReason {
  return {
    code: 'low_confidence_inference',
    feature: 'kling-native-spec',
    message:
      'Kling model family detected, but the native Kling version/tier could not be resolved confidently from the model identity.',
  };
}

function resolveKlingTier(
  normalized: string,
): KlingNativeVideoSpec['tier'] {
  if (/\bmaster\b/.test(normalized)) {
    return 'master';
  }

  if (/\bpro\b/.test(normalized)) {
    return 'pro';
  }

  if (/\bstd\b/.test(normalized) || /\bstandard\b/.test(normalized)) {
    return 'standard';
  }

  return 'unknown';
}

function normalizeKlingToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/\s.]+/g, '-')
    .replace(/-+/g, '-');
}
