import * as dns from 'node:dns/promises';

import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderModel,
  ProviderExecutionContext,
} from '@lxp/provider-sdk';
import { buildProviderImageHttpError as buildImageError } from '@lxp/provider-sdk';

import { NanoGptImageApiClient } from './image/api-client.js';
import { buildNanoGptImageCatalog } from './image/catalog.js';
import {
  resolveNanoGptImageModelDescriptor,
  validateNanoGptImageEditRequest,
  validateNanoGptImageGenerationRequest,
} from './image/model-policy.js';
import {
  buildNanoGptImageEditRequest,
  buildNanoGptImageGenerationRequest,
} from './image/request-mapper.js';
import { mapNanoGptImageResponse } from './image/response-mapper.js';
import { NanoGptVideoApiClient } from './video/api-client.js';
import { buildNanoGptVideoCatalog } from './video/catalog.js';
import { NanoGptVideoGenerationService } from './video/generation-service.js';

export class NanoGptProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
    videoGeneration: true,
  } as const;

  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly imageApiClient: NanoGptImageApiClient;
  private readonly videoApiClient: NanoGptVideoApiClient;
  private readonly videoGenerationService: NanoGptVideoGenerationService;

  constructor(
    baseUrl = process.env.NANOGPT_BASE_URL ?? 'https://nano-gpt.com/api/v1',
    requestTimeoutMs = Number(
      process.env.NANOGPT_REQUEST_TIMEOUT_MS ?? '90000',
    ),
    imageRequestTimeoutMs = Number(
      process.env.NANOGPT_IMAGE_REQUEST_TIMEOUT_MS ?? '300000',
    ),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
    this.imageApiClient = new NanoGptImageApiClient(
      this.baseUrl,
      imageRequestTimeoutMs,
    );
    this.videoApiClient = new NanoGptVideoApiClient(
      this.baseUrl,
      imageRequestTimeoutMs,
    );
    this.videoGenerationService = new NanoGptVideoGenerationService(
      this.videoApiClient,
    );
  }

  readonly providerId = 'nanogpt' as const;

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const response = await fetch(`${this.resolveBaseUrl(context)}/models`, {
      headers: {
        ...this.resolveHeaders(context),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NanoGPT model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        name?: string;
      }>;
    };

    return (payload.data ?? []).map((model) => ({
      id: model.id,
      displayName: model.name ?? model.id,
    }));
  }

  async listImageCatalog(context: ProviderExecutionContext) {
    const [subscriptionCatalog, paidCatalog, canonicalCatalog] =
      await Promise.all([
        this.imageApiClient
          .listImageModels(context, '/subscription/v1/image-models')
          .catch(() => null),
        this.imageApiClient
          .listImageModels(context, '/paid/v1/image-models')
          .catch(() => null),
        this.imageApiClient.listImageModels(context, '/image-models').catch(() => null),
      ]);

    if (!subscriptionCatalog && !paidCatalog && !canonicalCatalog) {
      throw new Error('NanoGPT image catalog lookup failed for all known endpoints.');
    }

    return buildNanoGptImageCatalog({
      subscriptionModels: subscriptionCatalog?.data ?? [],
      paidModels: paidCatalog?.data ?? [],
      allModels: canonicalCatalog?.data ?? [],
    });
  }

  async listVideoCatalog(context: ProviderExecutionContext) {
    const [canonicalCatalog, subscriptionCatalog, paidCatalog] =
      await Promise.all([
        this.videoApiClient.listVideoModels(context, '/video-models').catch(() => null),
        this.videoApiClient
          .listVideoModels(context, '/subscription/v1/video-models')
          .catch(() => null),
        this.videoApiClient
          .listVideoModels(context, '/paid/v1/video-models')
          .catch(() => null),
      ]);

    if (!canonicalCatalog && !subscriptionCatalog && !paidCatalog) {
      throw new Error('NanoGPT video catalog lookup failed for all known endpoints.');
    }

    return buildNanoGptVideoCatalog({
      subscriptionModels: subscriptionCatalog?.data ?? [],
      paidModels: paidCatalog?.data ?? [],
      allModels: canonicalCatalog?.data ?? [],
    });
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NanoGPT request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string | null;
        message?: {
          role?: 'assistant';
          content?: string;
          reasoning?: string;
          reasoning_content?: string;
          reasoning_details?: unknown;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        reasoning_tokens?: number;
        completion_tokens_details?: {
          reasoning_tokens?: number;
        };
      };
      [key: string]: unknown;
    };

    const message = payload.choices?.[0]?.message;
    const providerMetadata = Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          key.startsWith('x_') ||
          key === 'id' ||
          key === 'object' ||
          key === 'created',
      ),
    );

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      message: {
        role: message?.role ?? 'assistant',
        content: message?.content ?? '',
        reasoning: message?.reasoning ?? message?.reasoning_content,
        reasoningDetails: message?.reasoning_details,
      },
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        reasoningTokens:
          payload.usage?.reasoning_tokens ??
          payload.usage?.completion_tokens_details?.reasoning_tokens,
      },
      providerMetadata: Object.keys(providerMetadata).length
        ? providerMetadata
        : undefined,
    };
  }

  async chatStream(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.dispatchChatRequest(request, context, true);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NanoGPT streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('NanoGPT streaming response did not include a body.');
    }

    return response.body;
  }

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ) {
    const model = resolveNanoGptImageModelDescriptor(request.model);
    validateNanoGptImageGenerationRequest(request, model);

    const response = await this.imageApiClient.postGenerations(
      context,
      buildNanoGptImageGenerationRequest(request, context.userId),
    );

    if (!response.ok) {
      throw await buildImageError('NanoGPT', 'image generation', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapNanoGptImageResponse
    >[2];
    return mapNanoGptImageResponse(model.id, context, payload);
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ) {
    const model = resolveNanoGptImageModelDescriptor(request.model);
    validateNanoGptImageEditRequest(request, model);

    const response = await this.imageApiClient.postGenerations(
      context,
      await buildNanoGptImageEditRequest(request, context.userId, {
        fetchWithTimeout: (url, init, timeoutMs) =>
          this.fetchWithTimeout(url, init, timeoutMs),
        lookupHostname: (hostname) => dns.lookup(hostname, { all: true }),
        maxBytes: 4 * 1024 * 1024,
        timeoutMs: 30000,
      }),
    );

    if (!response.ok) {
      throw await buildImageError('NanoGPT', 'image edit request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapNanoGptImageResponse
    >[2];
    return mapNanoGptImageResponse(model.id, context, payload);
  }

  async submitVideoGeneration(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    return this.videoGenerationService.submit(request, context);
  }

  async getVideoGenerationJob(
    jobId: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const requestedModel =
      typeof context.metadata?.requestedModel === 'string'
        ? context.metadata.requestedModel
        : 'unknown-model';
    const prompt =
      typeof context.metadata?.prompt === 'string' ? context.metadata.prompt : '';

    return this.videoGenerationService.getJob(
      requestedModel,
      jobId,
      prompt,
      context,
    );
  }

  async downloadVideoOutput(
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const requestedModel =
      typeof context.metadata?.requestedModel === 'string'
        ? context.metadata.requestedModel
        : 'unknown-model';

    return this.videoGenerationService.downloadOutput(
      requestedModel,
      jobId,
      outputIndex,
      context,
    );
  }

  private dispatchChatRequest(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ): Promise<Response> {
    const zaiThinking = request.providerOptions?.zai?.thinking;

    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(typeof message.reasoningContent === 'string' &&
            message.reasoningContent.trim()
              ? {
                  reasoning_content: message.reasoningContent,
                }
              : {}),
          })),
          stream,
          user: context.userId,
          ...(typeof request.maxOutputTokens === 'number'
            ? { max_tokens: request.maxOutputTokens }
            : {}),
          ...(isNanoGptZaiThinkingModel(request.model) && zaiThinking
            ? {
                thinking: {
                  type: zaiThinking.type,
                  ...(typeof zaiThinking.clearThinking === 'boolean'
                    ? {
                        clear_thinking: zaiThinking.clearThinking,
                      }
                    : {}),
                },
              }
            : {}),
        }),
      },
      stream ? null : this.requestTimeoutMs,
    );
  }

  private resolveBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.baseUrl).replace(/\/$/, '');
  }

  private resolveHeaders(
    context: ProviderExecutionContext,
  ): Record<string, string> {
    const providerAccess = context.providerAccess ?? {};
    const headers = {
      ...providerAccess.headers,
    };

    if (providerAccess.apiKey && !headers.authorization) {
      headers.authorization = `Bearer ${providerAccess.apiKey}`;
    }

    return headers;
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
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`NanoGPT request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function isNanoGptZaiThinkingModel(model: string | undefined): boolean {
  if (!model) {
    return false;
  }

  return /^z-ai\/glm-(5(?:[.:\-/_]|$)|4\.(?:7|6|5)(?:[.:\-/_]|$))/i.test(
    model,
  );
}
