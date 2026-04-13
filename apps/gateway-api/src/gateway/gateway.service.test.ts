import assert from 'node:assert/strict';
import test from 'node:test';
import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type { LlmProviderAdapter, ProviderExecutionContext } from '@lxp/provider-sdk';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';
import { ProviderRegistryService } from './provider-registry.service';

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

test('GatewayService routes chat requests through the provider registry', async () => {
  const registry = new ProviderRegistryService([new FakeProvider()]);
  const service = new GatewayService(registry);

  const response = await service.chat({
    model: 'nano-1',
    messages: [{ role: 'user', content: 'hello' }],
  } as GatewayChatRequestDto);

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'nano-1');
  assert.equal(response.outputText, 'hello');
  assert.ok(response.requestId);
});

test('GatewayService rejects streaming until Phase 1 supports it', async () => {
  const registry = new ProviderRegistryService([new FakeProvider()]);
  const service = new GatewayService(registry);

  await assert.rejects(
    () =>
      service.chat({
        model: 'nano-1',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      } as GatewayChatRequestDto),
    /Streaming is not implemented in Phase 1/,
  );
});
