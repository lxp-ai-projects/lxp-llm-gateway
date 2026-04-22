import type {
  GatewayGeneratedImage,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface OpenAiGeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface OpenAiImageResponsePayload {
  created?: number;
  data?: OpenAiGeneratedImage[];
}

export function mapOpenAiImageResponse(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: OpenAiImageResponsePayload,
): GatewayImageGenerationResponse {
  return {
    requestId: context.requestId,
    providerId: 'openai',
    model: requestedModel,
    images: (payload.data ?? []).map(mapOpenAiGeneratedImage),
    providerMetadata: {
      created: payload.created,
    },
  };
}

function mapOpenAiGeneratedImage(
  image: OpenAiGeneratedImage,
): GatewayGeneratedImage {
  return {
    ...(image.url ? { url: image.url } : {}),
    ...(image.b64_json ? { b64Json: image.b64_json } : {}),
    ...(image.revised_prompt ? { revisedPrompt: image.revised_prompt } : {}),
  };
}
