import type {
  GatewayChatRequest,
  GatewayChatResponse,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from './index.js';

type OpenAiCompatibleModelListPayload =
  | {
      data?: Array<{
        id: string;
        name?: string;
        owned_by?: string;
      }>;
    }
  | Array<{
      id: string;
      name?: string;
      owned_by?: string;
    }>;

type OpenAiCompatibleChatPayload = {
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

export interface OpenAiCompatibleTextProviderOptions {
  providerId: LlmProviderAdapter['providerId'];
  displayName: string;
  defaultBaseUrl: string;
  requestTimeoutMs: number;
  capabilities?: LlmProviderAdapter['capabilities'];
  modelListPath?: string;
  chatCompletionsPath?: string;
  buildRequestBody?: (
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ) => Record<string, unknown>;
  mapModels?: (
    payload: OpenAiCompatibleModelListPayload,
    context: ProviderExecutionContext,
  ) => ProviderModel[];
  mapProviderMetadata?: (
    payload: OpenAiCompatibleChatPayload,
  ) => Record<string, unknown> | undefined;
  formatErrorMessage?: (input: {
    response: Response;
    rawBody: string;
    parsedBody: unknown;
    operation: string;
    providerDisplayName: string;
  }) => string;
}

export class OpenAiCompatibleTextProviderAdapter
  implements LlmProviderAdapter
{
  readonly capabilities;

  private readonly modelListPath: string;
  private readonly chatCompletionsPath: string;

  constructor(private readonly options: OpenAiCompatibleTextProviderOptions) {
    this.capabilities =
      options.capabilities ??
      ({
        chat: true,
        modelCatalog: true,
        imageGeneration: false,
        imageEditing: false,
      } as const);
    this.modelListPath = options.modelListPath ?? '/models';
    this.chatCompletionsPath =
      options.chatCompletionsPath ?? '/chat/completions';
  }

  get providerId(): LlmProviderAdapter['providerId'] {
    return this.options.providerId;
  }

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const response = await this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}${this.modelListPath}`,
      {
        headers: this.resolveHeaders(context),
      },
      this.options.requestTimeoutMs,
    );

    if (!response.ok) {
      throw new Error(
        await this.formatHttpError(response, 'model listing', context),
      );
    }

    const payload = (await response.json()) as OpenAiCompatibleModelListPayload;
    return this.options.mapModels
      ? this.options.mapModels(payload, context)
      : this.mapModels(payload);
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      throw new Error(await this.formatHttpError(response, 'request', context));
    }

    const payload = (await response.json()) as OpenAiCompatibleChatPayload;
    const message = payload.choices?.[0]?.message;

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
      providerMetadata: this.options.mapProviderMetadata
        ? this.options.mapProviderMetadata(payload)
        : this.collectDefaultProviderMetadata(payload),
    };
  }

  async chatStream(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.dispatchChatRequest(request, context, true);

    if (!response.ok) {
      throw new Error(
        await this.formatHttpError(response, 'streaming request', context),
      );
    }

    if (!response.body) {
      throw new Error(
        `${this.options.displayName} streaming response did not include a body.`,
      );
    }

    return response.body;
  }

  protected resolveBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.options.defaultBaseUrl).replace(
      /\/$/,
      '',
    );
  }

  protected resolveHeaders(
    context: ProviderExecutionContext,
  ): Record<string, string> {
    const providerAccess = context.providerAccess ?? {};
    const headers = {
      ...providerAccess.headers,
    };
    const hasAuthorizationHeader = Object.keys(headers).some(
      (headerName) => headerName.toLowerCase() === 'authorization',
    );

    if (providerAccess.apiKey && !hasAuthorizationHeader) {
      headers.authorization = `Bearer ${providerAccess.apiKey}`;
    }

    return headers;
  }

  protected async fetchWithTimeout(
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
          `${this.options.displayName} request timed out after ${timeoutMs} ms.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private dispatchChatRequest(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ): Promise<Response> {
    const body = this.options.buildRequestBody
      ? this.options.buildRequestBody(request, context, stream)
      : {
          model: request.model,
          messages: request.messages,
          stream,
          user: context.userId,
          max_tokens: request.maxOutputTokens,
        };

    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}${this.chatCompletionsPath}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify(body),
      },
      stream ? null : this.options.requestTimeoutMs,
    );
  }

  private mapModels(payload: OpenAiCompatibleModelListPayload): ProviderModel[] {
    const data = Array.isArray(payload) ? payload : payload.data ?? [];
    return data.map((model) => ({
      id: model.id,
      displayName: model.name ?? model.id,
    }));
  }

  private collectDefaultProviderMetadata(
    payload: OpenAiCompatibleChatPayload,
  ): Record<string, unknown> | undefined {
    const providerMetadata = Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          key.startsWith('x_') ||
          key === 'id' ||
          key === 'object' ||
          key === 'created',
      ),
    );

    return Object.keys(providerMetadata).length ? providerMetadata : undefined;
  }

  private async formatHttpError(
    response: Response,
    operation: string,
    context: ProviderExecutionContext,
  ): Promise<string> {
    const rawBody = await response.text();
    const parsedBody = this.tryParseJson(rawBody);

    if (this.options.formatErrorMessage) {
      return this.options.formatErrorMessage({
        response,
        rawBody,
        parsedBody,
        operation,
        providerDisplayName: this.options.displayName,
      });
    }

    const message =
      this.extractErrorMessage(parsedBody) ?? rawBody.trim() ?? 'Unknown error.';
    const requestId = this.extractRequestId(parsedBody);
    const baseMessage = `${this.options.displayName} ${operation} failed with status ${response.status}: ${message}`;

    void context;
    return requestId ? `${baseMessage} (request_id: ${requestId})` : baseMessage;
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private extractErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as {
      message?: unknown;
      error?: { message?: unknown } | unknown;
    };

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim();
    }

    if (
      record.error &&
      typeof record.error === 'object' &&
      typeof (record.error as { message?: unknown }).message === 'string'
    ) {
      return (
        (record.error as { message?: string }).message?.trim() ?? null
      );
    }

    return null;
  }

  private extractRequestId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    for (const key of ['request_id', 'requestId']) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }
}
