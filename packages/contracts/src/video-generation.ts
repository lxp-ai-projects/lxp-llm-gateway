import type {
  ModelFamilyProfile,
  MediaGenerationStatus,
  ProviderId,
  VideoFrameType,
} from '@lxp/domain';

export type GatewayVideoReference =
  | {
      type: 'image_url';
      url: string;
    }
  | {
      type: 'data_url';
      url: string;
      mimeType?: string;
    }
  | {
      type: 'asset';
      assetId: string;
    };

export interface GatewayVideoFrameImageReference {
  image: GatewayVideoReference;
  frameType: VideoFrameType;
}

export interface GatewayVideoGenerationRequest {
  providerId?: ProviderId;
  model?: string;
  idempotencyKey?: string;
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  size?: string;
  generateAudio?: boolean;
  seed?: number;
  frameImages?: GatewayVideoFrameImageReference[];
  referenceImages?: GatewayVideoReference[];
  providerOptions?: Record<string, unknown>;
}

export type GatewayVideoRetryRequest = Omit<
  GatewayVideoGenerationRequest,
  'idempotencyKey'
>;

export interface GatewayVideoOutput {
  assetId?: string;
  contentUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  byteSize?: number;
  saved?: boolean;
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayVideoGenerationJob {
  id: string;
  requestId: string;
  providerId: ProviderId;
  model: string;
  prompt: string;
  status: MediaGenerationStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  durationMs?: number;
  error?: string;
  request?: GatewayVideoRetryRequest;
  outputs: GatewayVideoOutput[];
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayVideoCatalogModel {
  id: string;
  displayName: string;
  family?: ModelFamilyProfile;
  capabilities?: {
    supportsStreaming?: boolean;
    supportsVideoGeneration?: boolean;
    requiresPaidAccess?: boolean;
    supportedVideoAspectRatios?: Array<{
      value: string;
      label: string;
      useCase?: string;
    }>;
    supportedVideoResolutions?: Array<{
      value: string;
      label: string;
    }>;
    supportedVideoSizes?: Array<{
      value: string;
      label: string;
    }>;
    supportedVideoDurations?: Array<{
      value: number;
      label: string;
      description?: string;
    }>;
    supportedVideoFrameTypes?: Array<'first_frame' | 'last_frame'>;
    supportsVideoReferenceImages?: boolean;
    supportsVideoAudioGeneration?: boolean;
    allowedVideoProviderParameters?: string[];
    maxGeneratedVideosPerRequest?: number;
    maxReferenceImagesPerRequest?: number;
    videoDefaults?: {
      durationSeconds?: number;
      aspectRatio?: string;
      resolution?: string;
      size?: string;
      generateAudio?: boolean;
      videoCount?: number;
    };
    pricingSkus?: Record<string, string>;
    family?: ModelFamilyProfile;
  };
}

export interface GatewayVideoCatalogProvider {
  providerId: ProviderId;
  displayName: string;
  defaultModelId: string | null;
  models: GatewayVideoCatalogModel[];
}

export interface GatewayVideoCatalogResponse {
  providers: GatewayVideoCatalogProvider[];
}
