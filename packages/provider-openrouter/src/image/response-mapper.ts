import type {
  GatewayGeneratedImage,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  parseDataUrlReference,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

interface OpenRouterGeneratedImage {
  type?: string;
  image_url?: {
    url?: string;
  };
  imageUrl?: {
    url?: string;
  };
}

export interface OpenRouterImageResponsePayload {
  id?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      role?: 'assistant';
      content?: string;
      images?: OpenRouterGeneratedImage[];
    };
  }>;
}

export function mapOpenRouterImageResponse(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: OpenRouterImageResponsePayload,
): GatewayImageGenerationResponse {
  const message = payload.choices?.[0]?.message;

  return {
    requestId: context.requestId,
    providerId: 'openrouter',
    model: payload.model ?? requestedModel,
    images: (message?.images ?? []).map(mapOpenRouterGeneratedImage),
    providerMetadata: {
      id: payload.id,
      created: payload.created,
      assistantMessage: message?.content,
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
    },
  };
}

function mapOpenRouterGeneratedImage(
  image: OpenRouterGeneratedImage,
): GatewayGeneratedImage {
  const imageUrl = image.image_url?.url ?? image.imageUrl?.url;
  if (!imageUrl) {
    return {};
  }

  if (imageUrl.startsWith('data:')) {
    const parsedDataUrl = parseDataUrlReference(imageUrl);
    return {
      b64Json: parsedDataUrl.dataBase64,
      mimeType: parsedDataUrl.mimeType,
    };
  }

  return {
    url: imageUrl,
  };
}
