import type { GatewayImageGenerationResponse } from '@lxp/contracts';
import type { CanonicalImageResult, ProviderExecutionContext } from '@lxp/provider-sdk';

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
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: XAiImageResponsePayload,
): GatewayImageGenerationResponse {
  return {
    requestId: context.requestId,
    providerId: 'xai',
    model: payload.model ?? requestedModel,
    images: (payload.data ?? []).map(mapXAiGeneratedImage),
    providerMetadata: {
      created: payload.created,
    },
  };
}

function mapXAiGeneratedImage(image: XAiGeneratedImage): CanonicalImageResult {
  return {
    ...(image.url ? { url: image.url } : {}),
    ...(image.b64_json ? { b64Json: image.b64_json } : {}),
    ...(image.revised_prompt ? { revisedPrompt: image.revised_prompt } : {}),
  };
}
