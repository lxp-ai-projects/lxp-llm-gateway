import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { gatewayApiClient, gatewayApiUrl } from '../../lib/api-client';
import type {
  GatewayGeneratedImage,
  GatewayImageAssetSummary,
} from '../../lib/api-client.types';
import type { ImageReferenceDraft } from './types';

const DEFAULT_HISTORY_PAGE = 1;

export function useImageLab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>(
    'b64_json',
  );
  const [resolution, setResolution] = useState('');
  const [background, setBackground] = useState('');
  const [quality, setQuality] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [outputCompression, setOutputCompression] = useState<number | ''>('');
  const [inputFidelity, setInputFidelity] = useState('');
  const [imageCount, setImageCount] = useState('1');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [references, setReferences] = useState<ImageReferenceDraft[]>([]);
  const [results, setResults] = useState<GatewayGeneratedImage[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(DEFAULT_HISTORY_PAGE);

  const catalogQuery = useQuery({
    queryKey: ['image-catalog'],
    queryFn: () => gatewayApiClient.getImageCatalog(),
  });
  const historyQuery = useQuery({
    queryKey: ['image-history', historyPage],
    queryFn: () => gatewayApiClient.getImageHistory(historyPage),
  });

  const providers = catalogQuery.data?.providers ?? [];
  const selectedProvider = providers.find((provider) => provider.providerId === providerId);
  const models = selectedProvider?.models ?? [];
  const selectedModel = models.find((model) => model.id === modelId);
  const capabilities = selectedModel?.capabilities;
  const imageDefaults = capabilities?.imageDefaults;

  useEffect(() => {
    if (providerId || !providers.length) {
      return;
    }

    const defaultProvider = providers[0];
    setProviderId(defaultProvider?.providerId ?? '');
  }, [providerId, providers]);

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }

    if (
      modelId &&
      selectedProvider.models.some((model) => model.id === modelId)
    ) {
      return;
    }

    setModelId(selectedProvider.defaultModelId ?? selectedProvider.models[0]?.id ?? '');
  }, [modelId, selectedProvider]);

  useEffect(() => {
    setAspectRatio(imageDefaults?.aspectRatio ?? capabilities?.supportedImageAspectRatios?.[0]?.value ?? '');
    setResponseFormat(
      imageDefaults?.responseFormat ??
        (capabilities?.supportedImageResponseFormats?.[0] as 'url' | 'b64_json' | undefined) ??
        'b64_json',
    );
    setResolution(
      imageDefaults?.resolution ??
        capabilities?.supportedImageResolutions?.[0]?.value ??
        '',
    );
    setBackground(imageDefaults?.background ?? capabilities?.supportedImageBackgrounds?.[0]?.value ?? '');
    setQuality(imageDefaults?.quality ?? capabilities?.supportedImageQualities?.[0]?.value ?? '');
    setOutputFormat(
      imageDefaults?.outputFormat ??
        capabilities?.supportedImageOutputFormats?.[0]?.value ??
        '',
    );
    setOutputCompression(
      imageDefaults?.outputCompression ??
        capabilities?.imageOutputCompressionRange?.defaultValue ??
        '',
    );
    setInputFidelity(
      imageDefaults?.inputFidelity ??
        capabilities?.supportedImageInputFidelities?.[0]?.value ??
        '',
    );
    setImageCount(String(imageDefaults?.imageCount ?? 1));
  }, [capabilities, imageDefaults, modelId]);

  const supportsImageEditing = capabilities?.supportsImageEditing === true;
  const maxReferenceImages = capabilities?.maxReferenceImagesPerRequest ?? 5;
  const canEdit = supportsImageEditing && references.length > 0;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error('A prompt is required.');
      }

      if (references.length > 0 && !supportsImageEditing) {
        throw new Error('This model does not support image editing.');
      }

      const basePayload = {
        providerId,
        model: modelId,
        prompt: trimmedPrompt,
        n: Number(imageCount),
        aspectRatio: aspectRatio || undefined,
        responseFormat,
        resolution: resolution || undefined,
        background: background || undefined,
        quality: quality || undefined,
        outputFormat: outputFormat || undefined,
        outputCompression:
          typeof outputCompression === 'number' ? outputCompression : undefined,
      };

      if (references.length > 0) {
        return gatewayApiClient.editImage({
          ...basePayload,
          images: references.map((reference) =>
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
          inputFidelity: inputFidelity || undefined,
        });
      }

      return gatewayApiClient.generateImage(basePayload);
    },
    onSuccess: (response) => {
      setRequestError(null);
      setResults(response.images);
      void queryClient.invalidateQueries({ queryKey: ['image-history'] });
    },
    onError: (error) => {
      setResults([]);
      setRequestError(
        error instanceof Error ? error.message : 'The image request failed.',
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (payload: { dataUrl: string; label?: string }) =>
      gatewayApiClient.uploadImageAsset(payload),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { assetId: string; saved: boolean }) =>
      gatewayApiClient.setImageAssetSaved(payload.assetId, payload.saved),
    onSuccess: ({ asset }) => {
      setResults((current) =>
        current.map((image) =>
          image.assetId === asset.id ? { ...image, saved: asset.saved } : image,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ['image-history'] });
    },
  });

  async function handleFileSelection(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const nextReferences: ImageReferenceDraft[] = [];
    for (const file of Array.from(fileList)) {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadMutation.mutateAsync({
        dataUrl,
        label: file.name,
      });
      nextReferences.push(mapAssetReference(uploaded.asset));
    }

    setReferences((current) => [...current, ...nextReferences].slice(0, maxReferenceImages));
  }

  function addReferenceUrl() {
    const trimmedUrl = referenceUrl.trim();
    if (!trimmedUrl) {
      return;
    }

    setReferences((current) =>
      [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: 'image_url' as const,
          url: trimmedUrl,
          label: trimmedUrl,
        },
      ].slice(0, maxReferenceImages),
    );
    setReferenceUrl('');
  }

  function addReferenceAsset(asset: GatewayImageAssetSummary) {
    setReferences((current) =>
      [
        ...current,
        mapAssetReference(asset),
      ].slice(0, maxReferenceImages),
    );
  }

  function removeReference(referenceId: string) {
    setReferences((current) => current.filter((reference) => reference.id !== referenceId));
  }

  const mediaUrl = (value: string | undefined) =>
    value ? resolveGatewayMediaUrl(value) : undefined;

  return {
    fileInputRef,
    providers,
    selectedProvider,
    selectedModel,
    models,
    prompt,
    setPrompt,
    providerId,
    setProviderId,
    modelId,
    setModelId,
    aspectRatio,
    setAspectRatio,
    responseFormat,
    setResponseFormat,
    resolution,
    setResolution,
    background,
    setBackground,
    quality,
    setQuality,
    outputFormat,
    setOutputFormat,
    outputCompression,
    setOutputCompression,
    inputFidelity,
    setInputFidelity,
    imageCount,
    setImageCount,
    referenceUrl,
    setReferenceUrl,
    references,
    requestError,
    results,
    history: historyQuery.data,
    historyPage,
    setHistoryPage,
    catalogQuery,
    historyQuery,
    generateMutation,
    uploadMutation,
    saveMutation,
    supportsImageEditing,
    maxReferenceImages,
    canEdit,
    handleFileSelection,
    addReferenceUrl,
    addReferenceAsset,
    removeReference,
    mediaUrl,
  };
}

function mapAssetReference(asset: GatewayImageAssetSummary): ImageReferenceDraft {
  return {
    id: crypto.randomUUID(),
    kind: 'asset',
    assetId: asset.id,
    label: asset.label ?? 'Gateway image asset',
    previewUrl: resolveGatewayMediaUrl(asset.contentUrl),
  };
}

function resolveGatewayMediaUrl(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }

  return `${gatewayApiUrl}${value}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Unable to read ${file.name} as a data URL.`));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
