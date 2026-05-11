import type { GatewayImageAssetSummary } from '../../lib/api-client.types';

export type VideoReferenceDraft =
  | {
      id: string;
      kind: 'asset';
      assetId: string;
      label: string;
      previewUrl: string;
      sourceType: GatewayImageAssetSummary['sourceType'];
    }
  | {
      id: string;
      kind: 'image_url';
      url: string;
      label: string;
      previewUrl: string;
    };
