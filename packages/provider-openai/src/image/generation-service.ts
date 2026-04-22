import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderImageHttpError,
  formatOpenAiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { OpenAiImageApiClient } from './api-client.js';
import { buildOpenAiImageGenerationRequest } from './request-mapper.js';
import { mapOpenAiImageResponse } from './response-mapper.js';
import {
  resolveOpenAiImageModelDescriptor,
  validateOpenAiImageGenerationRequest,
} from './model-policy.js';

export class OpenAiImageGenerationService {
  constructor(private readonly client: OpenAiImageApiClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveOpenAiImageModelDescriptor(request.model);
    validateOpenAiImageGenerationRequest(request, model);

    const response = await this.client.postGenerations(
      context,
      buildOpenAiImageGenerationRequest(request, model, context.userId),
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError(
        'OpenAI',
        'image request',
        response,
        {
          rateLimitFormatter: formatOpenAiRateLimitError,
        },
      );
    }

    const payload = (await response.json()) as Parameters<
      typeof mapOpenAiImageResponse
    >[2];
    return mapOpenAiImageResponse(model.id, context, payload);
  }
}
