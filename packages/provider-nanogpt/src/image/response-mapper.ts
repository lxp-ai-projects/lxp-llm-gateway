import type {
  GatewayGeneratedImage,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface NanoGptGeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface NanoGptImageResponsePayload {
  created?: number;
  data?: NanoGptGeneratedImage[];
  cost?: number;
  paymentSource?: string;
  remainingBalance?: number;
}

export function mapNanoGptImageResponse(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: NanoGptImageResponsePayload,
): GatewayImageGenerationResponse {
  return {
    requestId: context.requestId,
    providerId: 'nanogpt',
    model: requestedModel,
    images: (payload.data ?? []).map(mapNanoGptGeneratedImage),
    providerMetadata: {
      created: payload.created,
      cost: payload.cost,
      paymentSource: payload.paymentSource,
      remainingBalance: payload.remainingBalance,
    },
  };
}

function mapNanoGptGeneratedImage(
  image: NanoGptGeneratedImage,
): GatewayGeneratedImage {
  return {
    ...(image.url ? { url: image.url } : {}),
    ...(image.b64_json ? { b64Json: image.b64_json } : {}),
    ...(image.revised_prompt ? { revisedPrompt: image.revised_prompt } : {}),
  };
}
