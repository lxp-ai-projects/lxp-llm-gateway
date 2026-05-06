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
export const IMAGE_LAB_DRAFT_STORAGE_KEY = 'lxp.image-lab.draft.v1';

type ImageLabDraft = {
  providerId: string;
  modelId: string;
  prompt: string;
  aspectRatio: string;
  responseFormat: 'url' | 'b64_json';
  resolution: string;
  background: string;
  quality: string;
  moderation: string;
  outputFormat: string;
  outputCompression: number | '';
  inputFidelity: string;
  imageCount: string;
  referenceUrl: string;
  references: ImageReferenceDraft[];
  showNanoGptPaidModels: boolean;
};

export function useImageLab() {
  const initialDraft = loadImageLabDraft();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [providerId, setProviderId] = useState(initialDraft?.providerId ?? '');
  const [modelId, setModelId] = useState(initialDraft?.modelId ?? '');
  const [prompt, setPrompt] = useState(initialDraft?.prompt ?? '');
  const [aspectRatio, setAspectRatio] = useState(initialDraft?.aspectRatio ?? '');
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>(
    initialDraft?.responseFormat ?? 'b64_json',
  );
  const [resolution, setResolution] = useState(initialDraft?.resolution ?? '');
  const [background, setBackground] = useState(initialDraft?.background ?? '');
  const [quality, setQuality] = useState(initialDraft?.quality ?? '');
  const [moderation, setModeration] = useState(initialDraft?.moderation ?? '');
  const [outputFormat, setOutputFormat] = useState(initialDraft?.outputFormat ?? '');
  const [outputCompression, setOutputCompression] = useState<number | ''>(
    initialDraft?.outputCompression ?? '',
  );
  const [inputFidelity, setInputFidelity] = useState(initialDraft?.inputFidelity ?? '');
  const [imageCount, setImageCount] = useState(initialDraft?.imageCount ?? '1');
  const [referenceUrl, setReferenceUrl] = useState(initialDraft?.referenceUrl ?? '');
  const [references, setReferences] = useState<ImageReferenceDraft[]>(
    initialDraft?.references ?? [],
  );
  const [results, setResults] = useState<GatewayGeneratedImage[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(DEFAULT_HISTORY_PAGE);
  const [showNanoGptPaidModels, setShowNanoGptPaidModels] = useState(
    initialDraft?.showNanoGptPaidModels ?? false,
  );
  const [activeRenderStartedAt, setActiveRenderStartedAt] = useState<number | null>(null);
  const [renderNowMs, setRenderNowMs] = useState(() => Date.now());

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
    setAspectRatio((current) =>
      resolveDraftStringOption(
        current,
        defaults.aspectRatio,
        selectedCapabilities?.supportedImageAspectRatios?.map((option) => option.value),
      ),
    );
    setResponseFormat((current) =>
      resolveDraftResponseFormat(
        current,
        defaults.responseFormat,
        selectedCapabilities?.supportedImageResponseFormats,
      ),
    );
    setResolution((current) =>
      resolveDraftStringOption(
        current,
        defaults.resolution,
        selectedCapabilities?.supportedImageResolutions?.map((option) => option.value),
      ),
    );
    setBackground((current) =>
      resolveDraftStringOption(
        current,
        defaults.background,
        selectedCapabilities?.supportedImageBackgrounds?.map((option) => option.value),
      ),
    );
    setQuality((current) =>
      resolveDraftStringOption(
        current,
        defaults.quality,
        selectedCapabilities?.supportedImageQualities?.map((option) => option.value),
      ),
    );
    setModeration((current) =>
      resolveDraftStringOption(
        current,
        defaults.moderation,
        selectedCapabilities?.supportedImageModerations?.map((option) => option.value),
      ),
    );
    setOutputFormat((current) =>
      resolveDraftStringOption(
        current,
        defaults.outputFormat,
        selectedCapabilities?.supportedImageOutputFormats?.map((option) => option.value),
      ),
    );
    setOutputCompression((current) =>
      resolveDraftOutputCompression(
        current,
        defaults.outputCompression,
        selectedCapabilities?.imageOutputCompressionRange,
      ),
    );
    setInputFidelity((current) =>
      resolveDraftStringOption(
        current,
        defaults.inputFidelity,
        selectedCapabilities?.supportedImageInputFidelities?.map((option) => option.value),
      ),
    );
    setImageCount((current) =>
      resolveDraftImageCount(
        current,
        defaults.imageCount,
        selectedCapabilities?.maxGeneratedImagesPerRequest,
      ),
    );
  }, [selectedCapabilities]);

  useEffect(() => {
    persistImageLabDraft({
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
    aspectRatio,
    background,
    imageCount,
    inputFidelity,
    modelId,
    moderation,
    outputCompression,
    outputFormat,
    prompt,
    providerId,
    quality,
    referenceUrl,
    references,
    resolution,
    responseFormat,
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

function loadImageLabDraft(): ImageLabDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(IMAGE_LAB_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ImageLabDraft>;
    return {
      providerId: typeof parsed.providerId === 'string' ? parsed.providerId : '',
      modelId: typeof parsed.modelId === 'string' ? parsed.modelId : '',
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
      aspectRatio: typeof parsed.aspectRatio === 'string' ? parsed.aspectRatio : '',
      responseFormat:
        parsed.responseFormat === 'url' || parsed.responseFormat === 'b64_json'
          ? parsed.responseFormat
          : 'b64_json',
      resolution: typeof parsed.resolution === 'string' ? parsed.resolution : '',
      background: typeof parsed.background === 'string' ? parsed.background : '',
      quality: typeof parsed.quality === 'string' ? parsed.quality : '',
      moderation: typeof parsed.moderation === 'string' ? parsed.moderation : '',
      outputFormat: typeof parsed.outputFormat === 'string' ? parsed.outputFormat : '',
      outputCompression:
        typeof parsed.outputCompression === 'number' ||
        parsed.outputCompression === ''
          ? parsed.outputCompression
          : '',
      inputFidelity:
        typeof parsed.inputFidelity === 'string' ? parsed.inputFidelity : '',
      imageCount: typeof parsed.imageCount === 'string' ? parsed.imageCount : '1',
      referenceUrl: typeof parsed.referenceUrl === 'string' ? parsed.referenceUrl : '',
      references: Array.isArray(parsed.references)
        ? parsed.references.filter(isImageReferenceDraft)
        : [],
      showNanoGptPaidModels: parsed.showNanoGptPaidModels === true,
    };
  } catch {
    return null;
  }
}

function persistImageLabDraft(draft: ImageLabDraft): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      IMAGE_LAB_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
  } catch {
    // Ignore storage failures so the lab remains usable in private mode.
  }
}

function isImageReferenceDraft(value: unknown): value is ImageReferenceDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ImageReferenceDraft>;
  if (
    candidate.kind === 'asset' &&
    typeof candidate.id === 'string' &&
    typeof candidate.assetId === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.previewUrl === 'string' &&
    (candidate.sourceType === 'upload' || candidate.sourceType === 'generated')
  ) {
    return true;
  }

  return (
    candidate.kind === 'image_url' &&
    typeof candidate.id === 'string' &&
    typeof candidate.url === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.previewUrl === 'string'
  );
}

