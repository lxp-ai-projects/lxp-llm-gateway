import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderImageHttpError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { ZaiImageApiClient } from './api-client.js';
import {
  resolveZaiImageModelDescriptor,
  validateZaiImageGenerationRequest,
} from './model-policy.js';
import { buildZaiImageGenerationRequest } from './request-mapper.js';
import { mapZaiImageResponse } from './response-mapper.js';

export class ZaiImageGenerationService {
  constructor(private readonly client: ZaiImageApiClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveZaiImageModelDescriptor(request.model);
    validateZaiImageGenerationRequest(request, model);

    const response = await this.client.postGenerations(
      context,
      buildZaiImageGenerationRequest(request, model, context.userId),
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError(
        'Z.ai',
        'image generation',
        response,
      );
    }

    const payload = (await response.json()) as Parameters<
      typeof mapZaiImageResponse
    >[2];
    return mapZaiImageResponse(model.id, context, payload);
  }
}
