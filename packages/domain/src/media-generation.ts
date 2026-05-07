import type { ProviderId } from './index.js';

export type MediaGenerationStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type MediaAssetKind = 'image' | 'video' | 'audio';

export type VideoFrameType = 'first_frame' | 'last_frame';

export interface VideoAspectRatioOption {
  value: string;
  label: string;
  useCase?: string;
}

export interface VideoResolutionOption {
  value: string;
  label: string;
}

export interface VideoSizeOption {
  value: string;
  label: string;
}

export interface VideoDurationOption {
  value: number;
  label: string;
  description?: string;
}

export interface VideoModelDefaults {
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  size?: string;
  generateAudio?: boolean;
  videoCount?: number;
}

export interface VideoModeCapabilityOptions {
  supportedVideoAspectRatios?: VideoAspectRatioOption[];
  supportedVideoResolutions?: VideoResolutionOption[];
  supportedVideoSizes?: VideoSizeOption[];
  supportedVideoDurations?: VideoDurationOption[];
  supportedVideoFrameTypes?: VideoFrameType[];
  supportsVideoReferenceImages?: boolean;
  supportsVideoAudioGeneration?: boolean;
  allowedVideoProviderParameters?: string[];
  maxGeneratedVideosPerRequest?: number;
  maxReferenceImagesPerRequest?: number;
  videoDefaults?: VideoModelDefaults;
  pricingSkus?: Record<string, string>;
}

export interface VideoModelCapability extends VideoModeCapabilityOptions {
  id: string;
  supportsStreaming: boolean;
  supportsVideoGeneration?: boolean;
  requiresPaidAccess?: boolean;
}

export interface VideoProviderModelCatalogEntry {
  id: string;
  displayName: string;
  capabilities: Partial<VideoModelCapability>;
}

export interface VideoProviderCatalog {
  providerId: ProviderId;
  defaultModelId: string | null;
  models: VideoProviderModelCatalogEntry[];
}
