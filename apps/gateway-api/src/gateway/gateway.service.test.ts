import assert from 'node:assert/strict';
import test from 'node:test';
import { BadGatewayException } from '@nestjs/common';
import type {
  GatewayChatContentPart,
  GatewayChatRequest,
  GatewayChatResponse,
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
    const lastContent = request.messages.at(-1)?.content;
    const normalizedContent =
      typeof lastContent === 'string'
        ? lastContent
        : (lastContent ?? [])
            .map((part) =>
              part.type === 'text' ? part.text : `[image:${part.image_url.url}]`,
            )
            .join('\n');

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      message: {
        role: 'assistant',
        content: normalizedContent,
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

class FakeGatewayTelemetryService {
  async recordChatSuccess(): Promise<void> {}

  async recordChatFailure(): Promise<void> {}
}

class FakeGatewayAuditService {
  public startedEvents: Array<Record<string, unknown>> = [];

  logStarted(event: Record<string, unknown>): void {
    this.startedEvents.push(event);
  }

  logSucceeded(): void {}

  logFailed(): void {}

  fingerprint(emailHash: string): string {
    return emailHash;
  }

  summarizeMessages(messages: Array<{ content: string | GatewayChatContentPart[] }>) {
    return {
      messageCount: messages.length,
      messageCharacters: messages.reduce(
        (total, message) =>
          total +
          (typeof message.content === 'string'
            ? message.content.length
            : message.content.reduce(
                (innerTotal, part) =>
                  innerTotal + (part.type === 'text' ? part.text.length : 0),
                0,
              )),
        0,
      ),
    };
  }
}

function buildAuthContext(
  overrides: Partial<{
    userId: string;
    userUuid: string;
    emailHash: string;
    activeTenantId: string;
    activeTenantSlug: string;
    identitySource:
      | 'access-token'
      | 'openai-compatible-default-user'
      | 'openai-compatible-trusted-header';
    roles: string[];
    globalRoles: string[];
    defaultProviderId: 'nanogpt' | 'xai' | null;
    defaultModel: string | null;
    defaultImageProviderId: 'nanogpt' | 'xai' | null;
    defaultImageModel: string | null;
  }> = {},
) {
  return {
    userId: 'user-1',
    userUuid: 'user-public-1',
    emailHash: 'hash-1',
    activeTenantId: 'tenant-1',
    activeTenantSlug: 'lxp-internal',
    identitySource: 'access-token' as const,
    roles: ['user'],
    globalRoles: [],
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
    ...overrides,
  };
}

test('GatewayService routes chat requests through the provider registry', async () => {
  const auditService = new FakeGatewayAuditService();
  const service = new GatewayService(
    auditService as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.chat(
    {
      model: 'nano-1',
      messages: [{ role: 'user', content: 'hello' }],
    } as GatewayChatRequestDto,
    buildAuthContext({
      roles: ['admin'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'nano-default',
    }),
  );

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'nano-1');
  assert.equal(response.message.role, 'assistant');
  assert.equal(response.message.content, 'hello');
  assert.equal(response.message.reasoning, '1. Analyze the input.');
  assert.ok(response.requestId);
  assert.equal(auditService.startedEvents[0]?.providerId, 'nanogpt');
  assert.equal(auditService.startedEvents[0]?.model, 'nano-1');
  assert.equal(
    auditService.startedEvents[0]?.resolvedUserUuid,
    'user-public-1',
  );
  assert.equal(auditService.startedEvents[0]?.userFingerprint, 'hash-1');
  assert.equal(auditService.startedEvents[0]?.identitySource, 'access-token');
  assert.equal(auditService.startedEvents[0]?.stream, false);
});

test('GatewayService audit includes compatibility identity attribution', async () => {
  const auditService = new FakeGatewayAuditService();
  const service = new GatewayService(
    auditService as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await service.chat(
    {
      providerId: 'nanogpt',
      model: 'nano-1',
      messages: [{ role: 'user', content: 'hello' }],
    } as GatewayChatRequestDto,
    buildAuthContext({
      identitySource: 'openai-compatible-trusted-header' as const,
      userUuid: 'resolved-openwebui-user',
    }),
  );

  assert.equal(
    auditService.startedEvents[0]?.identitySource,
    'openai-compatible-trusted-header',
  );
  assert.equal(
    auditService.startedEvents[0]?.resolvedUserUuid,
    'resolved-openwebui-user',
  );
});

test('GatewayService summarizes multimodal chat messages by their text content only', async () => {
  const auditService = new FakeGatewayAuditService();
  const service = new GatewayService(
    auditService as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.chat(
    {
      providerId: 'nanogpt',
      model: 'nano-1',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            {
              type: 'image_url',
              image_url: { url: 'https://example.com/cat.png' },
            },
          ],
        },
      ],
    } as GatewayChatRequestDto,
    buildAuthContext(),
  );

  assert.equal(
    response.message.content,
    'Describe this image\n[image:https://example.com/cat.png]',
  );
  assert.equal(auditService.startedEvents[0]?.messageCharacters, 19);
});

test('GatewayService wraps provider failures in a BadGatewayException', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
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
        buildAuthContext(),
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
    new FakeGatewayTelemetryService() as never,
    new FailingListModelsRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.listModels(
        {
          providerId: 'xai',
        } as never,
        buildAuthContext({
          defaultProviderId: 'xai',
          defaultModel: 'grok-4',
        }),
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
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const streamResponse = await service.chatStream(
    {
      model: 'nano-1',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    } as GatewayChatRequestDto,
    buildAuthContext({
      roles: ['admin'],
      defaultProviderId: 'nanogpt',
      defaultModel: 'nano-default',
    }),
  );

  const reader = streamResponse.stream.getReader();
  const firstChunk = await reader.read();
  assert.ok(streamResponse.requestId);
  assert.match(new TextDecoder().decode(firstChunk.value), /reasoning/);
});

test('GatewayService rejects non-stream requests without messages', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
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
        buildAuthContext({
          roles: ['admin'],
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        }),
      ),
    /At least one message is required/,
  );
});

test('GatewayService rejects stream requests without messages', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
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
        buildAuthContext({
          roles: ['admin'],
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        }),
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
    new FakeGatewayTelemetryService() as never,
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
        buildAuthContext({
          roles: ['admin'],
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        }),
      ),
    /does not support streaming/,
  );
});

test('GatewayService uses authenticated defaults when provider and model are omitted', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  const response = await service.chat(
    {
      messages: [{ role: 'user', content: 'hello' }],
    } as GatewayChatRequestDto,
    buildAuthContext({
      defaultProviderId: 'nanogpt',
      defaultModel: 'z-ai/glm-4.6:thinking',
    }),
  );

  assert.equal(response.providerId, 'nanogpt');
  assert.equal(response.model, 'z-ai/glm-4.6:thinking');
});

test('GatewayService rejects missing provider when no default provider exists', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        buildAuthContext(),
      ),
    /no default provider is configured/i,
  );
});

test('GatewayService rejects missing model when no default model exists for the selected provider', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
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
        buildAuthContext(),
      ),
    /no default model is configured/i,
  );
});
