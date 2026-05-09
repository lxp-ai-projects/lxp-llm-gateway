import type { CanonicalVideoGenerationRequest } from '@lxp/provider-sdk';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';

type XAiVideoMode =
  | 'reference-to-video'
  | 'edit-video'
  | 'extend-video';

type XAiVideoTransportRequest =
  | {
      endpoint: '/videos/generations';
      body: Record<string, unknown>;
    }
  | {
      endpoint: '/videos/edits';
      body: Record<string, unknown>;
    }
  | {
      endpoint: '/videos/extensions';
      body: Record<string, unknown>;
    };

export async function buildXAiVideoGenerationRequest(
  request: CanonicalVideoGenerationRequest,
): Promise<XAiVideoTransportRequest> {
  if (request.frameImages?.length) {
    throw new Error(
      'xAI video transport does not support frameImages. Use referenceImages for image-conditioned generation or xai.mode provider options for edit/extend flows.',
    );
  }

  const xaiOptions = readXAiVideoProviderOptions(request.providerOptions);
  const resolvedRequestReferences = request.referenceImages
    ? await Promise.all(
        request.referenceImages.map((image) =>
          resolveGatewayImageReference(image, {
            mode: 'passthrough-url',
          }),
        ),
      )
    : [];
  const providerReferenceUrls = (xaiOptions.referenceImageUrls ?? []).filter(Boolean);
  const referenceUrls =
    resolvedRequestReferences.length > 0
      ? resolvedRequestReferences.map((reference) => reference.url)
      : providerReferenceUrls;

  if (xaiOptions.mode === 'edit-video') {
    if (!xaiOptions.videoUrl) {
      throw new Error(
        'xAI edit-video requests require providerOptions.xai.videoUrl.',
      );
    }

    return {
      endpoint: '/videos/edits',
      body: {
        model: request.model,
        prompt: request.prompt,
        video_url: xaiOptions.videoUrl,
      },
    };
  }

  if (xaiOptions.mode === 'extend-video') {
    if (!xaiOptions.videoUrl) {
      throw new Error(
        'xAI extend-video requests require providerOptions.xai.videoUrl.',
      );
    }

    return {
      endpoint: '/videos/extensions',
      body: {
        model: request.model,
        prompt: request.prompt,
        ...(typeof request.durationSeconds === 'number'
          ? { duration: request.durationSeconds }
          : {}),
        video: {
          url: xaiOptions.videoUrl,
        },
      },
    };
  }

  if (referenceUrls.length > 0 && xaiOptions.mode !== 'reference-to-video' && referenceUrls.length === 1) {
    return {
      endpoint: '/videos/generations',
      body: {
        model: request.model,
        prompt: request.prompt,
        image: {
          url: referenceUrls[0],
        },
        ...(typeof request.durationSeconds === 'number'
          ? { duration: request.durationSeconds }
          : {}),
        ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
        ...(request.resolution ? { resolution: request.resolution } : {}),
        ...(typeof request.seed === 'number' ? { seed: request.seed } : {}),
      },
    };
  }

  if (referenceUrls.length > 0) {
    return {
      endpoint: '/videos/generations',
      body: {
        model: request.model,
        prompt: request.prompt,
        reference_images: referenceUrls.map((url) => ({ url })),
        ...(typeof request.durationSeconds === 'number'
          ? { duration: request.durationSeconds }
          : {}),
        ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
        ...(request.resolution ? { resolution: request.resolution } : {}),
        ...(typeof request.seed === 'number' ? { seed: request.seed } : {}),
      },
    };
  }

  return {
    endpoint: '/videos/generations',
    body: {
      model: request.model,
      prompt: request.prompt,
      ...(typeof request.durationSeconds === 'number'
        ? { duration: request.durationSeconds }
        : {}),
      ...(request.aspectRatio ? { aspect_ratio: request.aspectRatio } : {}),
      ...(request.resolution ? { resolution: request.resolution } : {}),
      ...(typeof request.seed === 'number' ? { seed: request.seed } : {}),
    },
  };
}

function readXAiVideoProviderOptions(providerOptions: Record<string, unknown> | undefined): {
  mode?: XAiVideoMode;
  videoUrl?: string;
  referenceImageUrls?: string[];
} {
  const xaiOptions = providerOptions?.xai;
  if (!xaiOptions || typeof xaiOptions !== 'object' || Array.isArray(xaiOptions)) {
    return {};
  }

  const rawMode = 'mode' in xaiOptions ? xaiOptions.mode : undefined;
  const rawVideoUrl = 'videoUrl' in xaiOptions ? xaiOptions.videoUrl : undefined;
  const rawReferenceImageUrls =
    'referenceImageUrls' in xaiOptions ? xaiOptions.referenceImageUrls : undefined;

  return {
    mode:
      rawMode === 'reference-to-video' ||
      rawMode === 'edit-video' ||
      rawMode === 'extend-video'
        ? rawMode
        : undefined,
    videoUrl: typeof rawVideoUrl === 'string' ? rawVideoUrl : undefined,
    referenceImageUrls: Array.isArray(rawReferenceImageUrls)
      ? rawReferenceImageUrls.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        )
      : undefined,
  };
}
