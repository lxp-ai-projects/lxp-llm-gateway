import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import type { ProviderId } from '@lxp/domain';
import type { GatewayChatContentPart } from '@lxp/contracts';
import type { LlmProviderAdapter, ProviderExecutionContext } from '@lxp/provider-sdk';

import { OpenAiCompatibleService } from './openai-compatible.service';

class FakeProvider implements LlmProviderAdapter {
  constructor(
    readonly providerId: ProviderId,
    private readonly modelIds: string[],
  ) {}

  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: false,
    imageEditing: false,
  } as const;

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(_context: ProviderExecutionContext) {
    return this.modelIds.map((modelId) => ({
      id: modelId,
      displayName: modelId,
    }));
  }

  async chat(): Promise<never> {
    throw new Error('not used in this test');
  }
}

class FakeProviderRegistryService {
  listProviders(): LlmProviderAdapter[] {
    return [
      new FakeProvider('nanogpt', ['z-ai/glm-4.6:thinking']),
      new FakeProvider('openrouter', ['meta-llama/llama-3.3-70b-instruct']),
    ];
  }
}

class FakeProviderCredentialService {
  async resolveProviderAccess(_emailHash: string, providerId: ProviderId) {
    if (providerId === 'openrouter') {
      throw new Error('missing credential');
    }

    return {
      apiKey: 'secret',
    };
  }
}

class FakeGatewayService {
  async chat(request: {
    providerId?: ProviderId;
    model?: string;
    maxOutputTokens?: number;
    messages: Array<{
      role: string;
      content: string | GatewayChatContentPart[];
    }>;
  }) {
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
      requestId: 'req-1',
      providerId: request.providerId ?? 'nanogpt',
      model: request.model ?? 'unknown-model',
      message: {
        role: 'assistant' as const,
        content: `Echo: ${normalizedContent}`,
      },
      finishReason: 'stop',
      usage: {
        promptTokens: 12,
        completionTokens: 6,
        totalTokens: 18,
      },
    };
  }

  async chatStream() {
    return {
      requestId: 'req-stream-1',
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
            ),
          );
          controller.close();
        },
      }),
    };
  }
}

class FakeIntegrationClientScopeService {
  assertScope(
    authContext: ReturnType<typeof buildAuthContext>,
    requiredScope: string,
  ): void {
    if (!authContext.integrationClientId) {
      return;
    }

    const grantedScopes = authContext.integrationClientScopes ?? [];
    if (grantedScopes.includes(requiredScope)) {
      return;
    }

    throw new ForbiddenException(
      `Integration client "${authContext.integrationClientId}" is missing the required scope "${requiredScope}".`,
    );
  }
}

class FakeTenantModelAccessRuleService {
  async filterTextModels(
    tenantId: string,
    _providerId: ProviderId,
    models: Array<{
      id: string;
      displayName: string;
      capabilities?: unknown;
    }>,
  ) {
    if (tenantId === 'tenant-restricted') {
      return models.filter((model) => !model.id.includes('llama-3.3'));
    }

    return models;
  }
}

function buildAuthContext() {
  return {
    userId: 'user-1',
    userUuid: 'uuid-1',
    emailHash: 'hash-1',
    activeTenantId: 'tenant-1',
    activeTenantSlug: 'lxp-internal',
    identitySource: 'access-token' as const,
    roles: ['user'],
    globalRoles: [],
    integrationClientId: undefined,
    integrationClientScopes: undefined,
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
  };
}

test('OpenAiCompatibleService lists only models reachable for the authenticated user', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  const response = await service.listModels(buildAuthContext());

  assert.deepEqual(response, {
    object: 'list',
    data: [
      {
        id: 'nanogpt/z-ai/glm-4.6:thinking',
        object: 'model',
        created: response.data[0]?.created,
        owned_by: 'nanogpt',
      },
    ],
  });
});

test('OpenAiCompatibleService maps chat completions to the OpenAI response shape', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  const response = await service.createChatCompletion(
    {
      model: 'nanogpt/z-ai/glm-4.6:thinking',
      messages: [{ role: 'user', content: 'hello' }],
    },
    buildAuthContext(),
  );

  assert.equal(response.id, 'req-1');
  assert.equal(response.object, 'chat.completion');
  assert.equal(response.model, 'nanogpt/z-ai/glm-4.6:thinking');
  assert.equal(response.choices[0]?.message.content, 'Echo: hello');
  assert.equal(response.usage?.total_tokens, 18);
});

test('OpenAiCompatibleService forwards max completion tokens to the gateway chat contract', async () => {
  let capturedRequest:
    | {
        maxOutputTokens?: number;
      }
    | undefined;

  class CapturingGatewayService extends FakeGatewayService {
    override async chat(request: {
      providerId?: ProviderId;
      model?: string;
      maxOutputTokens?: number;
      messages: Array<{
        role: string;
        content: string | GatewayChatContentPart[];
      }>;
    }) {
      capturedRequest = request;
      return super.chat(request);
    }
  }

  const service = new OpenAiCompatibleService(
    new CapturingGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  await service.createChatCompletion(
    {
      model: 'nanogpt/z-ai/glm-4.6:thinking',
      max_completion_tokens: 321,
      messages: [{ role: 'user', content: 'hello' }],
    },
    buildAuthContext(),
  );

  assert.equal(capturedRequest?.maxOutputTokens, 321);
});

test('OpenAiCompatibleService rejects unsupported non-text message content payloads', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  await assert.rejects(
    () =>
      service.createChatCompletion(
        {
          model: 'nanogpt/z-ai/glm-4.6:thinking',
          messages: [{ role: 'user', content: { type: 'input_text', text: 'hi' } }],
        } as never,
        buildAuthContext(),
      ),
    /text-only chat message content/i,
  );
});

test('OpenAiCompatibleService preserves text-only content blocks for the gateway seam', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  const response = await service.createChatCompletion(
    {
      model: 'nanogpt/z-ai/glm-4.6:thinking',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'from blocks' },
          ],
        },
      ],
    } as never,
    buildAuthContext(),
  );

  assert.equal(response.choices[0]?.message.content, 'Echo: Hello\nfrom blocks');
});

test('OpenAiCompatibleService preserves multimodal image attachments for the gateway seam', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  const response = await service.createChatCompletion(
    {
      model: 'nanogpt/z-ai/glm-4.6:thinking',
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
    } as never,
    buildAuthContext(),
  );

  assert.equal(
    response.choices[0]?.message.content,
    'Echo: Describe this image\n[image:https://example.com/cat.png]',
  );
});

test('OpenAiCompatibleService rejects model listing for an integration client without models:list scope', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  await assert.rejects(
    () =>
      service.listModels({
        ...buildAuthContext(),
        integrationClientId: 'open-webui-demo',
        integrationClientScopes: ['chat:completion'],
      }),
    /missing the required scope "models:list"/i,
  );
});

test('OpenAiCompatibleService filters denied models for the active tenant', async () => {
  const service = new OpenAiCompatibleService(
    new FakeGatewayService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
  );

  const response = await service.listModels({
    ...buildAuthContext(),
    activeTenantId: 'tenant-restricted',
  });

  assert.deepEqual(response.data.map((entry) => entry.id), [
    'nanogpt/z-ai/glm-4.6:thinking',
  ]);
});
