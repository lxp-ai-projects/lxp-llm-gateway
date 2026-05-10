import type { CanonicalVideoGenerationRequest } from '@lxp/provider-sdk';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';
import { detectKlingVideoFamily } from '@lxp/model-family-capabilities';

export async function buildOpenRouterVideoGenerationRequest(
  request: CanonicalVideoGenerationRequest,
) {
  const requestedModel = request.model ?? '';
  const resolvedFrameImages = request.frameImages
    ? await Promise.all(
        request.frameImages.map(async (frame) => ({
          type: 'image_url' as const,
          frame_type: frame.frameType,
          image_url: {
            url: (
              await resolveGatewayImageReference(frame.image, {
                mode: 'passthrough-url',
              })
            ).url,
          },
        })),
      )
    : [];

  const resolvedReferences = request.referenceImages
    ? await Promise.all(
        request.referenceImages.map(async (image) => {
          const resolved = await resolveGatewayImageReference(image, {
            mode: 'passthrough-url',
          });

          return {
            type: 'image_url' as const,
            image_url: {
              url: resolved.url,
            },
          };
        }),
      )
    : [];
  const shouldPromoteSingleReferenceToFirstFrame =
    resolvedFrameImages.length === 0 &&
    resolvedReferences.length === 1 &&
    detectKlingVideoFamily({
      id: requestedModel,
      displayName: requestedModel,
      canonicalSlug: requestedModel,
    });
  const frame_images = shouldPromoteSingleReferenceToFirstFrame
      ? [
        {
          type: 'image_url' as const,
          frame_type: 'first_frame' as const,
          image_url: resolvedReferences[0]!.image_url,
        },
      ]
    : resolvedFrameImages.length
      ? resolvedFrameImages
      : undefined;
  const input_references = shouldPromoteSingleReferenceToFirstFrame
    ? undefined
    : resolvedReferences.length
      ? resolvedReferences
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
