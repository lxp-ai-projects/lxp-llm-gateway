import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { OpenRouterImageApiClient } from './api-client.js';
import {
  resolveOpenRouterImageModelDescriptor,
  validateOpenRouterImageEditRequest,
} from './model-policy.js';
import { buildOpenRouterImageEditRequest } from './request-mapper.js';
import { mapOpenRouterImageResponse } from './response-mapper.js';

export class OpenRouterImageEditService {
  constructor(private readonly client: OpenRouterImageApiClient) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveOpenRouterImageModelDescriptor(request.model);
    validateOpenRouterImageEditRequest(request, model);

    const response = await this.client.postGenerations(
      context,
      await buildOpenRouterImageEditRequest(request, model, context.userId),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('OpenRouter image edit request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapOpenRouterImageResponse
    >[2];
    return mapOpenRouterImageResponse(model.id, context, payload);
  }
}
