import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export class AnthropicProviderAdapter implements LlmProviderAdapter {
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly apiVersion: string;

  constructor(
    baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
    requestTimeoutMs = Number(
      process.env.ANTHROPIC_REQUEST_TIMEOUT_MS ?? '90000',
    ),
    apiVersion = process.env.ANTHROPIC_API_VERSION ?? '2023-06-01',
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
    this.apiVersion = apiVersion;
  }

  readonly providerId = 'anthropic' as LlmProviderAdapter['providerId'];

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const response = await fetch(`${this.resolveBaseUrl(context)}/v1/models`, {
      headers: this.resolveHeaders(context),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        display_name?: string;
      }>;
    };

    return (payload.data ?? []).map((model) => ({
      id: model.id,
      displayName: model.display_name ?? model.id,
    }));
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchMessagesRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      id?: string;
      model?: string;
      role?: 'assistant';
      type?: string;
      stop_reason?: string | null;
      content?: Array<{
        type?: string;
        text?: string;
        thinking?: string;
      }>;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };

    const textContent = (payload.content ?? [])
      .filter((entry) => entry.type === 'text')
      .map((entry) => entry.text ?? '')
      .join('');
    const reasoning = (payload.content ?? [])
      .filter((entry) => entry.type === 'thinking')
      .map((entry) => entry.thinking ?? '')
      .join('');
    const promptTokens = payload.usage?.input_tokens;
    const completionTokens = payload.usage?.output_tokens;

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: payload.model ?? request.model ?? 'unknown-model',
      message: {
        role: payload.role ?? 'assistant',
        content: textContent,
        reasoning: reasoning || undefined,
      },
      finishReason: payload.stop_reason ?? null,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens:
          typeof promptTokens === 'number' && typeof completionTokens === 'number'
            ? promptTokens + completionTokens
            : undefined,
      },
      providerMetadata: payload.id
        ? {
            id: payload.id,
            type: payload.type,
          }
        : undefined,
    };
  }

  async chatStream(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.dispatchMessagesRequest(request, context, true);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('Anthropic streaming response did not include a body.');
    }

    return this.transformStreamToGatewaySse(response.body);
  }

  private dispatchMessagesRequest(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ): Promise<Response> {
    const { system, messages } = this.buildAnthropicPayload(request);

    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          system,
          messages,
          max_tokens: 4096,
          stream,
        }),
      },
      stream ? null : this.requestTimeoutMs,
    );
  }

  private buildAnthropicPayload(request: GatewayChatRequest): {
    system: string | undefined;
    messages: AnthropicMessage[];
  } {
    const system = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join('\n\n');

    const messages = request.messages
      .filter(
        (message): message is typeof message & {
          role: 'user' | 'assistant';
        } => message.role !== 'system',
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    if (messages.length === 0) {
      throw new Error(
        'Anthropic requests require at least one user or assistant message.',
      );
    }

    return {
      system: system || undefined,
      messages,
    };
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

    if (providerAccess.apiKey && !headers['x-api-key']) {
      headers['x-api-key'] = providerAccess.apiKey;
    }

    if (!headers['anthropic-version']) {
      headers['anthropic-version'] = this.apiVersion;
    }

    return headers;
  }

  private transformStreamToGatewaySse(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';
    let currentEventName = 'message';
    let currentDataLines: string[] = [];

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = stream.getReader();

        const flushEvent = () => {
          if (!currentDataLines.length) {
            currentEventName = 'message';
            return;
          }

          const rawData = currentDataLines.join('\n');
          currentDataLines = [];

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(rawData) as Record<string, unknown>;
          } catch {
            currentEventName = 'message';
            return;
          }

          if (currentEventName === 'error') {
            const errorMessage =
              (payload.error as { message?: string } | undefined)?.message ??
              'Anthropic stream failed unexpectedly.';
            controller.error(new Error(errorMessage));
            return;
          }

          if (currentEventName === 'content_block_delta') {
            const delta = payload.delta as
              | { type?: string; text?: string; thinking?: string }
              | undefined;

            const reasoningDelta =
              delta?.type === 'thinking_delta' ? delta.thinking ?? '' : '';
            const contentDelta =
              delta?.type === 'text_delta' ? delta.text ?? '' : '';

            if (reasoningDelta || contentDelta) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        delta: {
                          reasoning: reasoningDelta || undefined,
                          content: contentDelta || undefined,
                        },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`,
                ),
              );
            }
          }

          if (currentEventName === 'message_delta') {
            const delta = payload.delta as
              | { stop_reason?: string | null }
              | undefined;

            if (delta?.stop_reason) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        delta: {},
                        finish_reason: delta.stop_reason,
                      },
                    ],
                  })}\n\n`,
                ),
              );
            }
          }

          if (currentEventName === 'message_stop') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }

          currentEventName = 'message';
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
              if (!line.trim()) {
                flushEvent();
                continue;
              }

              if (line.startsWith('event:')) {
                currentEventName = line.slice('event:'.length).trim();
                continue;
              }

              if (line.startsWith('data:')) {
                currentDataLines.push(line.slice('data:'.length).trim());
              }
            }
          }

          if (buffer.trim()) {
            const trailingLines = buffer.split(/\r?\n/);
            for (const line of trailingLines) {
              if (line.startsWith('event:')) {
                currentEventName = line.slice('event:'.length).trim();
              } else if (line.startsWith('data:')) {
                currentDataLines.push(line.slice('data:'.length).trim());
              }
            }
          }

          flushEvent();
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
        throw new Error(`Anthropic request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
