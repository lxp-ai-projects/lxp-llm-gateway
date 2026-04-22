import type {
  GatewayImageEditRequest,
  GatewayImageReference,
} from '@lxp/contracts';
import {
  resolveGatewayImageReference,
} from '@lxp/provider-sdk';

export async function buildOpenAiImageEditBody(
  request: GatewayImageEditRequest,
  input: {
    userId: string;
  },
) {
  return {
    model: request.model,
    prompt: request.prompt,
    images: await Promise.all(
      request.images.map((image) => mapOpenAiImageReference(image)),
    ),
    n: request.n,
    background: request.background,
    input_fidelity: request.inputFidelity,
    output_format: request.outputFormat,
    output_compression: request.outputCompression,
    quality: request.quality,
    size: request.resolution,
    user: input.userId,
  };
}

async function mapOpenAiImageReference(image: GatewayImageReference) {
  const resolvedReference = await resolveGatewayImageReference(image, {
    mode: 'passthrough-url',
  });

  return {
    image_url: resolvedReference.url,
  };
}
