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
    url: image.url,
    b64Json: image.b64_json,
    revisedPrompt: image.revised_prompt,
  };
}
