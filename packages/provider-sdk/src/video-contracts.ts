import type {
  GatewayVideoCatalogResponse,
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
} from '@lxp/contracts';
import type {
  VideoProviderCatalog,
  VideoProviderModelCatalogEntry,
  VideoModelCapability,
} from '@lxp/domain';

export type CanonicalVideoGenerationRequest = GatewayVideoGenerationRequest;
export type CanonicalVideoGenerationJob = GatewayVideoGenerationJob;
export type CanonicalVideoOutput = GatewayVideoGenerationJob['outputs'][number];

export type VideoModelLifecycleStatus = 'active' | 'preview' | 'deprecated';

export interface VideoModelDescriptor extends VideoProviderModelCatalogEntry {
  lifecycleStatus: VideoModelLifecycleStatus;
  capabilities: Partial<VideoModelCapability>;
}

export interface CanonicalVideoProviderCatalog
  extends Omit<VideoProviderCatalog, 'models'> {
  models: VideoModelDescriptor[];
}

export interface GatewayVideoCatalogProviderDescriptor
  extends Omit<GatewayVideoCatalogResponse['providers'][number], 'models'> {
  models: VideoModelDescriptor[];
}
