import type {
  GatewayImageEditRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import * as dns from 'node:dns/promises';
import {
  buildProviderImageHttpError,
  formatOpenAiRateLimitError,
} from '@lxp/provider-sdk';
import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { OpenAiImageApiClient } from './api-client.js';
import { buildOpenAiImageEditRequest } from './request-mapper.js';
import { mapOpenAiImageResponse } from './response-mapper.js';
import {
  resolveOpenAiImageModelDescriptor,
  validateOpenAiImageEditRequest,
} from './model-policy.js';

export class OpenAiImageEditService {
  constructor(private readonly client: OpenAiImageApiClient) {}

  async execute(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = resolveOpenAiImageModelDescriptor(request.model);
    validateOpenAiImageEditRequest(request, model);

    const transportRequest = await buildOpenAiImageEditRequest(
      request,
      model,
      context.userId,
      {
        fetchWithTimeout: this.fetchWithTimeout,
        lookupHostname: (hostname) => dns.lookup(hostname, { all: true }),
        timeoutMs: 30_000,
        maxBytes: 50 * 1024 * 1024,
      },
    );

    const response = await this.client.postEdits(
      context,
      transportRequest,
    );

    if (!response.ok) {
      throw await buildProviderImageHttpError(
        'OpenAI',
        'image edit request',
        response,
        {
          rateLimitFormatter: formatOpenAiRateLimitError,
        },
      );
    }

    const payload = (await response.json()) as Parameters<
      typeof mapOpenAiImageResponse
    >[2];
    return mapOpenAiImageResponse(model.id, context, payload);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number | null,
  ): Promise<Response> {
    if (timeoutMs === null || timeoutMs <= 0) {
      return fetch(url, init);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
