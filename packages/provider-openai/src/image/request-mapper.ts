import { Buffer } from 'node:buffer';

import type {
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  CanonicalImageAssetReference,
  PublicImageReferencePolicy,
} from '@lxp/provider-sdk';
import {
  parseDataUrlReference,
  resolveGatewayImageReference,
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
      moderation: request.moderation,
      output_format: request.outputFormat,
      output_compression: request.outputCompression,
      user: userId,
    },
  };
}

const OPENAI_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export async function buildOpenAiImageEditRequest(
  request: CanonicalImageEditRequest,
  model: ImageModelDescriptor,
  userId: string,
  policy: Pick<
    PublicImageReferencePolicy,
    'fetchWithTimeout' | 'lookupHostname' | 'timeoutMs'
  > & {
    maxBytes: number;
  },
): Promise<OpenAiImageTransportRequest> {
  const formData = new FormData();

  formData.append('model', model.id);
  formData.append('prompt', request.prompt);

  const imageFiles = await Promise.all(
    request.images.map((image, index) => mapOpenAiReferenceImage(image, index, policy)),
  );
  for (const imageFile of imageFiles) {
    formData.append('image[]', imageFile.blob, imageFile.filename);
  }

  appendIfDefined(formData, 'n', request.n);
  appendIfDefined(formData, 'size', request.resolution);
  appendIfDefined(formData, 'background', request.background);
  appendIfDefined(formData, 'quality', request.quality);
  appendIfDefined(formData, 'moderation', request.moderation);
  appendIfDefined(formData, 'output_format', request.outputFormat);
  appendIfDefined(formData, 'output_compression', request.outputCompression);
  appendIfDefined(formData, 'input_fidelity', request.inputFidelity);
  appendIfDefined(formData, 'user', userId);

  return {
    kind: 'multipart',
    body: formData,
  };
}

async function mapOpenAiReferenceImage(
  image: CanonicalImageAssetReference,
  index: number,
  policy: Pick<
    PublicImageReferencePolicy,
    'fetchWithTimeout' | 'lookupHostname' | 'timeoutMs'
  > & {
    maxBytes: number;
  },
) {
  const resolvedReference = await resolveGatewayImageReference(image, {
    mode: 'download-to-data-url',
    policy: {
      allowedMimeTypes: OPENAI_SUPPORTED_IMAGE_MIME_TYPES,
      fetchWithTimeout: policy.fetchWithTimeout,
      lookupHostname: policy.lookupHostname,
      maxBytes: policy.maxBytes,
      timeoutMs: policy.timeoutMs,
    },
  });
  const parsedDataUrl = parseDataUrlReference(
    resolvedReference.url,
    resolvedReference.mimeType,
  );

  return {
    blob: new Blob([Buffer.from(parsedDataUrl.dataBase64, 'base64')], {
      type: parsedDataUrl.mimeType,
    }),
    filename: `reference-${index + 1}.${resolveFileExtension(parsedDataUrl.mimeType)}`,
  };
}

function appendIfDefined(
  formData: FormData,
  key: string,
  value: number | string | undefined,
) {
  if (value === undefined) {
    return;
  }

  formData.append(key, String(value));
}

function resolveFileExtension(mimeType: string) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    default:
      return 'bin';
  }
}
