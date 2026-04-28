import type {
  GatewayImageEditRequest,
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
  validateGoogleImageEditRequest,
} from './model-policy.js';
import { buildGoogleImageEditRequest } from './request-mapper.js';
import { mapGoogleGenerateContentResponse } from './response-mapper.js';

export class GoogleImageEditService {
  constructor(
    private readonly client: GoogleImageApiClient,
    private readonly lookupHostname: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>,
    private readonly requestTimeoutMs: number,
    private readonly maxInlineReferenceBytes: number,
  ) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveGoogleImageModelDescriptor(request.model);
    validateGoogleImageEditRequest(request, model);

    const response = await this.client.postGenerateContent(
      context,
      model.id,
      await buildGoogleImageEditRequest(request, model, {
        lookupHostname: this.lookupHostname,
        fetchWithTimeout: (url, init, timeoutMs) =>
          this.client.fetchReference(url, init, timeoutMs ?? this.requestTimeoutMs),
        timeoutMs: this.requestTimeoutMs,
        maxInlineReferenceBytes: this.maxInlineReferenceBytes,
      }),
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
