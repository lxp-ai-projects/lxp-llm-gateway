import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class ProviderRegistryBootstrapService
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(ProviderRegistryBootstrapService.name);

  constructor(
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const registeredProviders = this.providerRegistry.listProviders();
    if (!registeredProviders.length) {
      return;
    }

    const existingProviders = await this.providerRepository.find();
    const existingByProviderId = new Map(
      existingProviders.map((provider) => [provider.providerId, provider]),
    );

    const missingProviders = registeredProviders.filter(
      (provider) => !existingByProviderId.has(provider.providerId),
    );
    if (!missingProviders.length) {
      return;
    }

    await this.providerRepository.save(
      missingProviders.map((provider) => ({
        providerId: provider.providerId,
        displayName: formatProviderDisplayName(provider.providerId),
        status: 'active' as const,
      })),
    );

    this.logger.log(
      `Registered ${missingProviders.length} missing provider row(s): ${missingProviders
        .map((provider) => provider.providerId)
        .join(', ')}`,
    );
  }
}

function formatProviderDisplayName(providerId: string): string {
  switch (providerId) {
    case 'nanogpt':
      return 'NanoGPT';
    case 'openrouter':
      return 'OpenRouter';
    case 'openai':
      return 'OpenAI';
    case 'xai':
      return 'xAI';
    case 'zai':
      return 'Z.ai';
    default:
      return providerId
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}
