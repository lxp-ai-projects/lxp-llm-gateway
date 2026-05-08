import type { GatewayVideoGenerationJob } from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import type {
  NanoGptVideoGenerationAcceptedPayload,
  NanoGptVideoStatusPayload,
} from './api-client.js';

export function mapNanoGptAcceptedVideoJob(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: NanoGptVideoGenerationAcceptedPayload,
): GatewayVideoGenerationJob {
  const jobId = payload.runId ?? payload.id ?? context.requestId;

  return {
    id: jobId,
    requestId: context.requestId,
    providerId: 'nanogpt',
    model: payload.model ?? requestedModel,
    prompt: '',
    status: mapNanoGptVideoStatus(payload.status),
    createdAt: new Date().toISOString(),
    outputs: [],
    providerMetadata: {
      id: payload.id ?? payload.runId ?? null,
      runId: payload.runId ?? payload.id ?? null,
      upstreamStatus: payload.status ?? null,
      estimatedCost: payload.cost ?? null,
      paymentSource: payload.paymentSource ?? null,
      remainingBalance: payload.remainingBalance ?? null,
      prechargeLabel: payload.prechargeLabel ?? null,
    },
  };
}

export function mapNanoGptStatusVideoJob(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: NanoGptVideoStatusPayload,
): GatewayVideoGenerationJob {
  const upstreamStatus = readUpstreamStatus(payload);
  const contentUrls = extractVideoUrls(payload);

  return {
    id: payload.requestId ?? payload.runId ?? context.requestId,
    requestId: context.requestId,
    providerId: 'nanogpt',
    model: payload.model ?? requestedModel,
    prompt: '',
    status: mapNanoGptVideoStatus(upstreamStatus),
    createdAt: payload.createdAt ?? new Date().toISOString(),
    completedAt: payload.completedAt ?? undefined,
    error: readStatusError(payload),
    outputs: contentUrls.map((contentUrl) => ({
      contentUrl,
      mimeType: 'video/mp4',
    })),
    providerMetadata: {
      id: payload.requestId ?? payload.runId ?? null,
      runId: payload.requestId ?? payload.runId ?? null,
      upstreamStatus: upstreamStatus ?? null,
      cost: payload.data?.cost ?? null,
      details: payload.data?.details ?? null,
      error: payload.error ?? payload.data?.error ?? null,
      userFriendlyError: payload.data?.userFriendlyError ?? null,
      isNSFWError: payload.data?.isNSFWError ?? null,
      progress: payload.progress ?? null,
      estimatedTimeRemaining: payload.estimatedTimeRemaining ?? null,
      contentUrls,
    },
  };
}

export function mapNanoGptVideoStatus(
  status: string | undefined,
): GatewayVideoGenerationJob['status'] {
  switch (status?.toUpperCase()) {
    case 'PENDING':
    case 'IN_QUEUE':
    case 'QUEUED':
      return 'queued';
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'GENERATING':
    case 'DELIVERING':
    case 'RUNNING':
      return 'running';
    case 'COMPLETED':
    case 'SUCCEEDED':
    case 'SUCCESS':
      return 'succeeded';
    case 'CANCELED':
    case 'CANCELLED':
      return 'cancelled';
    case 'FAILED':
      return 'failed';
    default:
      return 'queued';
  }
}

export function extractVideoUrls(payload: NanoGptVideoStatusPayload): string[] {
  const urls = [];
  const normalizedUrl = payload.videoUrl;
  if (typeof normalizedUrl === 'string' && normalizedUrl.trim()) {
    urls.push(normalizedUrl);
  }

  const primaryUrl = payload.data?.output?.video?.url;
  if (typeof primaryUrl === 'string' && primaryUrl.trim()) {
    urls.push(primaryUrl);
  }

  for (const entry of payload.data?.output?.videos ?? []) {
    if (typeof entry?.url === 'string' && entry.url.trim()) {
      urls.push(entry.url);
    }
  }

  return Array.from(new Set(urls));
}

function readUpstreamStatus(payload: NanoGptVideoStatusPayload) {
  return payload.data?.status ?? payload.status;
}

function readStatusError(payload: NanoGptVideoStatusPayload) {
  return (
    payload.error ??
    payload.data?.userFriendlyError ??
    payload.data?.error ??
    payload.data?.details
  );
}
