import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderImageHttpError,
  formatXAiImageClientError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { XAiImageApiClient } from './api-client.js';
import {
  resolveXAiImageModelDescriptor,
  validateXAiImageGenerationRequest,
} from './model-policy.js';
import { buildXAiImageGenerationRequest } from './request-mapper.js';
import { mapXAiImageResponse } from './response-mapper.js';

export class XAiImageGenerationService {
  constructor(private readonly client: XAiImageApiClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveXAiImageModelDescriptor(request.model);
    validateXAiImageGenerationRequest(request, model);

    const response = await this.client.postGenerations(
      context,
      buildXAiImageGenerationRequest(request, model),
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError('xAI', 'image generation', response, {
        clientErrorFormatter: formatXAiImageClientError,
      });
    }

    const payload = (await response.json()) as Parameters<
      typeof mapXAiImageResponse
    >[2];
    return mapXAiImageResponse(model.id, context, payload);
  }
}
