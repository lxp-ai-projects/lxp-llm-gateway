import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  formatGoogleGeminiRateLimitError,
  formatGoogleGeminiTemporaryUnavailableError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { GoogleImageApiClient } from './api-client.js';
import {
  resolveGoogleImageModelDescriptor,
  validateGoogleImageGenerationRequest,
} from './model-policy.js';
import { buildGoogleImageGenerationRequest } from './request-mapper.js';
import { mapGoogleGenerateContentResponse } from './response-mapper.js';

export class GoogleImageGenerationService {
  constructor(private readonly client: GoogleImageApiClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveGoogleImageModelDescriptor(request.model);
    validateGoogleImageGenerationRequest(request, model);

    const response = await this.client.postGenerateContent(
      context,
      model.id,
      await buildGoogleImageGenerationRequest(request, model),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('Google Gemini image request', response, {
        rateLimitFormatter: formatGoogleGeminiRateLimitError,
        serverErrorFormatter: formatGoogleGeminiTemporaryUnavailableError,
      });
    }

    const payload = (await response.json()) as Parameters<
      typeof mapGoogleGenerateContentResponse
    >[2];
    return mapGoogleGenerateContentResponse(model.id, context, payload);
  }
}
