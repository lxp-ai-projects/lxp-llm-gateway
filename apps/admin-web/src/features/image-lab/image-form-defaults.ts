import type { ProviderModelSummary } from '../../lib/api-client.types';

export interface ImageFormDefaults {
  aspectRatio: string;
  responseFormat: 'url' | 'b64_json';
  resolution: string;
  background: string;
  quality: string;
  outputFormat: string;
  outputCompression: number | '';
  inputFidelity: string;
  imageCount: string;
}

export function resolveImageFormDefaults(
  model: ProviderModelSummary | undefined,
): ImageFormDefaults {
  const capabilities = model?.capabilities;
  const imageDefaults = capabilities?.imageDefaults;

  return {
    aspectRatio:
      imageDefaults?.aspectRatio ??
      capabilities?.supportedImageAspectRatios?.[0]?.value ??
      '',
    responseFormat:
      imageDefaults?.responseFormat ??
      capabilities?.supportedImageResponseFormats?.[0] ??
      'b64_json',
    resolution:
      imageDefaults?.resolution ??
      capabilities?.supportedImageResolutions?.[0]?.value ??
      '',
    background:
      imageDefaults?.background ??
      capabilities?.supportedImageBackgrounds?.[0]?.value ??
      '',
    quality:
      imageDefaults?.quality ??
      capabilities?.supportedImageQualities?.[0]?.value ??
      '',
    outputFormat:
      imageDefaults?.outputFormat ??
      capabilities?.supportedImageOutputFormats?.[0]?.value ??
      '',
    outputCompression:
      imageDefaults?.outputCompression ??
      capabilities?.imageOutputCompressionRange?.defaultValue ??
      '',
    inputFidelity:
      imageDefaults?.inputFidelity ??
      capabilities?.supportedImageInputFidelities?.[0]?.value ??
      '',
    imageCount: String(imageDefaults?.imageCount ?? 1),
  };
}
