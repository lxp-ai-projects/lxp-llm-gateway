import {
  parseDataUrlReference,
  resolveGatewayImageReference,
} from '@lxp/provider-sdk';
import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  ImageModelDescriptor,
} from '@lxp/provider-sdk';

const GOOGLE_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function buildGoogleImageGenerationRequest(
  request: CanonicalImageGenerateRequest,
  model: ImageModelDescriptor,
) {
  void model;
  return buildGoogleGenerateContentRequest({
    prompt: request.prompt,
    images: [],
    n: request.n,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
  });
}

export async function buildGoogleImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
  policy: {
    lookupHostname: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>;
    fetchWithTimeout: (
      url: string,
      init: RequestInit,
      timeoutMs: number | null,
    ) => Promise<Response>;
    timeoutMs: number;
    maxInlineReferenceBytes: number;
  },
) {
  void model;
  return buildGoogleGenerateContentRequest({
    prompt: request.prompt,
    images: request.images,
    n: request.n,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    ...policy,
  });
}

async function buildGoogleGenerateContentRequest(input: {
  prompt: string;
  images: CanonicalImageEditRequest['images'];
  n?: number;
  aspectRatio?: string;
  resolution?: string;
  lookupHostname?: (
    hostname: string,
  ) => Promise<Array<{ address: string; family: number }>>;
  fetchWithTimeout?: (
    url: string,
    init: RequestInit,
    timeoutMs: number | null,
  ) => Promise<Response>;
  timeoutMs?: number;
  maxInlineReferenceBytes?: number;
}) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: input.prompt },
          ...(await Promise.all(
            input.images.map((image) =>
              mapGoogleImageReference(image, {
                fetchWithTimeout: input.fetchWithTimeout,
                lookupHostname: input.lookupHostname,
                maxInlineReferenceBytes: input.maxInlineReferenceBytes,
                timeoutMs: input.timeoutMs,
              }),
            ),
          )),
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      candidateCount: input.n,
      imageConfig: {
        aspectRatio: input.aspectRatio,
        imageSize: input.resolution,
      },
    },
  };
}

async function mapGoogleImageReference(
  image: CanonicalImageEditRequest['images'][number],
  policy: {
    fetchWithTimeout?: (
      url: string,
      init: RequestInit,
      timeoutMs: number | null,
    ) => Promise<Response>;
    lookupHostname?: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>;
    maxInlineReferenceBytes?: number;
    timeoutMs?: number;
  },
) {
  if (!policy.fetchWithTimeout || !policy.lookupHostname) {
    if (image.type === 'asset') {
      throw new Error(
        'Gateway-managed image assets must be resolved before Google dispatch.',
      );
    }

    const parsedDataUrl = parseDataUrlReference(
      image.url,
      image.type === 'data_url' ? image.mimeType : undefined,
    );
    return {
      inline_data: {
        mime_type: parsedDataUrl.mimeType,
        data: parsedDataUrl.dataBase64,
      },
    };
  }

  const resolvedReference = await resolveGatewayImageReference(image, {
    mode: 'download-to-data-url',
    policy: {
      allowedMimeTypes: GOOGLE_SUPPORTED_IMAGE_MIME_TYPES,
      fetchWithTimeout: policy.fetchWithTimeout,
      lookupHostname: policy.lookupHostname,
      maxBytes: policy.maxInlineReferenceBytes ?? 0,
      timeoutMs: policy.timeoutMs ?? 0,
    },
  });
  const parsedDataUrl = parseDataUrlReference(
    resolvedReference.url,
    resolvedReference.mimeType,
  );

  return {
    inline_data: {
      mime_type: parsedDataUrl.mimeType,
      data: parsedDataUrl.dataBase64,
    },
  };
}
