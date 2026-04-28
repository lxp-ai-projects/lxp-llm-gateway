import * as dns from 'node:dns/promises';

import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';

import {
  buildGoogleImageCatalog,
  buildGoogleModelCatalog,
} from './image/catalog.js';
import { GoogleImageApiClient } from './image/api-client.js';
import { GoogleImageEditService } from './image/edit-service.js';
import { GoogleImageGenerationService } from './image/generation-service.js';

const GOOGLE_OPENAI_BASE_URL =
  process.env.GOOGLE_BASE_URL ??
  'https://generativelanguage.googleapis.com/v1beta/openai';
const GOOGLE_NATIVE_BASE_URL =
  process.env.GOOGLE_NATIVE_BASE_URL ??
  'https://generativelanguage.googleapis.com/v1beta';
const GOOGLE_REQUEST_TIMEOUT_MS = Number(
  process.env.GOOGLE_REQUEST_TIMEOUT_MS ?? '180000',
);
const GOOGLE_MAX_INLINE_REFERENCE_BYTES = Number(
  process.env.GOOGLE_MAX_INLINE_REFERENCE_BYTES ?? String(15 * 1024 * 1024),
);

export class GoogleProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
  } as const;

  private readonly baseUrl: string;
  private readonly nativeBaseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly imageApiClient: GoogleImageApiClient;
  private readonly imageGenerationService: GoogleImageGenerationService;
  private readonly imageEditService: GoogleImageEditService;

  constructor(
    baseUrl = GOOGLE_OPENAI_BASE_URL,
    requestTimeoutMs = GOOGLE_REQUEST_TIMEOUT_MS,
    nativeBaseUrl = GOOGLE_NATIVE_BASE_URL,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.nativeBaseUrl = nativeBaseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
    this.imageApiClient = new GoogleImageApiClient(
      this.baseUrl,
      this.nativeBaseUrl,
      this.requestTimeoutMs,
    );
    this.imageGenerationService = new GoogleImageGenerationService(
      this.imageApiClient,
    );
    this.imageEditService = new GoogleImageEditService(
      this.imageApiClient,
      (hostname) => this.lookupHostname(hostname),
      this.requestTimeoutMs,
      GOOGLE_MAX_INLINE_REFERENCE_BYTES,
    );
  }

  readonly providerId = 'google' as LlmProviderAdapter['providerId'];

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    return buildGoogleModelCatalog(await this.imageApiClient.listModelIds(context));
  }

  async listImageCatalog(context: ProviderExecutionContext) {
    void context;
    return buildGoogleImageCatalog(buildGoogleModelCatalog([]));
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Gemini request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string | null;
        message?: {
          role?: 'assistant';
          content?: string;
          reasoning?: string;
          reasoning_details?: unknown;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        completion_tokens_details?: {
          reasoning_tokens?: number;
        };
      };
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
        reasoningDetails: message?.reasoning_details,
      },
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        reasoningTokens:
          payload.usage?.completion_tokens_details?.reasoning_tokens,
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
        `Google Gemini streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error(
        'Google Gemini streaming response did not include a body.',
      );
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
          ...this.resolveOpenAiHeaders(context),
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

  private resolveOpenAiHeaders(
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

  protected lookupHostname(hostname: string) {
    return dns.lookup(hostname, { all: true });
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
        throw new Error(
          `Google Gemini request timed out after ${timeoutMs} ms.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
