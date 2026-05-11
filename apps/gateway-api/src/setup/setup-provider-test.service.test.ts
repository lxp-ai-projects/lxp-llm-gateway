import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProviderId } from '@lxp/domain';
import type {
  GatewayChatRequest,
  GatewayChatResponse,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';

import { SetupProviderTestService } from './setup-provider-test.service';

class FakeProvider implements LlmProviderAdapter {
  constructor(readonly providerId: ProviderId) {}

  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: false,
    imageEditing: false,
  } as const;

  supportsStreaming(): boolean {
    return false;
  }

  async listModels(context: ProviderExecutionContext): Promise<ProviderModel[]> {
    assert.equal(context.providerAccess.apiKey, 'test-key');
    return [
      {
        id: 'model-1',
        displayName: 'Model 1',
      },
    ];
  }

  async chat(
    _request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: 'unused',
      message: {
        role: 'assistant',
        content: 'unused',
      },
    };
  }
}

class FailingProvider extends FakeProvider {
  override async listModels(): Promise<ProviderModel[]> {
    throw new Error(
      'Provider request failed with status 401: Bearer secret-token is invalid.',
    );
  }
}

class FakeProviderRegistryService {
  constructor(private readonly provider: LlmProviderAdapter) {}

  getProvider() {
    return this.provider;
  }
}

test('SetupProviderTestService returns success with the first listed model', async () => {
  const service = new SetupProviderTestService(
    new FakeProviderRegistryService(
      new FakeProvider('nanogpt'),
    ) as never,
  );

  const result = await service.testProvider({
    providerId: 'nanogpt',
    apiKey: 'test-key',
  });

  assert.deepEqual(result, {
    success: true,
    providerId: 'nanogpt',
    modelTested: 'model-1',
  });
});

test('SetupProviderTestService sanitizes provider failures', async () => {
  const service = new SetupProviderTestService(
    new FakeProviderRegistryService(
      new FailingProvider('nanogpt'),
    ) as never,
  );

  const result = await service.testProvider({
    providerId: 'nanogpt',
    apiKey: 'test-key',
  });

  assert.equal(result.success, false);
  assert.equal(result.providerId, 'nanogpt');
  assert.equal(result.modelTested, null);
  assert.equal(result.errorCode, 'provider_test_failed');
  assert.match(String(result.errorMessage), /Bearer \[redacted\]/);
});
