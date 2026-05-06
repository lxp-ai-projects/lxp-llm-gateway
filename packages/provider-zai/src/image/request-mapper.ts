import type {
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

export function buildZaiImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
  userId: string,
) {
  return {
    model: model.id,
    prompt: request.prompt,
    quality: request.quality,
    size: request.resolution,
    user_id: userId,
  };
}
