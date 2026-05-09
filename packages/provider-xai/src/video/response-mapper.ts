import type { GatewayVideoGenerationJob } from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import type {
  XAiVideoGenerationAcceptedPayload,
  XAiVideoStatusPayload,
} from './api-client.js';

export function mapXAiAcceptedVideoJob(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: XAiVideoGenerationAcceptedPayload,
): GatewayVideoGenerationJob {
  const jobId = payload.request_id ?? context.requestId;

  return {
    id: jobId,
    requestId: context.requestId,
    providerId: 'xai',
    model: requestedModel,
    prompt: '',
    status: 'queued',
    createdAt: new Date().toISOString(),
    outputs: [],
    providerMetadata: {
      requestId: jobId,
      upstreamStatus: 'pending',
    },
  };
}

export function mapXAiVideoJob(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: XAiVideoStatusPayload,
): GatewayVideoGenerationJob {
  const contentUrl = payload.video?.url;
  const durationSeconds = payload.video?.duration;
  const status = mapXAiVideoStatus(payload.status);

  return {
    id: payload.request_id ?? context.requestId,
    requestId: context.requestId,
    providerId: 'xai',
    model: payload.model ?? requestedModel,
    prompt: '',
    status,
    createdAt: new Date().toISOString(),
    completedAt: status === 'succeeded' ? new Date().toISOString() : undefined,
    error: payload.error,
    outputs:
      typeof contentUrl === 'string' && contentUrl.trim().length > 0
        ? [
            {
              contentUrl,
              mimeType: 'video/mp4',
              durationSeconds,
            },
          ]
        : [],
    providerMetadata: {
      requestId: payload.request_id ?? null,
      upstreamStatus: payload.status ?? null,
      videoUrl: contentUrl ?? null,
      durationSeconds: durationSeconds ?? null,
      respectModeration: payload.video?.respect_moderation ?? null,
      error: payload.error ?? null,
    },
  };
}

export function mapXAiVideoStatus(
  status: string | undefined,
): GatewayVideoGenerationJob['status'] {
  switch (status) {
    case 'pending':
      return 'running';
    case 'done':
      return 'succeeded';
    case 'failed':
    case 'expired':
      return 'failed';
    default:
      return 'queued';
  }
}
