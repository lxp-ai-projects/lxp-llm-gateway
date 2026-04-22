import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  formatGoogleGeminiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { isGoogleImageModel } from './catalog.js';
import { GoogleImageClient } from './image-client.js';
import { buildGoogleGenerateContentBody } from './image-request-mapper.js';
import {
  mapGoogleGenerateContentResponse,
  type GoogleGenerateContentResponse,
} from './image-response-mapper.js';

export class GoogleImageGenerationHandler {
  constructor(
    private readonly client: GoogleImageClient,
    private readonly requestTimeoutMs: number,
    private readonly maxInlineReferenceBytes: number,
  ) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = request.model ?? 'gemini-2.5-flash-image';
    assertSupportedGoogleImageModel(model);

    if (request.responseFormat && request.responseFormat !== 'b64_json') {
      throw new Error(
        'Google Gemini image generation currently returns inline image bytes only. Use responseFormat "b64_json".',
      );
    }

    const response = await this.client.generateContent(
      context,
      model,
      await buildGoogleGenerateContentBody({
        prompt: request.prompt,
        images: [],
        n: request.n,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        lookupHostname: async () => [],
        fetchWithTimeout: (url, init, timeoutMs) =>
          this.client.fetchReference(url, init, timeoutMs ?? this.requestTimeoutMs),
        timeoutMs: this.requestTimeoutMs,
        maxInlineReferenceBytes: this.maxInlineReferenceBytes,
      }),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('Google Gemini image request', response, {
        rateLimitFormatter: formatGoogleGeminiRateLimitError,
      });
    }

    const payload = (await response.json()) as GoogleGenerateContentResponse;
    return mapGoogleGenerateContentResponse(model, context, payload);
  }
}

export function assertSupportedGoogleImageModel(modelId: string) {
  if (!isGoogleImageModel(modelId)) {
    throw new Error(`Google image model ${modelId} is not supported.`);
  }
}
