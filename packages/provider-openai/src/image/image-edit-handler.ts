import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  formatOpenAiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { OpenAiImageClient } from './image-client.js';
import { buildOpenAiImageEditBody } from './image-edit-request-mapper.js';
import { assertSupportedOpenAiImageModel } from './image-generation-handler.js';
import {
  mapOpenAiImageResponse,
  type OpenAiImageResponsePayload,
} from './image-response-mapper.js';

export class OpenAiImageEditHandler {
  constructor(private readonly client: OpenAiImageClient) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = request.model ?? 'gpt-image-1.5';
    assertSupportedOpenAiImageModel(model);

    if (request.images.length === 0) {
      throw new Error('OpenAI image editing requires at least one reference image.');
    }

    const response = await this.client.postEdits(
      context,
      await buildOpenAiImageEditBody(
        { ...request, model },
        { userId: context.userId },
      ),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('OpenAI image edit request', response, {
        rateLimitFormatter: formatOpenAiRateLimitError,
      });
    }

    const payload = (await response.json()) as OpenAiImageResponsePayload;
    return mapOpenAiImageResponse(model, context, payload);
  }
}
