import { resolveGatewayImageReference } from '@lxp/provider-sdk';
import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  PublicImageReferencePolicy,
} from '@lxp/provider-sdk';

const NANO_GPT_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export function buildNanoGptImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  userId: string,
) {
  return {
    body: {
      model: request.model,
      prompt: request.prompt,
      n: request.n,
      size: request.resolution,
      response_format: request.responseFormat,
      user: userId,
    },
  };
}

export async function buildNanoGptImageEditRequest(
  request: CanonicalImageEditRequest,
  userId: string,
  policy: Omit<PublicImageReferencePolicy, 'allowedMimeTypes'>,
) {
  const images = await Promise.all(
    request.images.map(async (image) => {
      const resolved = await resolveGatewayImageReference(image, {
        mode: 'download-to-data-url',
        policy: {
          ...policy,
          allowedMimeTypes: NANO_GPT_SUPPORTED_IMAGE_MIME_TYPES,
        },
      });
      return resolved.url;
    }),
  );

  return {
    body: {
      model: request.model,
      prompt: request.prompt,
      n: request.n,
      size: request.resolution,
      response_format: request.responseFormat,
      user: userId,
      ...(images.length <= 1
        ? { imageDataUrl: images[0] }
        : { imageDataUrls: images }),
    },
  };
}
