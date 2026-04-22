import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  formatGoogleGeminiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { GoogleImageClient } from './image-client.js';
import { assertSupportedGoogleImageModel } from './image-generation-handler.js';
import { buildGoogleGenerateContentBody } from './image-request-mapper.js';
import {
  mapGoogleGenerateContentResponse,
  type GoogleGenerateContentResponse,
} from './image-response-mapper.js';

export class GoogleImageEditHandler {
  constructor(
    private readonly client: GoogleImageClient,
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
    const model = request.model ?? 'gemini-2.5-flash-image';
    assertSupportedGoogleImageModel(model);

    if (request.images.length === 0) {
      throw new Error(
        'Google Gemini image editing requires at least one reference image.',
      );
    }

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
        images: request.images,
        n: request.n,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
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
      });
    }

    const payload = (await response.json()) as GoogleGenerateContentResponse;
    return mapGoogleGenerateContentResponse(model, context, payload);
  }
}
