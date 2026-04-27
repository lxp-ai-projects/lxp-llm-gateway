import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { gatewayApiClient, gatewayApiUrl } from '../../lib/api-client';
import type {
  GatewayGeneratedImage,
  GatewayImageAssetSummary,
  ProviderModelSummary,
} from '../../lib/api-client.types';
import { createClientId } from '../../lib/id';
import type { ImageReferenceDraft } from './types';
import { resolveImageFormDefaults } from './image-form-defaults';
import { buildImageRequestPayload } from './image-request';

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
  const [moderation, setModeration] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [outputCompression, setOutputCompression] = useState<number | ''>('');
  const [inputFidelity, setInputFidelity] = useState('');
  const [imageCount, setImageCount] = useState('1');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [references, setReferences] = useState<ImageReferenceDraft[]>([]);
  const [results, setResults] = useState<GatewayGeneratedImage[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(DEFAULT_HISTORY_PAGE);
  const [showNanoGptPaidModels, setShowNanoGptPaidModels] = useState(false);

  const catalogQuery = useQuery({
    queryKey: ['image-catalog'],
    queryFn: () => gatewayApiClient.getImageCatalog(),
  });
  const historyQuery = useQuery({
    queryKey: ['image-history', historyPage],
    queryFn: () => gatewayApiClient.getImageHistory(historyPage),
  });
  const assetsQuery = useQuery({
    queryKey: ['image-assets'],
    queryFn: () => gatewayApiClient.getImageAssets(),
  });

  const providers = catalogQuery.data?.providers ?? [];
  const selectedProvider = providers.find((provider) => provider.providerId === providerId);
  const hasNanoGptPaidModels = Boolean(
    selectedProvider?.providerId === 'nanogpt' &&
      selectedProvider.models.some(
        (model) => model.capabilities?.requiresPaidAccess === true,
      ),
  );
  const models: ProviderModelSummary[] = (
    selectedProvider?.providerId === 'nanogpt' && !showNanoGptPaidModels
      ? (selectedProvider?.models ?? []).filter(
          (model: ProviderModelSummary) =>
            model.capabilities?.requiresPaidAccess !== true,
        )
      : selectedProvider?.models ?? []
  )
    .slice()
    .sort((left: ProviderModelSummary, right: ProviderModelSummary) =>
    (left.displayName || left.id).localeCompare(right.displayName || right.id),
  );
  const selectedModel = models.find((model: ProviderModelSummary) => model.id === modelId);
  const capabilities = selectedModel?.capabilities;

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
    const defaults = resolveImageFormDefaults(selectedModel);
    setAspectRatio(defaults.aspectRatio);
    setResponseFormat(defaults.responseFormat);
    setResolution(defaults.resolution);
    setBackground(defaults.background);
    setQuality(defaults.quality);
    setModeration(defaults.moderation);
    setOutputFormat(defaults.outputFormat);
    setOutputCompression(defaults.outputCompression);
    setInputFidelity(defaults.inputFidelity);
    setImageCount(defaults.imageCount);
  }, [selectedModel]);

  const supportsImageEditing = capabilities?.supportsImageEditing === true;
  const maxReferenceImages = resolveMaxReferenceImages(
    selectedProvider?.providerId,
    selectedModel,
  );
  const canEdit = supportsImageEditing && references.length > 0;
  const pendingResultCount = Math.max(1, Number.parseInt(imageCount, 10) || 1);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error('A prompt is required.');
      }

      if (references.length > 0 && !supportsImageEditing) {
        throw new Error('This model does not support image editing.');
      }

      const payload = buildImageRequestPayload({
        providerId,
        modelId,
        prompt: trimmedPrompt,
        imageCount,
        aspectRatio,
        responseFormat,
        resolution,
        background,
        quality,
        moderation,
        outputFormat,
        outputCompression,
        inputFidelity,
        references,
      });

      if ('images' in payload) {
        return gatewayApiClient.editImage(payload);
      }

      return gatewayApiClient.generateImage(payload);
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
  const updateAssetMutation = useMutation({
    mutationFn: (payload: { assetId: string; label: string }) =>
      gatewayApiClient.updateImageAsset(payload.assetId, { label: payload.label }),
    onSuccess: ({ asset }) => {
      setReferences((current) =>
        current.map((reference) =>
          reference.kind === 'asset' && reference.assetId === asset.id
            ? {
                ...reference,
                label: asset.label ?? 'Gateway image asset',
              }
            : reference,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ['image-assets'] });
    },
  });
  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => gatewayApiClient.deleteImageAsset(assetId),
    onSuccess: (_, assetId) => {
      setReferences((current) =>
        current.filter(
          (reference) => reference.kind !== 'asset' || reference.assetId !== assetId,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ['image-assets'] });
      void queryClient.invalidateQueries({ queryKey: ['image-history'] });
    },
  });

  async function handleFileSelection(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    try {
      const nextReferences: ImageReferenceDraft[] = [];
      for (const file of Array.from(fileList)) {
        const dataUrl = await readFileAsDataUrl(file);
        const uploaded = await uploadMutation.mutateAsync({
          dataUrl,
          label: file.name,
        });
        nextReferences.push(mapAssetReference(uploaded.asset));
      }

      setRequestError(null);
      setReferences((current) =>
        [...current, ...nextReferences].slice(0, maxReferenceImages),
      );
      void queryClient.invalidateQueries({ queryKey: ['image-assets'] });
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Image upload failed.',
      );
    }
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
          id: createClientId(),
          kind: 'image_url' as const,
          url: trimmedUrl,
          label: trimmedUrl,
          previewUrl: trimmedUrl,
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

  async function deleteReferenceAsset(assetId: string) {
    try {
      await deleteAssetMutation.mutateAsync(assetId);
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Image asset deletion failed.',
      );
    }
  }

  async function renameReferenceAsset(assetId: string, label: string) {
    try {
      await updateAssetMutation.mutateAsync({
        assetId,
        label: label.trim(),
      });
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Image asset rename failed.',
      );
    }
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
    showNanoGptPaidModels,
    setShowNanoGptPaidModels,
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
    moderation,
    setModeration,
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
    referenceAssets: assetsQuery.data?.items ?? [],
    requestError,
    results,
    history: historyQuery.data,
    historyPage,
    setHistoryPage,
    hasNanoGptPaidModels,
    catalogQuery,
    historyQuery,
    assetsQuery,
    generateMutation,
    uploadMutation,
    saveMutation,
    updateAssetMutation,
    deleteAssetMutation,
    supportsImageEditing,
    maxReferenceImages,
    canEdit,
    pendingResultCount,
    handleFileSelection,
    addReferenceUrl,
    addReferenceAsset,
    removeReference,
    renameReferenceAsset,
    deleteReferenceAsset,
    mediaUrl,
  };
}

