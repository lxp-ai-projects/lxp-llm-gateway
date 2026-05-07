import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { gatewayApiClient, gatewayApiUrl } from '../../lib/api-client';
import type {
  GatewayImageAssetSummary,
  GatewayVideoGenerationJob,
  VideoModelSummary,
} from '../../lib/api-client.types';
import { createClientId } from '../../lib/id';
import type { VideoReferenceDraft } from './types';

const DEFAULT_HISTORY_PAGE = 1;
export const VIDEO_LAB_DRAFT_STORAGE_KEY = 'video-lab-draft';

type VideoLabDraft = {
  providerId?: string;
  modelId?: string;
  prompt?: string;
  durationSeconds?: string;
  aspectRatio?: string;
  resolution?: string;
  size?: string;
  generateAudio?: boolean;
  referenceUrl?: string;
  references?: VideoReferenceDraft[];
  activeJobId?: string;
};

export function useVideoLab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storedDraftRef = useRef<VideoLabDraft>(readStoredVideoLabDraft());
  const [providerId, setProviderId] = useState(
    () => storedDraftRef.current.providerId ?? '',
  );
  const [modelId, setModelId] = useState(
    () => storedDraftRef.current.modelId ?? '',
  );
  const [prompt, setPrompt] = useState(
    () => storedDraftRef.current.prompt ?? '',
  );
  const [durationSeconds, setDurationSeconds] = useState(
    () => storedDraftRef.current.durationSeconds ?? '',
  );
  const [aspectRatio, setAspectRatio] = useState(
    () => storedDraftRef.current.aspectRatio ?? '',
  );
  const [resolution, setResolution] = useState(
    () => storedDraftRef.current.resolution ?? '',
  );
  const [size, setSize] = useState(() => storedDraftRef.current.size ?? '');
  const [generateAudio, setGenerateAudio] = useState(
    () => storedDraftRef.current.generateAudio ?? false,
  );
  const [referenceUrl, setReferenceUrl] = useState(
    () => storedDraftRef.current.referenceUrl ?? '',
  );
  const [references, setReferences] = useState<VideoReferenceDraft[]>(
    () => storedDraftRef.current.references ?? [],
  );
  const [requestError, setRequestError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(DEFAULT_HISTORY_PAGE);
  const [activeJobId, setActiveJobId] = useState<string | null>(
    () => storedDraftRef.current.activeJobId ?? null,
  );
  const [submittedJob, setSubmittedJob] = useState<GatewayVideoGenerationJob | null>(
    null,
  );

  const catalogQuery = useQuery({
    queryKey: ['video-catalog'],
    queryFn: () => gatewayApiClient.getVideoCatalog(),
  });
  const catalogInitialized = catalogQuery.status !== 'pending';
  const historyQuery = useQuery({
    queryKey: ['video-history', historyPage],
    queryFn: () => gatewayApiClient.getVideoHistory(historyPage),
    enabled: catalogInitialized,
  });
  const assetsQuery = useQuery({
    queryKey: ['image-assets'],
    queryFn: () => gatewayApiClient.getImageAssets(),
    enabled: catalogInitialized,
  });
  const activeJobQuery = useQuery({
    queryKey: ['video-job', activeJobId],
    queryFn: () => gatewayApiClient.getVideoJob(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const job = query.state.data as GatewayVideoGenerationJob | undefined;
      if (!job) {
        return 3000;
      }

      return isTerminalStatus(job.status) ? false : 3000;
    },
  });

  const providers = catalogQuery.data?.providers ?? [];
  const selectedProvider = providers.find(
    (provider) => provider.providerId === providerId,
  );
  const models: VideoModelSummary[] = (selectedProvider?.models ?? [])
    .slice()
    .sort((left, right) =>
      (left.displayName || left.id).localeCompare(right.displayName || right.id),
    );
  const selectedModel = models.find((model) => model.id === modelId);
  const capabilities = selectedModel?.capabilities;
  const maxReferenceImages = Math.max(
    1,
    capabilities?.maxReferenceImagesPerRequest ?? 1,
  );
  const supportsReferenceImages =
    capabilities?.supportsVideoReferenceImages !== false;
  const supportsAudioGeneration =
    capabilities?.supportsVideoAudioGeneration === true;
  const activeJob = resolveActiveJob(submittedJob, activeJobQuery.data);

  useEffect(() => {
    if (providerId || !providers.length) {
      return;
    }

    setProviderId(providers[0]?.providerId ?? '');
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

    setModelId(
      selectedProvider.defaultModelId ?? selectedProvider.models[0]?.id ?? '',
    );
  }, [modelId, selectedProvider]);

  useEffect(() => {
    const defaults = capabilities?.videoDefaults;
    if (!defaults) {
      return;
    }

    setDurationSeconds(
      defaults.durationSeconds ? String(defaults.durationSeconds) : '',
    );
    setAspectRatio(defaults.aspectRatio ?? '');
    setResolution(defaults.resolution ?? '');
    setSize(defaults.size ?? '');
    setGenerateAudio(defaults.generateAudio ?? false);
  }, [capabilities?.videoDefaults]);

  useEffect(() => {
    writeStoredVideoLabDraft({
      providerId,
      modelId,
      prompt,
      durationSeconds,
      aspectRatio,
      resolution,
      size,
      generateAudio,
      referenceUrl,
      references,
      activeJobId: activeJobId ?? undefined,
    });
  }, [
    providerId,
    modelId,
    prompt,
    durationSeconds,
    aspectRatio,
    resolution,
    size,
    generateAudio,
    referenceUrl,
    references,
    activeJobId,
  ]);

  useEffect(() => {
    if (!activeJobQuery.data) {
      return;
    }

    setSubmittedJob(activeJobQuery.data);
    if (isTerminalStatus(activeJobQuery.data.status)) {
      void queryClient.invalidateQueries({ queryKey: ['video-history'] });
    }
  }, [activeJobQuery.data, queryClient]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error('A prompt is required.');
      }

      if (!modelId) {
        throw new Error('A video model must be selected.');
      }

      if (references.length > 0 && !supportsReferenceImages) {
        throw new Error('This model does not support reference images.');
      }

      const parsedDuration = Number.parseInt(durationSeconds, 10);
      return gatewayApiClient.generateVideo({
        providerId: providerId || undefined,
        model: modelId,
        idempotencyKey: createClientId(),
        prompt: trimmedPrompt,
        durationSeconds: Number.isFinite(parsedDuration) ? parsedDuration : undefined,
        aspectRatio: aspectRatio || undefined,
        resolution: resolution || undefined,
        size: size || undefined,
        generateAudio: supportsAudioGeneration ? generateAudio : undefined,
        referenceImages: references.map((reference) =>
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
      });
    },
    onSuccess: (job) => {
      setRequestError(null);
      setSubmittedJob(job);
      setActiveJobId(job.id);
      void queryClient.invalidateQueries({ queryKey: ['video-history'] });
    },
    onError: (error) => {
      setRequestError(
        error instanceof Error ? error.message : 'The video request failed.',
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => gatewayApiClient.cancelVideoJob(jobId),
    onSuccess: (job) => {
      setSubmittedJob(job);
      void queryClient.invalidateQueries({ queryKey: ['video-history'] });
    },
    onError: (error) => {
      setRequestError(
        error instanceof Error ? error.message : 'The cancellation request failed.',
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (payload: { dataUrl: string; label?: string }) =>
      gatewayApiClient.uploadImageAsset(payload),
  });

  async function handleFileSelection(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    try {
      const nextReferences: VideoReferenceDraft[] = [];
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
      [...current, mapAssetReference(asset)].slice(0, maxReferenceImages),
    );
  }

  function removeReference(referenceId: string) {
    setReferences((current) =>
      current.filter((reference) => reference.id !== referenceId),
    );
  }

  function selectHistoryJob(job: GatewayVideoGenerationJob) {
    setSubmittedJob(job);
    setActiveJobId(job.id);
  }

  const mediaUrl = (value: string | undefined) =>
    value ? resolveGatewayMediaUrl(value) : undefined;

  return {
    fileInputRef,
    providers,
    models,
    selectedProvider,
    selectedModel,
    capabilities,
    providerId,
    setProviderId,
    modelId,
    setModelId,
    prompt,
    setPrompt,
    durationSeconds,
    setDurationSeconds,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    size,
    setSize,
    generateAudio,
    setGenerateAudio,
    referenceUrl,
    setReferenceUrl,
    references,
    setReferences,
    requestError,
    historyPage,
    setHistoryPage,
    activeJobId,
    activeJob,
    referenceAssets: assetsQuery.data?.items ?? [],
    catalogQuery,
    historyQuery,
    assetsQuery,
    activeJobQuery,
    generateMutation,
    cancelMutation,
    uploadMutation,
    supportsReferenceImages,
    supportsAudioGeneration,
    maxReferenceImages,
    handleFileSelection,
    addReferenceUrl,
    addReferenceAsset,
    removeReference,
    selectHistoryJob,
    mediaUrl,
  };
}

function mapAssetReference(asset: GatewayImageAssetSummary): VideoReferenceDraft {
  return {
    id: createClientId(),
    kind: 'asset',
    assetId: asset.id,
    label: asset.label ?? 'Gateway image asset',
    previewUrl: resolveGatewayMediaUrl(asset.contentUrl),
    sourceType: asset.sourceType,
  };
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

function resolveGatewayMediaUrl(value: string) {
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  ) {
    return value;
  }

  return `${gatewayApiUrl}${value}`;
}

function isTerminalStatus(status: GatewayVideoGenerationJob['status']) {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled'
  );
}

function resolveActiveJob(
  submittedJob: GatewayVideoGenerationJob | null,
  polledJob: GatewayVideoGenerationJob | undefined,
) {
  if (!submittedJob) {
    return polledJob ?? null;
  }

  if (!polledJob || polledJob.id !== submittedJob.id) {
    return submittedJob;
  }

  if (isTerminalStatus(submittedJob.status) && !isTerminalStatus(polledJob.status)) {
    return submittedJob;
  }

  return polledJob;
}

function readStoredVideoLabDraft(): VideoLabDraft {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawDraft = window.localStorage.getItem(VIDEO_LAB_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return {};
    }

    const parsedDraft = JSON.parse(rawDraft);
    if (!parsedDraft || typeof parsedDraft !== 'object') {
      return {};
    }

    return parsedDraft as VideoLabDraft;
  } catch {
    return {};
  }
}

function writeStoredVideoLabDraft(draft: VideoLabDraft) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      VIDEO_LAB_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
  } catch {
    // Ignore storage failures so the lab remains usable in restricted browsers.
  }
}
