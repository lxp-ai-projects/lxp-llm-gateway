import assert from 'node:assert/strict';
import test from 'node:test';

import type { LlmProviderAdapter } from '@lxp/provider-sdk';

import { ProviderRegistryBootstrapService } from './provider-registry-bootstrap.service';

class FakeRepository<T extends { providerId: string }> {
  constructor(private readonly items: T[] = []) {}

  async find() {
    return [...this.items];
  }

  async save(input: Array<Partial<T>>) {
    for (const item of input) {
      this.items.push(item as T);
    }

    return input as T[];
  }
}

class FakeProviderRegistryService {
  constructor(private readonly providers: LlmProviderAdapter[]) {}

  listProviders() {
    return this.providers;
  }
}

function createProvider(providerId: LlmProviderAdapter['providerId']): LlmProviderAdapter {
  return {
    providerId,
    capabilities: {
      chat: true,
    },
    supportsStreaming() {
      return true;
    },
    async chat() {
      throw new Error('not used');
    },
  };
}

test('ProviderRegistryBootstrapService inserts missing provider rows for registered adapters', async () => {
  const repository = new FakeRepository([
    {
      providerId: 'openrouter',
      displayName: 'OpenRouter',
      status: 'active',
    },
  ]);
  const service = new ProviderRegistryBootstrapService(
    repository as never,
    new FakeProviderRegistryService([
      createProvider('openrouter'),
      createProvider('nanogpt'),
    ]) as never,
  );

  await service.onApplicationBootstrap();

  const providers = await repository.find();
  assert.equal(providers.length, 2);
  const nanoGpt = providers.find((provider) => provider.providerId === 'nanogpt');
  assert.ok(nanoGpt);
  assert.equal(nanoGpt?.displayName, 'NanoGPT');
  assert.equal(nanoGpt?.status, 'active');
});

test('ProviderRegistryBootstrapService leaves existing provider rows untouched', async () => {
  const repository = new FakeRepository([
    {
      providerId: 'nanogpt',
      displayName: 'NanoGPT Custom',
      status: 'disabled',
    },
  ]);
  const service = new ProviderRegistryBootstrapService(
    repository as never,
    new FakeProviderRegistryService([createProvider('nanogpt')]) as never,
  );

  await service.onApplicationBootstrap();

  const providers = await repository.find();
  assert.equal(providers.length, 1);
  assert.equal(providers[0]?.displayName, 'NanoGPT Custom');
  assert.equal(providers[0]?.status, 'disabled');
});
