import { Inject, Injectable } from '@nestjs/common';
import type { ProviderId } from '@lxp/domain';
import type { LlmProviderAdapter } from '@lxp/provider-sdk';

import { LLM_PROVIDERS } from './provider.tokens';

@Injectable()
export class ProviderRegistryService {
  private readonly providers: Map<ProviderId, LlmProviderAdapter>;

  constructor(
    @Inject(LLM_PROVIDERS)
    providerAdapters: LlmProviderAdapter[],
  ) {
    this.providers = new Map(
      providerAdapters.map((provider) => [provider.providerId, provider]),
    );
  }

  getProvider(providerId?: ProviderId): LlmProviderAdapter {
    if (providerId) {
      const provider = this.providers.get(providerId);
      if (provider) {
        return provider;
      }
    }

    const defaultProvider = this.providers.values().next().value;
    if (!defaultProvider) {
      throw new Error('No LLM providers are registered.');
    }

    return defaultProvider;
  }
}
