import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
} from '@lxp/provider-sdk';

export class NanoGptProviderAdapter implements LlmProviderAdapter {
  readonly providerId = 'nanogpt' as const;

  supportsStreaming(): boolean {
    return true;
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    void context;
    const lastMessage = request.messages.at(-1)?.content ?? '';

    return {
      providerId: this.providerId,
      model: request.model,
      outputText: `nanogpt placeholder response: ${lastMessage}`,
    };
  }
}
