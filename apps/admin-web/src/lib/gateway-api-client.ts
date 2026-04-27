import {
  chatStreamWithSessionRefresh,
  gatewayApiUrl,
  request,
} from './api-base';
import type {
  GatewayChatMessage,
  GatewayChatResponse,
  GatewayChatStreamChunk,
  GatewayChatStreamResult,
  GatewayImageAssetListResponse,
  GatewayImageAssetSummary,
  GatewayImageAssetUpdateRequest,
  GatewayImageCatalogResponse,
  GatewayImageGenerationResponse,
  GatewayImageHistoryResponse,
  GatewayImageReference,
  ProviderModelSummary,
} from './api-client.types';

const IMAGE_REQUEST_TIMEOUT_MS = 300000;

export const gatewayApiClient = {
  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>(`${gatewayApiUrl}/api/v1/health`);
  },

  async getImageCatalog(): Promise<GatewayImageCatalogResponse> {
    return request<GatewayImageCatalogResponse>(
      `${gatewayApiUrl}/api/v1/images/catalog`,
    );
  },

  async getModels(providerId = 'nanogpt'): Promise<{
    providerId: string;
    models: ProviderModelSummary[];
  }> {
    const endpoint = providerId
      ? `${gatewayApiUrl}/api/v1/models?providerId=${encodeURIComponent(providerId)}`
      : `${gatewayApiUrl}/api/v1/models`;

    return request(endpoint);
  },

  async chat(payload: {
    providerId?: string;
    model?: string;
    stream: false;
    messages: GatewayChatMessage[];
  }): Promise<GatewayChatResponse> {
    return request<GatewayChatResponse>(`${gatewayApiUrl}/api/v1/chat`, {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 90000,
    });
  },

  async chatStream(
    payload: {
      providerId?: string;
      model?: string;
      stream: true;
      messages: GatewayChatMessage[];
    },
    handlers: {
      onChunk: (chunk: GatewayChatStreamChunk) => void;
    },
  ): Promise<GatewayChatStreamResult> {
    return chatStreamWithSessionRefresh(payload, handlers, false);
  },

  async generateImage(payload: {
    providerId?: string;
    model?: string;
    prompt: string;
    n?: number;
    aspectRatio?: string;
    responseFormat?: 'url' | 'b64_json';
    resolution?: string;
    background?: string;
    quality?: string;
    moderation?: string;
    outputFormat?: string;
    outputCompression?: number;
  }): Promise<GatewayImageGenerationResponse> {
    return request<GatewayImageGenerationResponse>(
      `${gatewayApiUrl}/api/v1/images/generations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: IMAGE_REQUEST_TIMEOUT_MS,
      },
    );
  },

  async editImage(payload: {
    providerId?: string;
    model?: string;
    prompt: string;
    images: GatewayImageReference[];
    n?: number;
    aspectRatio?: string;
    responseFormat?: 'url' | 'b64_json';
    resolution?: string;
    background?: string;
    quality?: string;
    moderation?: string;
    outputFormat?: string;
    outputCompression?: number;
    inputFidelity?: string;
  }): Promise<GatewayImageGenerationResponse> {
    return request<GatewayImageGenerationResponse>(
      `${gatewayApiUrl}/api/v1/images/edits`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: IMAGE_REQUEST_TIMEOUT_MS,
      },
    );
  },

  async uploadImageAsset(payload: {
    dataUrl: string;
    label?: string;
  }): Promise<{ asset: GatewayImageAssetSummary }> {
    return request<{ asset: GatewayImageAssetSummary }>(
      `${gatewayApiUrl}/api/v1/images/assets`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 90000,
      },
    );
  },

  async getImageAssets(): Promise<GatewayImageAssetListResponse> {
    return request<GatewayImageAssetListResponse>(
      `${gatewayApiUrl}/api/v1/images/assets`,
    );
  },

  async setImageAssetSaved(
    assetId: string,
    saved: boolean,
  ): Promise<{ asset: GatewayImageAssetSummary }> {
    return request<{ asset: GatewayImageAssetSummary }>(
      `${gatewayApiUrl}/api/v1/images/assets/${encodeURIComponent(assetId)}/save`,
      {
        method: 'PATCH',
        body: JSON.stringify({ saved }),
      },
    );
  },

  async deleteImageAsset(assetId: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(
      `${gatewayApiUrl}/api/v1/images/assets/${encodeURIComponent(assetId)}`,
      {
        method: 'DELETE',
      },
    );
  },

  async updateImageAsset(
    assetId: string,
    payload: GatewayImageAssetUpdateRequest,
  ): Promise<{ asset: GatewayImageAssetSummary }> {
    return request<{ asset: GatewayImageAssetSummary }>(
      `${gatewayApiUrl}/api/v1/images/assets/${encodeURIComponent(assetId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async getImageHistory(page = 1): Promise<GatewayImageHistoryResponse> {
    return request<GatewayImageHistoryResponse>(
      `${gatewayApiUrl}/api/v1/images/history?page=${encodeURIComponent(String(page))}`,
    );
  },
};
