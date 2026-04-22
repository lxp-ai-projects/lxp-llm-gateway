import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { XAiImageClient } from './image-client.js';
import { buildXAiImageEditBody } from './image-request-mapper.js';
import {
  assertSupportedXAiImageModel,
} from './image-generation-handler.js';
import {
  mapXAiImageResponse,
  type XAiImageResponsePayload,
} from './image-response-mapper.js';

export class XAiImageEditHandler {
  constructor(
    private readonly client: XAiImageClient,
    private readonly lookupHostname: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>,
  ) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    assertSupportedXAiImageModel(request.model);

    if (request.images.length === 0) {
      throw new Error('xAI image editing requires at least one reference image.');
    }

    const response = await this.client.createEdit(
      context,
      await buildXAiImageEditBody(request, this.lookupHostname),
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI image edit failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as XAiImageResponsePayload;
    return mapXAiImageResponse(request.model, context, payload);
  }
}
