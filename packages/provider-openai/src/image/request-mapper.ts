import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  CanonicalImageAssetReference,
} from '@lxp/provider-sdk';
import type { ImageModelDescriptor } from '@lxp/provider-sdk';

export type OpenAiImageTransportRequest =
  | {
      kind: 'json';
      body: Record<string, unknown>;
    }
  | {
      kind: 'multipart';
      body: FormData;
    };

export function buildOpenAiImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
  userId: string,
): OpenAiImageTransportRequest {
  return {
    kind: 'json',
    body: {
      model: model.id,
      prompt: request.prompt,
      n: request.n,
      size: request.resolution,
      background: request.background,
      quality: request.quality,
      output_format: request.outputFormat,
      output_compression: request.outputCompression,
      user: userId,
    },
  };
}

export function buildOpenAiImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
  userId: string,
): OpenAiImageTransportRequest {
  return {
    kind: 'json',
    body: {
      model: model.id,
      prompt: request.prompt,
      images: request.images.map(mapOpenAiReferenceImage),
      background: request.background,
      ...(request.inputFidelity
        ? { input_fidelity: request.inputFidelity }
        : {}),
      output_format: request.outputFormat,
      output_compression: request.outputCompression,
      quality: request.quality,
      size: request.resolution,
      user: userId,
    },
  };
}

function mapOpenAiReferenceImage(image: CanonicalImageAssetReference) {
  if (image.type === 'asset') {
    throw new Error(
      'Gateway-managed image assets must be resolved before OpenAI dispatch.',
    );
  }

  return { image_url: image.url };
}
