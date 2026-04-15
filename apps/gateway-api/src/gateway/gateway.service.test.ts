import assert from 'node:assert/strict';
import test from 'node:test';
import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type { LlmProviderAdapter, ProviderExecutionContext } from '@lxp/provider-sdk';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';

class FakeProvider implements LlmProviderAdapter {
  readonly providerId = 'nanogpt' as const;

  supportsStreaming(): boolean {
    return true;
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model,
      message: {
        role: 'assistant',
        content: request.messages.at(-1)?.content ?? '',
        reasoning: '1. Analyze the input.',
      },
      finishReason: 'stop',
    };
  }

  async chatStream(): Promise<ReadableStream<Uint8Array>> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"reasoning":"hi"}}]}\n\n'));
        controller.close();
      },
    });
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
  } as GatewayChatRequestDto, {
    userId: 'user-1',
    userUuid: 'user-public-1',
    emailHash: 'hash-1',
    roles: ['admin'],
  });

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'nano-1');
  assert.equal(response.message.role, 'assistant');
  assert.equal(response.message.content, 'hello');
  assert.equal(response.message.reasoning, '1. Analyze the input.');
  assert.ok(response.requestId);
});

test('GatewayService returns a provider stream when streaming is requested', async () => {
  const service = new GatewayService(
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const streamResponse = await service.chatStream(
    {
      model: 'nano-1',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    } as GatewayChatRequestDto,
    {
        userId: 'user-1',
        userUuid: 'user-public-1',
        emailHash: 'hash-1',
        roles: ['admin']
      },
  );

  const reader = streamResponse.stream.getReader();
  const firstChunk = await reader.read();
  assert.ok(streamResponse.requestId);
  assert.match(new TextDecoder().decode(firstChunk.value), /reasoning/);
});

test('GatewayService rejects streaming when a provider does not support it', async () => {
  class NonStreamingProvider extends FakeProvider {
    override supportsStreaming(): boolean {
      return false;
    }
  }

  class NonStreamingRegistryService {
    getProvider(): LlmProviderAdapter {
      return new NonStreamingProvider();
    }
  }

  const service = new GatewayService(
    new NonStreamingRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chatStream(
        {
          model: 'nano-1',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
        } as GatewayChatRequestDto,
        {
          userId: 'user-1',
          userUuid: 'user-public-1',
          emailHash: 'hash-1',
          roles: ['admin'],
        },
      ),
    /does not support streaming/,
  );
});
