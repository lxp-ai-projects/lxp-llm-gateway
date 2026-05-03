import assert from 'node:assert/strict';
import test from 'node:test';
import { BadGatewayException, ForbiddenException } from '@nestjs/common';
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
import { ModelAccessLimitException } from './tenant-model-access-rule.service';
import { TenantPolicyLimitException } from './tenant-policy.service';

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

  async countTextTokens(): Promise<{ inputTokens: number }> {
    return {
      inputTokens: 12,
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

  async resolveProviderAccessWithSource(): Promise<{
    providerAccess: { apiKey: string };
    credentialScopeUsed: 'user';
  }> {
    return {
      providerAccess: {
        apiKey: 'nano-secret-token',
      },
      credentialScopeUsed: 'user',
    };
  }
}

class FakeTenantProviderConfigurationService {
  async assertProviderEnabled(
    tenantId: string,
    providerId: 'nanogpt' | 'xai' | 'anthropic',
  ) {
    if (tenantId === 'tenant-disabled') {
      throw new Error(`Provider ${providerId} is disabled for tenant ${tenantId}.`);
    }

    return {
      tenantId,
      providerId,
      providerDisplayName: providerId,
      providerStatus: 'active' as const,
      enabled: true,
      defaultTextModel:
        providerId === 'nanogpt' ? 'tenant-default-text-model' : null,
      defaultImageModel: null,
      credentialMode: 'hybrid' as const,
      preferUserCredentials: true,
      allowPlatformFallback: false,
      allowTenantFallback: true,
    };
  }

  resolveTextModel(
    requestedModel: string | undefined,
    providerId: 'nanogpt' | 'xai' | 'anthropic',
    authContext: ReturnType<typeof buildAuthContext>,
    configuration: { defaultTextModel: string | null },
  ) {
    if (requestedModel) {
      return requestedModel;
    }

    if (
      authContext.defaultProviderId === providerId &&
      authContext.defaultModel
    ) {
      return authContext.defaultModel;
    }

    if (configuration.defaultTextModel) {
      return configuration.defaultTextModel;
    }

    throw new Error('No default text model is configured.');
  }
}

class FakeGatewayTelemetryService {
  async reserveChatUsageEvent(): Promise<void> {}

  async recordChatSuccess(): Promise<void> {}

  async recordChatFailure(): Promise<void> {}

  async recordBlockedByQuota(): Promise<void> {}

  async recordBlockedByPolicy(): Promise<void> {}
}

class FakeTenantRlsService {
  async withTenantLockContext<T>(
    _tenantId: string,
    callback: (manager: {
      getRepository: (entity: unknown) => unknown;
    }) => Promise<T>,
  ): Promise<T> {
    return callback({
      getRepository: () => ({}),
    });
  }
}

class FakeTenantModelAccessRuleService {
  async assertTextModelAllowed(
    tenantId: string,
    providerId: 'nanogpt' | 'xai' | 'anthropic',
    model: string,
  ): Promise<{
    effect: 'allow' | 'deny';
    maxInputTokens: number | null;
    maxOutputTokens: number | null;
    maxImagesPerRequest: number | null;
    maxResolution: string | null;
  } | null> {
    if (
      tenantId === 'tenant-restricted' &&
      providerId === 'xai' &&
      model === 'grok-4'
    ) {
      throw new ForbiddenException(
        `Model ${providerId}/${model} is denied for tenant ${tenantId}.`,
      );
    }

    if (
      tenantId === 'tenant-input-limited' &&
      providerId === 'nanogpt' &&
      model === 'nano-1'
    ) {
      return {
        effect: 'allow',
        maxInputTokens: 10,
        maxOutputTokens: null,
        maxImagesPerRequest: null,
        maxResolution: null,
      };
    }

    return null;
  }

  async filterTextModels<
    T extends Array<{ id: string; displayName: string; capabilities?: unknown }>,
  >(_tenantId: string, _providerId: string, models: T): Promise<T> {
    return models;
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

class FakeTenantPolicyService {
  async assertTextRequestAllowed(params: {
    tenantId: string;
    providerId: string;
    model: string;
  }): Promise<{ maxInputTokens: number | null } | void> {
    if (
      params.tenantId === 'tenant-quota-blocked' &&
      params.providerId === 'nanogpt'
    ) {
      throw new TenantPolicyLimitException(
        'tenant_requests_per_minute_exceeded',
        `Tenant ${params.tenantId} exceeded the requests-per-minute limit.`,
      );
    }
  }
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
    integrationClientId: string | undefined;
    integrationClientScopes: string[] | undefined;
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
    integrationClientId: undefined,
    integrationClientScopes: undefined,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
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
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'xai',
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        buildAuthContext(),
      ),
    /no default text model is configured/i,
  );
});

test('GatewayService falls back to the tenant default text model when the user has no default model', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
  );

  const response = await service.chat(
    {
      providerId: 'nanogpt',
      messages: [{ role: 'user', content: 'hello' }],
    } as GatewayChatRequestDto,
    buildAuthContext({
      defaultProviderId: null,
      defaultModel: null,
    }),
  );

  assert.equal(response.model, 'tenant-default-text-model');
});

test('GatewayService rejects chat for an integration client without chat:completion scope', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'nanogpt',
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        buildAuthContext({
          integrationClientId: 'open-webui-demo',
          integrationClientScopes: ['models:list'],
        }),
      ),
    /missing the required scope "chat:completion"/i,
  );
});

test('GatewayService rejects a text model denied by tenant model access rules', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'xai',
          model: 'grok-4',
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        buildAuthContext({
          activeTenantId: 'tenant-restricted',
          defaultProviderId: 'xai',
          defaultModel: 'grok-4',
        }),
      ),
    /is denied for tenant tenant-restricted/i,
  );
});

test('GatewayService rejects chat when tenant quota policy blocks the request', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
    new FakeTenantPolicyService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'nanogpt',
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        buildAuthContext({
          activeTenantId: 'tenant-quota-blocked',
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-default',
        }),
      ),
    /requests-per-minute limit/i,
  );
});

test('GatewayService rejects chat when counted input tokens exceed the tenant model limit', async () => {
  const service = new GatewayService(
    new FakeGatewayAuditService() as unknown as GatewayAuditService,
    new FakeGatewayTelemetryService() as never,
    new FakeProviderRegistryService() as never,
    new FakeProviderCredentialService() as never,
    new FakeIntegrationClientScopeService() as never,
    new FakeTenantModelAccessRuleService() as never,
    new FakeTenantProviderConfigurationService() as never,
    new FakeTenantRlsService() as never,
    new FakeTenantPolicyService() as never,
  );

  await assert.rejects(
    () =>
      service.chat(
        {
          providerId: 'nanogpt',
          model: 'nano-1',
          messages: [{ role: 'user', content: 'hello' }],
        } as GatewayChatRequestDto,
        buildAuthContext({
          activeTenantId: 'tenant-input-limited',
          defaultProviderId: 'nanogpt',
          defaultModel: 'nano-1',
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof ModelAccessLimitException);
      assert.match(String(error), /cannot exceed 10 input token/);
      return true;
    },
  );
});