function mapAssetReference(asset: GatewayImageAssetSummary): ImageReferenceDraft {
  return {
    id: createClientId(),
    kind: 'asset',
    assetId: asset.id,
    label: asset.label ?? 'Gateway image asset',
    previewUrl: resolveGatewayMediaUrl(asset.contentUrl),
    sourceType: asset.sourceType,
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

function resolveMaxReferenceImages(
  providerId: string | undefined,
  model: ProviderModelSummary | undefined,
) {
  const catalogValue = model?.capabilities?.maxReferenceImagesPerRequest;

  if (providerId !== 'nanogpt' || !model) {
    return typeof catalogValue === 'number' && catalogValue > 0 ? catalogValue : 5;
  }

  const normalizedModelId = normalizeModelToken(model.id);
  const normalizedDisplayName = normalizeModelToken(model.displayName);

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'seedream-4-0',
      'seedream-4-0-250828',
      'seedream-4-5',
      'seedream-4-5-251128',
      'seedream-5-0-lite',
      'seedream-5-0-lite-260128',
      'seedream-5-lite',
    )
  ) {
    return Math.max(catalogValue ?? 0, 10);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'nano-banana-2',
      'nano-banana-2-fast',
      'nano-banana-pro',
      'nano-banana-pro-edit',
      'nano-banana-pro-ultra',
    )
  ) {
    return Math.max(catalogValue ?? 0, 14);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'nano-banana-pro-edit-ultra',
    )
  ) {
    return Math.max(catalogValue ?? 0, 10);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'nano-banana',
      'nano-banana-edit',
      'gemini-flash-edit',
      'gpt-4o-image',
      'flux-kontext',
      'flux-kontext-dev',
    )
  ) {
    return Math.max(catalogValue ?? 0, 5);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'gpt-image-1',
      'gpt-image-1-5',
      'gpt-image-1-mini',
      'chatgpt-image-latest',
    )
  ) {
    return Math.max(catalogValue ?? 0, 16);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'seededit-3-0',
      'seededit-3-0-i2i',
      'seededit-3-0-i2i-250628',
    )
  ) {
    return 1;
  }

  return typeof catalogValue === 'number' && catalogValue > 0 ? catalogValue : 5;
}

function normalizeModelToken(value: string | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_/\s.]+/g, '-')
    .replace(/-+/g, '-');
}

function isOneOf(valueA: string, valueB: string, ...candidates: string[]) {
  return candidates.includes(valueA) || candidates.includes(valueB);
}
