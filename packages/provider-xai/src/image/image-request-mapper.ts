import type {
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageReference,
} from '@lxp/contracts';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';

export function buildXAiImageGenerationBody(
  request: GatewayImageGenerationRequest,
) {
  return {
    model: request.model,
    prompt: request.prompt,
    n: request.n,
    aspect_ratio: request.aspectRatio,
    response_format: request.responseFormat,
    resolution: request.resolution,
  };
}

export async function buildXAiImageEditBody(
  request: GatewayImageEditRequest,
  lookupHostname: (hostname: string) => Promise<Array<{ address: string; family: number }>>,
) {
  const mappedImages = await Promise.all(
    request.images.map((image) => mapXAiImageReference(image, lookupHostname)),
  );

  return {
    model: request.model,
    prompt: request.prompt,
    n: request.n,
    aspect_ratio: request.aspectRatio,
    response_format: request.responseFormat,
    resolution: request.resolution,
    image: mappedImages.length === 1 ? mappedImages[0] : undefined,
    images: mappedImages.length > 1 ? mappedImages : undefined,
  };
}

async function mapXAiImageReference(
  image: GatewayImageReference,
  lookupHostname: (hostname: string) => Promise<Array<{ address: string; family: number }>>,
) {
  const resolvedReference = await resolveGatewayImageReference(image, {
    mode: 'passthrough-url',
    lookupHostname,
  });

  return {
    type: 'image_url' as const,
    url: resolvedReference.url,
  };
}
