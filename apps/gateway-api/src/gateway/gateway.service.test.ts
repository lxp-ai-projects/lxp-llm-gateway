import assert from 'node:assert/strict';
import test from 'node:test';
import { BadGatewayException } from '@nestjs/common';
import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
} from '@lxp/provider-sdk';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayAuditService } from './gateway-audit.service';
import { GatewayService } from './gateway.service';

class FakeProvider implements LlmProviderAdapter {
  readonly providerId = 'nanogpt' as const;
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
  } as const;

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

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      images: [
        {
          url: 'https://example.com/generated.jpg',
          revisedPrompt: request.prompt,
        },
      ],
    };
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      images: [
        {
          b64Json: 'edited-image',
          revisedPrompt: `${request.prompt} (${request.images.length})`,
        },
      ],
    };
  }
}

class FakeProviderRegistryService {
  getProvider(): LlmProviderAdapter {
    return new FakeProvider();
  }
}

class FailingListModelsProvider extends FakeProvider {
  async listModels(): Promise<never> {
    throw new Error('xAI model listing failed with status 500: Internal server error');
  }
}

class FailingListModelsRegistryService {
  getProvider(): LlmProviderAdapter {
    return new FailingListModelsProvider();
  }
}

class FailingProvider extends FakeProvider {
  override async chat(): Promise<GatewayChatResponse> {
    throw new Error(
      'Anthropic request failed with status 400: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits. (request_id: req_123)',
    );
  }

  override async chatStream(): Promise<ReadableStream<Uint8Array>> {
    throw new Error(
      'Anthropic streaming request failed with status 400: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits. (request_id: req_123)',
    );
  }
}

class FailingProviderRegistryService {
  getProvider(): LlmProviderAdapter {
    return new FailingProvider();
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

test('GatewayService wraps provider failures in a BadGatewayException', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FailingProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'anthropic',
          model: 'claude-haiku-4-5-20251001',
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
    (error: unknown) => {
      assert.ok(error instanceof BadGatewayException);
      assert.match(
        String(error),
        /Anthropic request failed with status 400: Your credit balance is too low/,
      );
      return true;
    },
  );
});

test('GatewayService wraps listModels provider failures in a BadGatewayException', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FailingListModelsRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.listModels(
        {
          providerId: 'xai',
        } as never,
        {
          userId: 'user-1',
          userUuid: 'user-public-1',
          emailHash: 'hash-1',
          roles: ['user'],
          defaultProviderId: 'xai',
          defaultModel: 'grok-4',
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadGatewayException);
      assert.match(
        String(error),
        /xAI model listing failed with status 500: Internal server error/,
      );
      return true;
    },
  );
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

test('GatewayService routes image generation requests through the provider registry', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.generateImage(
    {
      prompt: 'A moonlit forest in watercolor',
      model: 'grok-imagine-image',
      responseFormat: 'url',
    } as never,
    {
      userId: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      roles: ['user'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'fallback-model',
    },
  );

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'grok-imagine-image');
  assert.equal(response.images[0]?.url, 'https://example.com/generated.jpg');
});

test('GatewayService routes image edit requests with references through the provider registry', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.editImage(
    {
      prompt: 'Make this cinematic',
      model: 'grok-imagine-image',
      images: [
        {
          type: 'image_url',
          url: 'https://example.com/ref.png',
        },
      ],
      responseFormat: 'b64_json',
    } as never,
    {
      userId: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      roles: ['user'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'fallback-model',
    },
  );

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.images[0]?.b64Json, 'edited-image');
  assert.match(response.images[0]?.revisedPrompt ?? '', /\(1\)/);
});
