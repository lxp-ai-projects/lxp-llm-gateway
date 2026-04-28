import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { OpenRouterImageApiClient } from './api-client.js';
import {
  resolveOpenRouterImageModelDescriptor,
  validateOpenRouterImageGenerationRequest,
} from './model-policy.js';
import { buildOpenRouterImageGenerationRequest } from './request-mapper.js';
import { mapOpenRouterImageResponse } from './response-mapper.js';

export class OpenRouterImageGenerationService {
  constructor(private readonly client: OpenRouterImageApiClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveOpenRouterImageModelDescriptor(request.model);
    validateOpenRouterImageGenerationRequest(request, model);

    const response = await this.client.postGenerations(
      context,
      buildOpenRouterImageGenerationRequest(request, model, context.userId),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('OpenRouter image request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapOpenRouterImageResponse
    >[2];
    return mapOpenRouterImageResponse(model.id, context, payload);
  }
}
