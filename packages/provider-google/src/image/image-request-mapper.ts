import type { GatewayImageReference } from '@lxp/contracts';
import {
  parseDataUrlReference,
  resolveGatewayImageReference,
} from '@lxp/provider-sdk';

const GOOGLE_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function buildGoogleGenerateContentBody(input: {
  prompt: string;
  images: GatewayImageReference[];
  n?: number;
  aspectRatio?: string;
  resolution?: string;
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
  image: GatewayImageReference,
  policy: {
    fetchWithTimeout: (
      url: string,
      init: RequestInit,
      timeoutMs: number | null,
    ) => Promise<Response>;
    lookupHostname: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>;
    maxInlineReferenceBytes: number;
    timeoutMs: number;
  },
) {
  const resolvedReference = await resolveGatewayImageReference(image, {
    mode: 'download-to-data-url',
    policy: {
      allowedMimeTypes: GOOGLE_SUPPORTED_IMAGE_MIME_TYPES,
      fetchWithTimeout: policy.fetchWithTimeout,
      lookupHostname: policy.lookupHostname,
      maxBytes: policy.maxInlineReferenceBytes,
      timeoutMs: policy.timeoutMs,
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
