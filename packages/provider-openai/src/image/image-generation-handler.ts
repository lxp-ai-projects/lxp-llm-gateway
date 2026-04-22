import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderImageHttpError,
  formatOpenAiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { isOpenAiImageModel } from './catalog.js';
import { OpenAiImageClient } from './image-client.js';
import { buildOpenAiImageGenerationBody } from './image-request-mapper.js';
import {
  mapOpenAiImageResponse,
  type OpenAiImageResponsePayload,
} from './image-response-mapper.js';

export class OpenAiImageGenerationHandler {
  constructor(private readonly client: OpenAiImageClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = request.model ?? 'gpt-image-1.5';
    assertSupportedOpenAiImageModel(model);

    const response = await this.client.postGenerations(
      context,
      buildOpenAiImageGenerationBody(request, context, model),
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError('OpenAI', 'image request', response, {
        rateLimitFormatter: formatOpenAiRateLimitError,
      });
    }

    const payload = (await response.json()) as OpenAiImageResponsePayload;
    return mapOpenAiImageResponse(model, context, payload);
  }
}

export function assertSupportedOpenAiImageModel(modelId: string) {
  if (!isOpenAiImageModel(modelId)) {
    throw new Error(`OpenAI image model ${modelId} is not supported.`);
  }
}
