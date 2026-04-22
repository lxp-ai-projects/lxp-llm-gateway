import type {
  GatewayGeneratedImage,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface XAiGeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface XAiImageResponsePayload {
  created?: number;
  model?: string;
  data?: XAiGeneratedImage[];
}

export function mapXAiImageResponse(
  requestedModel: string | undefined,
  context: ProviderExecutionContext,
  payload: XAiImageResponsePayload,
): GatewayImageGenerationResponse {
  return {
    requestId: context.requestId,
    providerId: 'xai',
    model: payload.model ?? requestedModel ?? 'unknown-model',
    images: (payload.data ?? []).map(mapXAiGeneratedImage),
    providerMetadata: {
      created: payload.created,
    },
  };
}

function mapXAiGeneratedImage(image: XAiGeneratedImage): GatewayGeneratedImage {
  return {
    url: image.url,
    b64Json: image.b64_json,
    revisedPrompt: image.revised_prompt,
  };
}
