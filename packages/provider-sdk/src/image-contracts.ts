import type {
  GatewayGeneratedImage,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageReference,
} from '@lxp/contracts';
import type {
  ImageProviderCatalog,
  ImageProviderModelCatalogEntry,
  ModelCapability,
} from '@lxp/domain';

export type CanonicalImageGenerateRequest = GatewayImageGenerationRequest;
export type CanonicalImageEditRequest = GatewayImageEditRequest;
export type CanonicalImageAssetReference = GatewayImageReference;
export type CanonicalImageResult = GatewayGeneratedImage;

export type ImageModelLifecycleStatus = 'active' | 'preview' | 'deprecated';

export interface ImageModelCapabilities extends Partial<ModelCapability> {
  supportsStreaming: boolean;
}

export interface ImageModelDescriptor extends ImageProviderModelCatalogEntry {
  lifecycleStatus: ImageModelLifecycleStatus;
  capabilities: ImageModelCapabilities;
}

export interface CanonicalImageProviderCatalog extends Omit<ImageProviderCatalog, 'models'> {
  models: ImageModelDescriptor[];
}
