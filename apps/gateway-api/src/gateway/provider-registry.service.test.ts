import assert from 'node:assert/strict';
import test from 'node:test';
import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { ProviderRegistryService } from './provider-registry.service';

class FakeProvider implements LlmProviderAdapter {
  constructor(readonly providerId: 'nanogpt' | 'openrouter' | 'ollama') {}

  supportsStreaming(): boolean {
    return true;
  }

  async chat(
    _request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: 'test-model',
      message: {
        role: 'assistant',
        content: 'ok',
      },
    };
  }
}

test('ProviderRegistryService resolves an explicitly requested provider', () => {
  const service = new ProviderRegistryService([
    new FakeProvider('nanogpt'),
    new FakeProvider('openrouter'),
    new FakeProvider('ollama'),
  ]);

  const provider = service.getProvider('openrouter');
  assert.equal(provider.providerId, 'openrouter');
});

test('ProviderRegistryService uses the first registered provider as implicit default', () => {
  const service = new ProviderRegistryService([
    new FakeProvider('nanogpt'),
    new FakeProvider('openrouter'),
  ]);

  const provider = service.getProvider();
  assert.equal(provider.providerId, 'nanogpt');
});

test('ProviderRegistryService rejects unknown providers instead of silently falling back', async () => {
  const service = new ProviderRegistryService([new FakeProvider('nanogpt')]);

  await assert.rejects(
    async () => service.getProvider('ollama'),
    /Provider ollama is not registered in gateway-api/,
  );
});
