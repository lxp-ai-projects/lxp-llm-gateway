import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderImageHttpError,
  formatXAiImageClientError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { XAiImageApiClient } from './api-client.js';
import {
  resolveXAiImageModelDescriptor,
  validateXAiImageEditRequest,
} from './model-policy.js';
import { buildXAiImageEditRequest } from './request-mapper.js';
import { mapXAiImageResponse } from './response-mapper.js';

export class XAiImageEditService {
  constructor(
    private readonly client: XAiImageApiClient,
    private readonly lookupHostname: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>,
  ) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveXAiImageModelDescriptor(request.model);
    validateXAiImageEditRequest(request, model);

    const response = await this.client.postEdits(
      context,
      await buildXAiImageEditRequest(request, model, this.lookupHostname),
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError('xAI', 'image edit', response, {
        clientErrorFormatter: formatXAiImageClientError,
      });
    }

    const payload = (await response.json()) as Parameters<
      typeof mapXAiImageResponse
    >[2];
    return mapXAiImageResponse(model.id, context, payload);
  }
}
