import type { ProviderModel } from '@lxp/provider-sdk';
import type {
  CanonicalVideoProviderCatalog,
  VideoModelDescriptor,
} from '@lxp/provider-sdk';

export const XAI_VIDEO_MODEL_DESCRIPTORS = [
  {
    id: 'grok-imagine-video',
    displayName: 'Grok Imagine Video',
    lifecycleStatus: 'active',
    capabilities: {
      supportsStreaming: false,
      supportsVideoGeneration: true,
      supportsVideoReferenceImages: true,
      supportsVideoAudioGeneration: false,
      supportedVideoResolutions: [
        { value: '480p', label: '480p' },
        { value: '720p', label: '720p' },
      ],
      supportedVideoDurations: [
        { value: 5, label: '5 seconds' },
        { value: 10, label: '10 seconds' },
        { value: 15, label: '15 seconds' },
      ],
      maxGeneratedVideosPerRequest: 1,
      maxReferenceImagesPerRequest: 7,
      videoDefaults: {
        durationSeconds: 5,
        resolution: '480p',
        videoCount: 1,
      },
      allowedVideoProviderParameters: ['xai'],
    },
  },
] as const satisfies readonly VideoModelDescriptor[];

const XAI_VIDEO_MODEL_MAP = new Map<string, VideoModelDescriptor>(
  XAI_VIDEO_MODEL_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]),
);

export function isXAiVideoModel(modelId: string): boolean {
  return XAI_VIDEO_MODEL_MAP.has(modelId);
}

export function getXAiVideoModelDescriptor(modelId: string) {
  return XAI_VIDEO_MODEL_MAP.get(modelId);
}

export function resolveXAiVideoModelDisplayName(modelId: string): string {
  return XAI_VIDEO_MODEL_MAP.get(modelId)?.displayName ?? modelId;
}

export function resolveXAiVideoModelCapabilities(modelId: string) {
  return (
    XAI_VIDEO_MODEL_MAP.get(modelId)?.capabilities ?? {
      supportsStreaming: true,
    }
  );
}

export function getXAiVideoDefaultModelId() {
  return XAI_VIDEO_MODEL_DESCRIPTORS[0]?.id ?? null;
}

export function buildXAiVideoCatalog(
  models: ProviderModel[],
): CanonicalVideoProviderCatalog {
  return {
    providerId: 'xai',
    defaultModelId: getXAiVideoDefaultModelId(),
    models: models.filter(isVideoCapableModel).map(toVideoModelDescriptor),
  };
}

function isVideoCapableModel(model: ProviderModel) {
  return Boolean(model.capabilities?.supportsVideoGeneration);
}

function toVideoModelDescriptor(model: ProviderModel): VideoModelDescriptor {
  return {
    id: model.id,
    displayName: model.displayName,
    lifecycleStatus: XAI_VIDEO_MODEL_MAP.get(model.id)?.lifecycleStatus ?? 'active',
    capabilities: {
      supportsStreaming: model.capabilities?.supportsStreaming ?? true,
      ...(model.capabilities ?? {}),
    },
  };
}
