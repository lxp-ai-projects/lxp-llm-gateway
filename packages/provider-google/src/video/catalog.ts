import type { CanonicalVideoProviderCatalog } from '@lxp/provider-sdk';

export const GOOGLE_VEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.1-lite-generate-preview',
] as const;

export const GOOGLE_OMNI_MODEL = 'gemini-omni-1.1-flash';

export function isGoogleVeoModel(model: string): boolean {
  return GOOGLE_VEO_MODELS.some((candidate) => candidate === model);
}

export function buildGoogleVideoCatalog(): CanonicalVideoProviderCatalog {
  return {
    providerId: 'google',
    defaultModelId: GOOGLE_VEO_MODELS[0],
    models: [
      ...GOOGLE_VEO_MODELS.map((id) => ({
        id,
        displayName: id
          .replace('veo-3.1-', 'Veo 3.1 ')
          .replace('-generate-preview', ' (preview)'),
        lifecycleStatus: 'preview' as const,
        capabilities: {
          supportsStreaming: false,
          supportsVideoGeneration: true,
          supportsVideoReferenceImages: true,
          supportsVideoAudioGeneration: false,
          supportedVideoAspectRatios: [
            { value: '16:9', label: '16:9' },
            { value: '9:16', label: '9:16' },
          ],
          supportedVideoResolutions: [
            { value: '720p', label: '720p' },
            { value: '1080p', label: '1080p' },
            ...(!id.includes('lite') ? [{ value: '4k', label: '4K' }] : []),
          ],
          supportedVideoDurations: [4, 6, 8].map((value) => ({
            value,
            label: `${value} seconds`,
          })),
          maxGeneratedVideosPerRequest: 1,
          maxReferenceImagesPerRequest: 1,
          videoDefaults: {
            durationSeconds: 8,
            aspectRatio: '16:9',
            resolution: '720p',
            videoCount: 1,
            generateAudio: true,
          },
        },
      })),
      {
        id: GOOGLE_OMNI_MODEL,
        displayName: 'Gemini Omni 1.1 Flash',
        lifecycleStatus: 'active',
        capabilities: {
          supportsStreaming: false,
          supportsVideoGeneration: true,
          supportsVideoReferenceImages: true,
          supportsVideoAudioGeneration: false,
          supportedVideoAspectRatios: [
            { value: '16:9', label: '16:9' },
            { value: '9:16', label: '9:16' },
          ],
          supportedVideoResolutions: ['360p', '720p', '1080p', '4k'].map(
            (value) => ({ value, label: value }),
          ),
          maxGeneratedVideosPerRequest: 1,
          maxReferenceImagesPerRequest: 1,
          videoDefaults: {
            aspectRatio: '16:9',
            resolution: '720p',
            videoCount: 1,
          },
        },
      },
    ],
  };
}
