import assert from 'node:assert/strict';
import test from 'node:test';
import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type { LlmProviderAdapter, ProviderExecutionContext } from '@lxp/provider-sdk';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';

class FakeProvider implements LlmProviderAdapter {
  readonly providerId = 'nanogpt' as const;

  supportsStreaming(): boolean {
    return false;
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model,
      outputText: request.messages.at(-1)?.content ?? '',
    };
  }
}

class FakeProviderRegistryService {
  getProvider(): LlmProviderAdapter {
    return new FakeProvider();
  }
}

class FakeProviderCredentialService {
  async resolveApiKey(): Promise<string> {
    return 'nano-secret-token';
  }
}

test('GatewayService routes chat requests through the provider registry', async () => {
  const service = new GatewayService(
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.chat({
    model: 'nano-1',
    messages: [{ role: 'user', content: 'hello' }],
  } as GatewayChatRequestDto, 'user-1');

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'nano-1');
  assert.equal(response.outputText, 'hello');
  assert.ok(response.requestId);
});

test('GatewayService rejects streaming until Phase 1 supports it', async () => {
  const service = new GatewayService(
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chat({
        model: 'nano-1',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      } as GatewayChatRequestDto, 'user-1'),
    /Streaming is not implemented in Phase 1/,
  );
});
