import type {
  GatewayChatContentPart,
  GatewayChatRequest,
  GatewayChatResponse,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';
import { isGlmThinkingModel } from '@lxp/domain';

export class OllamaProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: false,
    imageEditing: false,
  } as const;

  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1',
    requestTimeoutMs = Number(process.env.OLLAMA_REQUEST_TIMEOUT_MS ?? '90000'),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
  }

  readonly providerId = 'ollama' as const;

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const response = await fetch(`${this.resolveNativeBaseUrl(context)}/api/tags`, {
      headers: this.resolveHeaders(context),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      models?: Array<{
        name?: string;
        model?: string;
      }>;
    };

    return (payload.models ?? []).map((model) => {
      const modelId = model.model ?? model.name ?? 'unknown-model';

      return {
        id: modelId,
        displayName: model.name ?? modelId,
      };
    });
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    if (this.shouldUseNativeChatApi(request, context)) {
      return this.chatViaNativeApi(request, context);
    }

    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama request failed with status ${response.status}: ${errorText}`,
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
    if (this.shouldUseNativeChatApi(request, context)) {
      return this.chatStreamViaNativeApi(request, context);
    }

    const response = await this.dispatchChatRequest(request, context, true);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('Ollama streaming response did not include a body.');
    }

    return response.body;
  }

  private dispatchChatRequest(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ): Promise<Response> {
    const normalizedMessages = request.messages.map((message) => ({
      ...message,
      content: this.extractTextOnlyContent(message.content, message.role),
    }));

    return this.fetchWithTimeout(
      `${this.resolveOpenAiBaseUrl(context)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          messages: normalizedMessages,
          stream,
          user: context.userId,
          ...(typeof request.maxOutputTokens === 'number'
            ? { max_tokens: request.maxOutputTokens }
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

  private shouldUseNativeApi(context: ProviderExecutionContext): boolean {
    const parsedUrl = this.parseConfiguredBaseUrl(this.resolveBaseUrl(context));
    const hostname = parsedUrl.hostname.toLowerCase();

    return hostname === 'ollama.com' || hostname === 'www.ollama.com';
  }

  private shouldUseNativeChatApi(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): boolean {
    if (this.shouldUseNativeApi(context)) {
      return true;
    }

    return (
      supportsOllamaGlmThinking(request.model) &&
      typeof request.providerOptions?.ollama?.thinking?.enabled === 'boolean'
    );
  }

  private resolveOpenAiBaseUrl(context: ProviderExecutionContext): string {
    const baseUrl = this.resolveBaseUrl(context);

    this.assertValidConfiguredBaseUrl(baseUrl, context);

    if (/\/v1$/i.test(baseUrl)) {
      return baseUrl;
    }

    return `${baseUrl}/v1`;
  }

  private resolveNativeBaseUrl(context: ProviderExecutionContext): string {
    const baseUrl = this.resolveBaseUrl(context);
    this.assertValidConfiguredBaseUrl(baseUrl, context);
    return baseUrl.replace(/\/v1$/i, '');
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

  private parseConfiguredBaseUrl(baseUrl: string): URL {
    try {
      return new URL(baseUrl);
    } catch {
      throw new Error(
        `Ollama base URL is invalid: ${baseUrl}. Use a runtime API endpoint such as http://127.0.0.1:11434, http://127.0.0.1:11434/v1, or https://ollama.com for cloud API access.`,
      );
    }
  }

  private assertValidConfiguredBaseUrl(
    baseUrl: string,
    context: ProviderExecutionContext,
  ): void {
    const parsedUrl = this.parseConfiguredBaseUrl(baseUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (
      (hostname === 'ollama.com' || hostname === 'www.ollama.com') &&
      !context.providerAccess.apiKey
    ) {
      throw new Error(
        `Ollama cloud access via ${parsedUrl.origin} requires an API key. Provide a bearer token or use a local/runtime endpoint such as http://127.0.0.1:11434.`,
      );
    }
  }

  private async chatViaNativeApi(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const normalizedMessages = request.messages.map((message) => ({
      ...message,
      content: this.extractTextOnlyContent(message.content, message.role),
    }));

    const response = await this.fetchWithTimeout(
      `${this.resolveNativeBaseUrl(context)}/api/chat`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          messages: normalizedMessages,
          stream: false,
          ...(supportsOllamaGlmThinking(request.model) &&
          typeof request.providerOptions?.ollama?.thinking?.enabled === 'boolean'
            ? {
                think: request.providerOptions.ollama.thinking.enabled,
              }
            : {}),
        }),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      done_reason?: string | null;
      message?: {
        role?: 'assistant';
        content?: string;
        reasoning?: string;
        thinking?: string;
      };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const reasoning =
      payload.message?.reasoning ?? payload.message?.thinking ?? undefined;
    const promptTokens = payload.prompt_eval_count;
    const completionTokens = payload.eval_count;

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      message: {
        role: payload.message?.role ?? 'assistant',
        content: payload.message?.content ?? '',
        reasoning,
      },
      finishReason: payload.done_reason ?? null,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens:
          typeof promptTokens === 'number' && typeof completionTokens === 'number'
            ? promptTokens + completionTokens
            : undefined,
      },
    };
  }

  private async chatStreamViaNativeApi(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const normalizedMessages = request.messages.map((message) => ({
      ...message,
      content: this.extractTextOnlyContent(message.content, message.role),
    }));

    const response = await this.fetchWithTimeout(
      `${this.resolveNativeBaseUrl(context)}/api/chat`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          messages: normalizedMessages,
          stream: true,
          ...(supportsOllamaGlmThinking(request.model) &&
          typeof request.providerOptions?.ollama?.thinking?.enabled === 'boolean'
            ? {
                think: request.providerOptions.ollama.thinking.enabled,
              }
            : {}),
        }),
      },
      null,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('Ollama streaming response did not include a body.');
    }

    return this.transformNativeStreamToSse(response.body);
  }

  private transformNativeStreamToSse(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = stream.getReader();

        const enqueueChunk = (payload: {
          message?: { content?: string; reasoning?: string; thinking?: string };
          done?: boolean;
          done_reason?: string | null;
        }) => {
          const reasoning =
            payload.message?.reasoning ?? payload.message?.thinking;
          const content = payload.message?.content;
          const finishReason = payload.done ? (payload.done_reason ?? 'stop') : undefined;

          if (!reasoning && !content && !finishReason) {
            return;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                choices: [
                  {
                    delta: {
                      reasoning,
                      content,
                    },
                    finish_reason: finishReason,
                  },
                ],
              })}\n\n`,
            ),
          );
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) {
                continue;
              }

              enqueueChunk(
                JSON.parse(trimmed) as {
                  message?: {
                    content?: string;
                    reasoning?: string;
                    thinking?: string;
                  };
                  done?: boolean;
                  done_reason?: string | null;
                },
              );
            }
          }

          const trailing = buffer.trim();
          if (trailing) {
            enqueueChunk(
              JSON.parse(trailing) as {
                message?: {
                  content?: string;
                  reasoning?: string;
                  thinking?: string;
                };
                done?: boolean;
                done_reason?: string | null;
              },
            );
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });
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
        throw new Error(`Ollama request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private extractTextOnlyContent(
    content: string | GatewayChatContentPart[],
    role: 'system' | 'user' | 'assistant',
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    const textParts: string[] = [];
    for (const part of content) {
      if (part.type === 'text') {
        textParts.push(part.text);
        continue;
      }

      throw new Error(
        `Ollama gateway chat does not yet support image attachments for ${role} messages.`,
      );
    }

    return textParts.join('\n');
  }
}

function supportsOllamaGlmThinking(model: string | undefined): boolean {
  return isGlmThinkingModel(model);
}
