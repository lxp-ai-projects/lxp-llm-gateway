import type { GatewayVideoGenerationJob } from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import type { OpenRouterVideoJobPayload } from './api-client.js';

const OPENROUTER_TERMINAL_STATES = new Set([
  'completed',
  'failed',
  'cancelled',
  'expired',
]);

export function mapOpenRouterVideoJob(
  requestedModel: string,
  context: ProviderExecutionContext,
  payload: OpenRouterVideoJobPayload,
): GatewayVideoGenerationJob {
  return {
    id: payload.id ?? context.requestId,
    requestId: context.requestId,
    providerId: 'openrouter',
    model: requestedModel,
    prompt: '',
    status: mapOpenRouterVideoStatus(payload.status),
    createdAt: new Date().toISOString(),
    error: payload.error,
    outputs: (payload.unsigned_urls ?? []).map((url) => ({
      contentUrl: url,
      mimeType: 'video/mp4',
    })),
    providerMetadata: {
      id: payload.id,
      pollingUrl: payload.polling_url,
      generationId: payload.generation_id,
      unsignedUrls: payload.unsigned_urls ?? [],
      usage: payload.usage ?? null,
      terminal: payload.status ? OPENROUTER_TERMINAL_STATES.has(payload.status) : false,
      upstreamStatus: payload.status ?? null,
    },
  };
}

export function mapOpenRouterVideoStatus(
  status: string | undefined,
): GatewayVideoGenerationJob['status'] {
  switch (status) {
    case 'pending':
      return 'queued';
    case 'in_progress':
      return 'running';
    case 'completed':
      return 'succeeded';
    case 'cancelled':
      return 'cancelled';
    case 'failed':
    case 'expired':
      return 'failed';
    default:
      return 'queued';
  }
}
