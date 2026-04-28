import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';

import { resolveOpenRouterImageOutputModalities } from './catalog.js';

export function buildOpenRouterImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
  userId: string,
) {
  const imageConfig: Record<string, string | number> = {};

  if (request.aspectRatio) {
    imageConfig.aspect_ratio = request.aspectRatio;
  }

  if (request.resolution) {
    if (model.id.startsWith('google/')) {
      imageConfig.image_size = request.resolution;
    } else {
      imageConfig.size = request.resolution;
    }
  }

  if (request.background) {
    imageConfig.background = request.background;
  }

  if (request.quality) {
    imageConfig.quality = request.quality;
  }

  if (request.moderation) {
    imageConfig.moderation = request.moderation;
  }

  if (request.outputFormat) {
    imageConfig.output_format = request.outputFormat;
  }

  if (request.outputCompression !== undefined) {
    imageConfig.output_compression = request.outputCompression;
  }

  return {
    model: model.id,
    messages: [
      {
        role: 'user' as const,
        content: request.prompt,
      },
    ],
    modalities: resolveOpenRouterImageOutputModalities(model.id),
    stream: false,
    user: userId,
    ...(Object.keys(imageConfig).length > 0 ? { image_config: imageConfig } : {}),
  };
}

export async function buildOpenRouterImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
  userId: string,
) {
  const imageConfig: Record<string, string | number> = {};

  if (request.aspectRatio) {
    imageConfig.aspect_ratio = request.aspectRatio;
  }

  if (request.resolution) {
    if (model.id.startsWith('google/')) {
      imageConfig.image_size = request.resolution;
    } else {
      imageConfig.size = request.resolution;
    }
  }

  if (request.background) {
    imageConfig.background = request.background;
  }

  if (request.quality) {
    imageConfig.quality = request.quality;
  }

  if (request.moderation) {
    imageConfig.moderation = request.moderation;
  }

  if (request.outputFormat) {
    imageConfig.output_format = request.outputFormat;
  }

  if (request.outputCompression !== undefined) {
    imageConfig.output_compression = request.outputCompression;
  }

  if (request.inputFidelity) {
    imageConfig.input_fidelity = request.inputFidelity;
  }

  const imageContent = await Promise.all(
    request.images.map(async (image) => {
      const resolvedReference = await resolveGatewayImageReference(image, {
        mode: 'passthrough-url',
      });

      return {
        type: 'image_url' as const,
        image_url: {
          url: resolvedReference.url,
        },
      };
    }),
  );

  return {
    model: model.id,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: request.prompt,
          },
          ...imageContent,
        ],
      },
    ],
    modalities: resolveOpenRouterImageOutputModalities(model.id),
    stream: false,
    user: userId,
    ...(Object.keys(imageConfig).length > 0 ? { image_config: imageConfig } : {}),
  };
}
