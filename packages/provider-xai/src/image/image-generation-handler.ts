import type {
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { isXAiImageModel } from './catalog.js';
import { XAiImageClient } from './image-client.js';
import { buildXAiImageGenerationBody } from './image-request-mapper.js';
import {
  mapXAiImageResponse,
  type XAiImageResponsePayload,
} from './image-response-mapper.js';

export class XAiImageGenerationHandler {
  constructor(private readonly client: XAiImageClient) {}

  async execute(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    assertSupportedXAiImageModel(request.model);
    const response = await this.client.createGeneration(
      context,
      buildXAiImageGenerationBody(request),
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI image generation failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as XAiImageResponsePayload;
    return mapXAiImageResponse(request.model, context, payload);
  }
}

export function assertSupportedXAiImageModel(modelId: string | undefined) {
  if (!modelId || !isXAiImageModel(modelId)) {
    throw new Error(`xAI image model ${modelId ?? 'undefined'} is not supported.`);
  }
}
