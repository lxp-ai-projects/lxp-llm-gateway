import { resolveGatewayImageReference } from '@lxp/provider-sdk';
import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

export function buildXAiImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  return {
    model: model.id,
    prompt: request.prompt,
    n: request.n,
    aspect_ratio: request.aspectRatio,
    response_format: request.responseFormat,
    resolution: request.resolution,
  };
}

export async function buildXAiImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
  lookupHostname: (
    hostname: string,
  ) => Promise<Array<{ address: string; family: number }>>,
) {
  const mappedImages = await Promise.all(
    request.images.map((image) => mapXAiImageReference(image, lookupHostname)),
  );

  return {
    model: model.id,
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
  image: CanonicalImageEditRequest['images'][number],
  lookupHostname: (
    hostname: string,
  ) => Promise<Array<{ address: string; family: number }>>,
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
