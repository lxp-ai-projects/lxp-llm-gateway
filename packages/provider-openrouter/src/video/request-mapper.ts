import type { CanonicalVideoGenerationRequest } from '@lxp/provider-sdk';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';

export async function buildOpenRouterVideoGenerationRequest(
  request: CanonicalVideoGenerationRequest,
) {
  const frame_images = request.frameImages
    ? await Promise.all(
        request.frameImages.map(async (frame) => {
          const resolved = await resolveGatewayImageReference(frame.image, {
            mode: 'passthrough-url',
          });

          return {
            frame_type: frame.frameType,
            image_url: {
              url: resolved.url,
            },
          };
        }),
      )
    : undefined;

  const input_references = request.referenceImages
    ? await Promise.all(
        request.referenceImages.map(async (image) => {
          const resolved = await resolveGatewayImageReference(image, {
            mode: 'passthrough-url',
          });

          return {
            image_url: {
              url: resolved.url,
            },
          };
        }),
      )
    : undefined;

  return {
    model: request.model,
    prompt: request.prompt,
    ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
    ...(typeof request.durationSeconds === 'number'
      ? { duration: request.durationSeconds }
      : {}),
    ...(request.resolution ? { resolution: request.resolution } : {}),
    ...(request.size ? { size: request.size } : {}),
    ...(typeof request.generateAudio === 'boolean'
      ? { generate_audio: request.generateAudio }
      : {}),
    ...(typeof request.seed === 'number' ? { seed: request.seed } : {}),
    ...(frame_images?.length ? { frame_images } : {}),
    ...(input_references?.length ? { input_references } : {}),
    ...(request.providerOptions ? { provider: request.providerOptions } : {}),
  };
}
