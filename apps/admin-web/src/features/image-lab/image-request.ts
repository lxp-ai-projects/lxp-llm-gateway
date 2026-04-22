import type { ImageReferenceDraft } from './types';

type GatewayApiClient = typeof import('../../lib/api-client').gatewayApiClient;
type GenerateImagePayload = Parameters<GatewayApiClient['generateImage']>[0];
type EditImagePayload = Parameters<GatewayApiClient['editImage']>[0];

export function buildImageRequestPayload(input: {
  providerId: string;
  modelId: string;
  prompt: string;
  imageCount: string;
  aspectRatio: string;
  responseFormat: 'url' | 'b64_json';
  resolution: string;
  background: string;
  quality: string;
  outputFormat: string;
  outputCompression: number | '';
  inputFidelity: string;
  references: ImageReferenceDraft[];
}): GenerateImagePayload | EditImagePayload {
  const basePayload: GenerateImagePayload = {
    providerId: input.providerId,
    model: input.modelId,
    prompt: input.prompt.trim(),
    n: Number(input.imageCount),
    aspectRatio: input.aspectRatio || undefined,
    responseFormat: input.responseFormat,
    resolution: input.resolution || undefined,
    background: input.background || undefined,
    quality: input.quality || undefined,
    outputFormat: input.outputFormat || undefined,
    outputCompression:
      typeof input.outputCompression === 'number'
        ? input.outputCompression
        : undefined,
  };

  if (!input.references.length) {
    return basePayload;
  }

  return {
    ...basePayload,
    images: input.references.map((reference) =>
      reference.kind === 'asset'
        ? {
            type: 'asset' as const,
            assetId: reference.assetId,
          }
        : {
            type: 'image_url' as const,
            url: reference.url,
          },
    ),
    inputFidelity: input.inputFidelity || undefined,
  };
}
