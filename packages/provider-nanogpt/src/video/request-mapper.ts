import type { CanonicalVideoGenerationRequest } from '@lxp/provider-sdk';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';

export async function buildNanoGptVideoGenerationRequest(
  request: CanonicalVideoGenerationRequest,
) {
  if (request.frameImages?.length) {
    throw new Error(
      'NanoGPT video transport does not yet support frameImages. Use referenceImages for image-conditioned requests.',
    );
  }

  const resolvedReferences = request.referenceImages
    ? await Promise.all(
        request.referenceImages.map((image) =>
          resolveGatewayImageReference(image, {
            mode: 'passthrough-url',
          }),
        ),
      )
    : [];

  const body: Record<string, unknown> = {
    model: request.model,
    prompt: request.prompt,
    ...(typeof request.durationSeconds === 'number'
      ? { duration: String(request.durationSeconds) }
      : {}),
    ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
    ...(request.resolution ? { resolution: request.resolution } : {}),
    ...(request.size ? { size: request.size } : {}),
    ...(typeof request.generateAudio === 'boolean'
      ? { generateAudio: request.generateAudio }
      : {}),
    ...(typeof request.seed === 'number' ? { seed: request.seed } : {}),
    ...(request.providerOptions ?? {}),
  };

  if (resolvedReferences.length === 1) {
    const [reference] = resolvedReferences;
    body.mode = 'image-to-video';
    if (reference?.url.startsWith('data:')) {
      body.imageDataUrl = reference.url;
    } else {
      body.imageUrl = reference?.url;
    }
    return { body };
  }

  if (resolvedReferences.length > 1) {
    body.mode = 'reference-to-video';
    body.referenceImages = resolvedReferences.map((reference) => reference.url);
    return { body };
  }

  body.mode = 'text-to-video';
  return { body };
}
