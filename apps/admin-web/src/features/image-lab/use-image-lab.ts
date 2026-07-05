import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { resolveMaxReferenceImages } from '@lxp/domain';

import { adminApiUrl, gatewayApiClient } from '../../lib/api-client';
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
export const IMAGE_LAB_DRAFT_STORAGE_KEY = 'image-lab-draft';

type ImageLabDraft = {
  providerId?: string;
  modelId?: string;
  prompt?: string;
  aspectRatio?: string;
  responseFormat?: 'url' | 'b64_json';
  resolution?: string;
  background?: string;
  quality?: string;
  moderation?: string;
  outputFormat?: string;
  outputCompression?: number | '';
  inputFidelity?: string;
  imageCount?: string;
  referenceUrl?: string;
  references?: ImageReferenceDraft[];
  showNanoGptPaidModels?: boolean;
};

export function useImageLab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storedDraftRef = useRef<ImageLabDraft>(readStoredImageLabDraft());
  const [providerId, setProviderId] = useState(() => storedDraftRef.current.providerId ?? '');
  const [modelId, setModelId] = useState(() => storedDraftRef.current.modelId ?? '');
  const [prompt, setPrompt] = useState(() => storedDraftRef.current.prompt ?? '');
  const [aspectRatio, setAspectRatio] = useState(() => storedDraftRef.current.aspectRatio ?? '');
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>(() =>
    storedDraftRef.current.responseFormat ?? 'b64_json',
  );
  const [resolution, setResolution] = useState(() => storedDraftRef.current.resolution ?? '');
  const [background, setBackground] = useState(() => storedDraftRef.current.background ?? '');
  const [quality, setQuality] = useState(() => storedDraftRef.current.quality ?? '');
  const [moderation, setModeration] = useState(() => storedDraftRef.current.moderation ?? '');
  const [outputFormat, setOutputFormat] = useState(() => storedDraftRef.current.outputFormat ?? '');
  const [outputCompression, setOutputCompression] = useState<number | ''>(() =>
    storedDraftRef.current.outputCompression ?? '',
  );
  const [inputFidelity, setInputFidelity] = useState(() => storedDraftRef.current.inputFidelity ?? '');
  const [imageCount, setImageCount] = useState(() => storedDraftRef.current.imageCount ?? '1');
  const [referenceUrl, setReferenceUrl] = useState(() => storedDraftRef.current.referenceUrl ?? '');
  const [references, setReferences] = useState<ImageReferenceDraft[]>(
    () => storedDraftRef.current.references ?? [],
  );
  const [results, setResults] = useState<GatewayGeneratedImage[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(DEFAULT_HISTORY_PAGE);
  const [showNanoGptPaidModels, setShowNanoGptPaidModels] = useState(
    () => storedDraftRef.current.showNanoGptPaidModels ?? false,
  );
  const [activeRenderStartedAt, setActiveRenderStartedAt] = useState<number | null>(null);
  const [renderNowMs, setRenderNowMs] = useState(() => Date.now());

  const catalogQuery = useQuery({
    queryKey: ['image-catalog'],
    queryFn: () => gatewayApiClient.getImageCatalog(),
  });
  const catalogInitialized = catalogQuery.status !== 'pending';
  const historyQuery = useQuery({
    queryKey: ['image-history', historyPage],
    queryFn: () => gatewayApiClient.getImageHistory(historyPage),
    enabled: catalogInitialized,
  });
  const assetsQuery = useQuery({
    queryKey: ['image-assets'],
    queryFn: () => gatewayApiClient.getImageAssets(),
    enabled: catalogInitialized,
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
  const supportsImageEditing = capabilities?.supportsImageEditing === true;
  const activeImageMode = references.length > 0 && supportsImageEditing ? 'edit' : 'generation';
  const selectedCapabilities = resolveImageModeCapabilities(
    capabilities,
    activeImageMode,
  );

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
    const defaults = resolveImageFormDefaults(selectedCapabilities);
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
  }, [selectedCapabilities]);

  useEffect(() => {
    writeStoredImageLabDraft({
      providerId,
      modelId,
      prompt,
      aspectRatio,
      responseFormat,
      resolution,
      background,
      quality,
      moderation,
      outputFormat,
      outputCompression,
      inputFidelity,
      imageCount,
      referenceUrl,
      references,
      showNanoGptPaidModels,
    });
  }, [
    providerId,
    modelId,
    prompt,
    aspectRatio,
    responseFormat,
    resolution,
    background,
    quality,
    moderation,
    outputFormat,
    outputCompression,
    inputFidelity,
    imageCount,
    referenceUrl,
    references,
    showNanoGptPaidModels,
  ]);

  const maxReferenceImages = resolveMaxReferenceImages(
    selectedProvider?.providerId,
    selectedModel,
  );
  const canEdit = supportsImageEditing && references.length > 0;
  const pendingResultCount = Math.max(1, Number.parseInt(imageCount, 10) || 1);
  const renderStats = resolveRenderStats(
    historyQuery.data?.items ?? [],
    providerId,
    modelId,
  );
  const currentRenderElapsedMs =
    activeRenderStartedAt === null ? 0 : Math.max(0, renderNowMs - activeRenderStartedAt);
  const currentRenderProgressPercent =
    activeRenderStartedAt === null || !renderStats.estimatedDurationMs
      ? null
      : Math.min(99, Math.max(0, (currentRenderElapsedMs / renderStats.estimatedDurationMs) * 100));

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
    onMutate: () => {
      setActiveRenderStartedAt(Date.now());
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
    onSettled: () => {
      setActiveRenderStartedAt(null);
    },
  });

  useEffect(() => {
    if (!generateMutation.isPending) {
      return;
    }

    setRenderNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setRenderNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [generateMutation.isPending]);

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
    selectedCapabilities,
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
    currentRenderElapsedMs,
    currentRenderProgressPercent,
    estimatedRenderDurationMs: renderStats.estimatedDurationMs,
    estimatedRenderSampleSize: renderStats.sampleSize,
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

  return `${adminApiUrl}${value}`;
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

function resolveImageModeCapabilities(
  capabilities: ProviderModelSummary['capabilities'] | undefined,
  mode: 'generation' | 'edit',
) {
  if (!capabilities) {
    return undefined;
  }

  const modeOptions =
    mode === 'edit'
      ? capabilities.imageEditOptions
      : capabilities.imageGenerationOptions;

  if (!modeOptions) {
    return capabilities;
  }

  return {
    ...capabilities,
    ...modeOptions,
    imageDefaults: {
      ...(capabilities.imageDefaults ?? {}),
      ...(modeOptions.imageDefaults ?? {}),
    },
  };
}

function resolveRenderStats(
  historyItems: Array<{
    providerId: string;
    model: string;
    durationMs?: number;
  }>,
  providerId: string,
  modelId: string,
) {
  const durations = historyItems
    .filter(
      (item) =>
        item.providerId === providerId &&
        item.model === modelId &&
        typeof item.durationMs === 'number' &&
        item.durationMs > 0,
    )
    .map((item) => item.durationMs as number)
    .slice(0, 5);

  if (!durations.length) {
    return {
      estimatedDurationMs: null,
      sampleSize: 0,
    };
  }

  const sortedDurations = durations.slice().sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedDurations.length / 2);
  const estimatedDurationMs =
    sortedDurations.length % 2 === 1
      ? sortedDurations[middleIndex]
      : Math.round(
        (sortedDurations[middleIndex - 1] + sortedDurations[middleIndex]) / 2,
      );

  return {
    estimatedDurationMs,
    sampleSize: durations.length,
  };
}

function readStoredImageLabDraft(): ImageLabDraft {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawDraft = window.localStorage.getItem(IMAGE_LAB_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return {};
    }

    const parsedDraft = JSON.parse(rawDraft);
    if (!parsedDraft || typeof parsedDraft !== 'object') {
      return {};
    }

    return parsedDraft as ImageLabDraft;
  } catch {
    return {};
  }
}

function writeStoredImageLabDraft(draft: ImageLabDraft) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      IMAGE_LAB_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
  } catch {
    // Ignore storage failures so the lab remains usable in restricted browsers.
  }
}