function resolveDraftStringOption(
  current: string,
  fallback: string,
  supportedValues: string[] | undefined,
): string {
  if (!supportedValues?.length) {
    return current || fallback;
  }

  return supportedValues.includes(current) ? current : fallback;
}

function resolveDraftResponseFormat(
  current: 'url' | 'b64_json',
  fallback: 'url' | 'b64_json',
  supportedValues: Array<'url' | 'b64_json'> | undefined,
): 'url' | 'b64_json' {
  if (!supportedValues?.length) {
    return current || fallback;
  }

  return supportedValues.includes(current) ? current : fallback;
}

function resolveDraftOutputCompression(
  current: number | '',
  fallback: number | '',
  range:
    | {
        min: number;
        max: number;
      }
    | undefined,
): number | '' {
  if (!range) {
    return current === '' ? fallback : current;
  }

  if (
    typeof current === 'number' &&
    current >= range.min &&
    current <= range.max
  ) {
    return current;
  }

  return fallback;
}

function resolveDraftImageCount(
  current: string,
  fallback: string,
  maxGeneratedImagesPerRequest: number | undefined,
): string {
  const maxValue = Math.max(1, Math.min(maxGeneratedImagesPerRequest ?? 1, 10));
  const currentNumber = Number.parseInt(current, 10);

  if (
    Number.isInteger(currentNumber) &&
    currentNumber >= 1 &&
    currentNumber <= maxValue
  ) {
    return String(currentNumber);
  }

  return fallback;
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
  const editOptions = model?.capabilities?.imageEditOptions;
  const catalogValue =
    editOptions?.maxReferenceImagesPerRequest ??
    model?.capabilities?.maxReferenceImagesPerRequest;

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
      'qwen-image',
      'qwen-image-edit',
      'qwen-image-img2img',
    )
  ) {
    return Math.max(catalogValue ?? 0, 3);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'wan-2-7-image-pro',
      'wan2-7-image-pro',
      'wan2-7-image-professional-edition',
    )
  ) {
    return Math.max(catalogValue ?? 0, 9);
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
