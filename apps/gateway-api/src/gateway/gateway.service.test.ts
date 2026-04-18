import assert from 'node:assert/strict';
import test from 'node:test';
import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
} from '@lxp/provider-sdk';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayAuditService } from './gateway-audit.service';
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
      model: request.model ?? 'unknown-model',
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
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"hi"}}]}\n\n',
          ),
        );
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
  async resolveProviderAccess(): Promise<{ apiKey: string }> {
    return {
      apiKey: 'nano-secret-token',
    };
  }
}

class FakeGatewayAuditService {
  logStarted(): void {}

  logSucceeded(): void {}

  logFailed(): void {}

  fingerprint(emailHash: string): string {
    return emailHash;
  }

  summarizeMessages(messages: Array<{ content: string }>) {
    return {
      messageCount: messages.length,
      messageCharacters: messages.reduce(
        (total, message) => total + message.content.length,
        0,
      ),
    };
  }
}

test('GatewayService routes chat requests through the provider registry', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.chat(
    {
      model: 'nano-1',
      messages: [{ role: 'user', content: 'hello' }],
    } as GatewayChatRequestDto,
    {
      userId: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      roles: ['admin'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'nano-default',
    },
  );

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'nano-1');
  assert.equal(response.message.role, 'assistant');
  assert.equal(response.message.content, 'hello');
  assert.equal(response.message.reasoning, '1. Analyze the input.');
  assert.ok(response.requestId);
});

test('GatewayService returns a provider stream when streaming is requested', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
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
      roles: ['admin'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'nano-default',
    },
  );

  const reader = streamResponse.stream.getReader();
  const firstChunk = await reader.read();
  assert.ok(streamResponse.requestId);
  assert.match(new TextDecoder().decode(firstChunk.value), /reasoning/);
});

test('GatewayService rejects non-stream requests without messages', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          model: 'nano-1',
          messages: [],
        } as GatewayChatRequestDto,
        {
          userId: 'user-1',
          userUuid: 'user-public-1',
          emailHash: 'hash-1',
          roles: ['admin'],
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        },
      ),
    /At least one message is required/,
  );
});

test('GatewayService rejects stream requests without messages', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chatStream(
        {
          model: 'nano-1',
          messages: [],
          stream: true,
        } as GatewayChatRequestDto,
        {
          userId: 'user-1',
          userUuid: 'user-public-1',
          emailHash: 'hash-1',
          roles: ['admin'],
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        },
      ),
    /At least one message is required/,
  );
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
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
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
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        },
      ),
    /does not support streaming/,
  );
});

test('GatewayService uses authenticated defaults when provider and model are omitted', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.chat(
    {
      messages: [{ role: 'user', content: 'hello' }],
    } as GatewayChatRequestDto,
    {
      userId: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      roles: ['user'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'z-ai/glm-4.6:thinking',
    },
  );

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'z-ai/glm-4.6:thinking');
});

test('GatewayService rejects missing provider when no default provider exists', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        {
          userId: 'user-1',
          userUuid: 'user-public-1',
          emailHash: 'hash-1',
          roles: ['user'],
          defaultProviderId: null,
          defaultModel: null,
        },
      ),
    /no default provider is configured/i,
  );
});

test('GatewayService rejects missing model when no default model exists for the selected provider', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'nanogpt',
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        {
          userId: 'user-1',
          userUuid: 'user-public-1',
          emailHash: 'hash-1',
          roles: ['user'],
          defaultProviderId: null,
          defaultModel: null,
        },
      ),
    /no default model is configured/i,
  );
});
