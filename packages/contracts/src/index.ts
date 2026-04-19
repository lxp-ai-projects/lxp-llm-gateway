import type { ProviderId } from '@lxp/domain';

export interface GatewayChatRequest {
  providerId?: ProviderId;
  model?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
}

export interface GatewayChatResponse {
  requestId: string;
  providerId: string;
  model: string;
  message: {
    role: 'assistant';
    content: string;
    reasoning?: string;
    reasoningDetails?: unknown;
  };
  finishReason?: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
  providerMetadata?: Record<string, unknown>;
}

export type GatewayImageReference =
  | {
      type: 'image_url';
      url: string;
    }
  | {
      type: 'data_url';
      url: string;
      mimeType?: string;
    };

export type GatewayImageResponseFormat = 'url' | 'b64_json';

export interface GatewayImageGenerationRequest {
  providerId?: ProviderId;
  model?: string;
  prompt: string;
  n?: number;
  aspectRatio?: string;
  responseFormat?: GatewayImageResponseFormat;
}

export interface GatewayImageEditRequest {
  providerId?: ProviderId;
  model?: string;
  prompt: string;
  images: GatewayImageReference[];
  n?: number;
  aspectRatio?: string;
  responseFormat?: GatewayImageResponseFormat;
}

export interface GatewayGeneratedImage {
  url?: string;
  b64Json?: string;
  mimeType?: string;
  revisedPrompt?: string;
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayImageGenerationResponse {
  requestId: string;
  providerId: string;
  model: string;
  images: GatewayGeneratedImage[];
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayErrorResponse {
  code: string;
  message: string;
}
