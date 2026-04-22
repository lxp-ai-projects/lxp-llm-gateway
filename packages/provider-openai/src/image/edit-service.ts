import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderImageHttpError,
  formatOpenAiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { OpenAiImageApiClient } from './api-client.js';
import { buildOpenAiImageEditRequest } from './request-mapper.js';
import { mapOpenAiImageResponse } from './response-mapper.js';
import {
  resolveOpenAiImageModelDescriptor,
  validateOpenAiImageEditRequest,
} from './model-policy.js';

export class OpenAiImageEditService {
  constructor(private readonly client: OpenAiImageApiClient) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveOpenAiImageModelDescriptor(request.model);
    validateOpenAiImageEditRequest(request, model);

    const response = await this.client.postEdits(
      context,
      buildOpenAiImageEditRequest(request, model, context.userId),
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError(
        'OpenAI',
        'image edit request',
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
