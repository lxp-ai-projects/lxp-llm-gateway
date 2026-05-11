import type {
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { OpenRouterVideoApiClient } from './api-client.js';
import { buildOpenRouterVideoGenerationRequest } from './request-mapper.js';
import { mapOpenRouterVideoJob } from './response-mapper.js';

export class OpenRouterVideoGenerationService {
  constructor(private readonly client: OpenRouterVideoApiClient) {}

  async submit(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const response = await this.client.submitVideoGeneration(
      context,
      await buildOpenRouterVideoGenerationRequest(request),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('OpenRouter video request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapOpenRouterVideoJob
    >[2];
    return {
      ...mapOpenRouterVideoJob(request.model ?? 'unknown-model', context, payload),
      prompt: request.prompt,
    };
  }

  async getJob(
    requestedModel: string,
    jobId: string,
    prompt: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const response = await this.client.getVideoJob(context, jobId);

    if (!response.ok) {
      throw await buildProviderHttpError('OpenRouter video status request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapOpenRouterVideoJob
    >[2];
    return {
      ...mapOpenRouterVideoJob(requestedModel, context, payload),
      prompt,
    };
  }
}
