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
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';
import { buildXAiImageCatalog, buildXAiModelCatalog } from './image/catalog.js';
import { XAiImageApiClient } from './image/api-client.js';
import { XAiImageEditService } from './image/edit-service.js';
import { XAiImageGenerationService } from './image/generation-service.js';
import {
  buildXAiVideoCatalog,
  getXAiVideoModelDescriptor,
  resolveXAiVideoModelCapabilities,
  resolveXAiVideoModelDisplayName,
} from './video/catalog.js';
import { XAiVideoApiClient } from './video/api-client.js';
import { XAiVideoGenerationService } from './video/generation-service.js';

export class XaiProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
    videoGeneration: true,
  } as const;

  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly imageApiClient: XAiImageApiClient;
  private readonly videoApiClient: XAiVideoApiClient;
  private readonly imageGenerationService: XAiImageGenerationService;
  private readonly imageEditService: XAiImageEditService;
  private readonly videoGenerationService: XAiVideoGenerationService;

  constructor(
    baseUrl = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
    requestTimeoutMs = Number(process.env.XAI_REQUEST_TIMEOUT_MS ?? '90000'),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
    this.imageApiClient = new XAiImageApiClient(
      this.baseUrl,
      this.requestTimeoutMs,
    );
    this.videoApiClient = new XAiVideoApiClient(
      this.baseUrl,
      this.requestTimeoutMs,
    );
    this.imageGenerationService = new XAiImageGenerationService(
      this.imageApiClient,
    );
    this.imageEditService = new XAiImageEditService(
      this.imageApiClient,
      (hostname) => this.lookupHostname(hostname),
    );
    this.videoGenerationService = new XAiVideoGenerationService(
      this.videoApiClient,
    );
  }

  readonly providerId: LlmProviderAdapter['providerId'] = 'xai';

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const listedModelIds = await this.imageApiClient.listModelIds(context);
    const imageModels = buildXAiModelCatalog(
      listedModelIds.filter((modelId) => !getXAiVideoModelDescriptor(modelId)),
    );
    const knownModelIds = new Set(imageModels.map((model) => model.id));
    const listedVideoModels = listedModelIds
      .filter((modelId) => getXAiVideoModelDescriptor(modelId))
      .map((modelId) => ({
        id: modelId,
        displayName: resolveXAiVideoModelDisplayName(modelId),
        capabilities: resolveXAiVideoModelCapabilities(modelId),
      }))
      .filter((model) => !knownModelIds.has(model.id));

    return [...imageModels, ...listedVideoModels];
  }

  async listImageCatalog(context: ProviderExecutionContext) {
    void context;
    return buildXAiImageCatalog(buildXAiModelCatalog([]));
  }

  async listVideoCatalog(context: ProviderExecutionContext) {
    const listedModelIds = await this.videoApiClient.listModelIds(context);
    const models = listedModelIds
      .filter((modelId) => getXAiVideoModelDescriptor(modelId))
      .map((modelId) => ({
        id: modelId,
        displayName: resolveXAiVideoModelDisplayName(modelId),
        capabilities: resolveXAiVideoModelCapabilities(modelId),
      }));

    return buildXAiVideoCatalog(models);
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string | null;
        message?: {
          role?: 'assistant';
          content?: string;
          reasoning?: string;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
      [key: string]: unknown;
    };

    const message = payload.choices?.[0]?.message;

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      message: {
        role: message?.role ?? 'assistant',
        content: message?.content ?? '',
        reasoning: message?.reasoning,
      },
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
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
        `xAI streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('xAI streaming response did not include a body.');
    }

    return response.body;
  }

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ) {
    return this.imageGenerationService.execute(request, context);
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ) {
    return this.imageEditService.execute(request, context);
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

  downloadVideoOutput = async (
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> => {
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
  };

  private dispatchChatRequest(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ): Promise<Response> {
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
          messages: request.messages,
          stream,
          user: context.userId,
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
        throw new Error(`xAI request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected lookupHostname(hostname: string) {
    return dns.lookup(hostname, { all: true });
  }
}
