import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
} from '@lxp/provider-sdk';

export class NanoGptProviderAdapter implements LlmProviderAdapter {
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.NANOGPT_BASE_URL ?? 'https://nano-gpt.com/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  readonly providerId = 'nanogpt' as const;

  supportsStreaming(): boolean {
    return true;
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${context.providerCredential.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        user: context.userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NanoGPT request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const outputText = payload.choices?.[0]?.message?.content ?? '';

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model,
      outputText,
    };
  }
}
