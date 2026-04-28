import type {
  GatewayImageAssetSummary,
  GatewayImageCatalogProvider,
  GatewayGeneratedImage,
} from '../../lib/api-client.types';

export type ImageReferenceDraft =
  | {
      id: string;
      kind: 'asset';
      assetId: string;
      label: string;
      previewUrl: string;
      sourceType: 'upload' | 'generated';
    }
  | {
      id: string;
      kind: 'image_url';
      url: string;
      label: string;
      previewUrl: string;
    };

export type ImageLabResult = GatewayGeneratedImage;

export type ImageLabSelectedCatalog = {
  provider: GatewayImageCatalogProvider | undefined;
  model:
    | GatewayImageCatalogProvider['models'][number]
    | undefined;
};

export type ImageLabReferenceAsset = GatewayImageAssetSummary;
