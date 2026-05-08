import type { ProviderId } from './index.js';

export type MediaGenerationStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type MediaAssetKind = 'image' | 'video' | 'audio';

export type Modality =
  | 'chat'
  | 'image'
  | 'video'
  | 'audio'
  | 'speech-to-text'
  | 'text-to-speech'
  | 'moderation'
  | 'embeddings'
  | 'batch';

export type ModelFamilyId = string;

export type ModelFamilyProfileId = string;

export interface CapabilityDescriptor {
  key: string;
  label: string;
  description?: string;
  category?: string;
  value?: string | number | boolean;
}

export interface CapabilityMode {
  id: string;
  label: string;
  description?: string;
}

export interface NormalizedParameterSchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | string[] | number[] | null;
  allowedValues?: Array<string | number | boolean>;
  minimum?: number;
  maximum?: number;
  step?: number;
  properties?: Record<string, NormalizedParameterSchema>;
  items?: NormalizedParameterSchema;
}

export interface ProviderPassthroughSchema {
  strategy: 'allow-list';
  namespace?: string;
  allowedParameters: string[];
  notes?: string[];
}

export interface UiCapabilityHints {
  recommendedMode?: string;
  preferredAspectRatio?: string;
  chips?: CapabilityDescriptor[];
  previewableFields?: string[];
  hiddenFields?: string[];
}

export interface UnsupportedFeatureReason {
  code: string;
  message: string;
  field?: string;
  feature?: string;
}

export interface FamilyValidationResult {
  ok: boolean;
  normalizedMode?: string;
  issues: UnsupportedFeatureReason[];
}

export type VideoFrameType = 'first_frame' | 'last_frame';

export type VideoGenerationMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'multi-image-to-video'
  | 'video-extension'
  | 'lip-sync';

export interface VideoInputRequirement {
  mode: VideoGenerationMode;
  minReferenceImages?: number;
  maxReferenceImages?: number;
  supportsReferenceImages?: boolean;
  supportsFrameImages?: boolean;
  supportedFrameTypes?: VideoFrameType[];
  notes?: string[];
}

export interface VideoFrameImageSupport {
  supportedFrameTypes: VideoFrameType[];
  maxFrameImages?: number;
  allowsFirstFrame?: boolean;
  allowsLastFrame?: boolean;
}

export interface VideoDurationConstraint {
  allowedValues?: number[];
  minSeconds?: number;
  maxSeconds?: number;
  defaultSeconds?: number;
}

export interface VideoAspectRatioConstraint {
  allowedValues?: string[];
  defaultValue?: string;
}

export interface VideoResolutionConstraint {
  allowedValues?: string[];
  defaultValue?: string;
}

export interface VideoAudioSupport {
  supportsGeneration: boolean;
  defaultEnabled?: boolean;
  unsupportedReason?: UnsupportedFeatureReason;
}

export interface VideoProviderPassthroughRules {
  providerId?: ProviderId | string;
  schema: ProviderPassthroughSchema;
}

export interface VideoFamilyCapabilityProfile {
  generationModes: VideoGenerationMode[];
  inputRequirements: VideoInputRequirement[];
  frameImageSupport?: VideoFrameImageSupport;
  durationConstraint?: VideoDurationConstraint;
  aspectRatioConstraint?: VideoAspectRatioConstraint;
  resolutionConstraint?: VideoResolutionConstraint;
  audioSupport?: VideoAudioSupport;
  providerPassthroughRules?: VideoProviderPassthroughRules[];
  unsupportedFeatures?: UnsupportedFeatureReason[];
}

export interface ModelFamilyProfile {
  familyId: ModelFamilyId;
  profileId: ModelFamilyProfileId;
  modality: Modality;
  displayName: string;
  summary?: string;
  capabilityDescriptors?: CapabilityDescriptor[];
  parameterSchema?: Record<string, NormalizedParameterSchema>;
  uiHints?: UiCapabilityHints;
  video?: VideoFamilyCapabilityProfile;
}

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
  capabilityDiagnostics?: UnsupportedFeatureReason[];
  family?: ModelFamilyProfile;
}

export interface VideoProviderModelCatalogEntry {
  id: string;
  displayName: string;
  capabilities: Partial<VideoModelCapability>;
  family?: ModelFamilyProfile;
}

export interface VideoProviderCatalog {
  providerId: ProviderId;
  defaultModelId: string | null;
  models: VideoProviderModelCatalogEntry[];
}
