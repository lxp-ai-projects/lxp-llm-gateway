import type { GatewayImageGenerationResponse } from '@lxp/contracts';
import type { CanonicalImageResult, ProviderExecutionContext } from '@lxp/provider-sdk';

export interface ZaiGeneratedImage {
  url?: string;
}

export interface ZaiImageResponsePayload {
  created?: number;
  data?: ZaiGeneratedImage[];
  content_filter?: unknown;
}

export function mapZaiImageResponse(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: ZaiImageResponsePayload,
): GatewayImageGenerationResponse {
  return {
    requestId: context.requestId,
    providerId: 'zai',
    model: requestedModel,
    images: (payload.data ?? []).flatMap((image) => {
      const mappedImage = mapZaiGeneratedImage(image);
      return mappedImage ? [mappedImage] : [];
    }),
    providerMetadata: {
      created: payload.created,
      ...(Array.isArray(payload.content_filter)
        ? { content_filter: payload.content_filter }
        : {}),
    },
  };
}

function mapZaiGeneratedImage(
  image: ZaiGeneratedImage,
): CanonicalImageResult | null {
  if (!image.url) {
    return null;
  }

  return {
    url: image.url,
  };
}
