import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId } from '@lxp/domain';
import { Repository } from 'typeorm';

import type { GatewayAuthContext } from '../auth/auth.types';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import {
  TenantProviderConfigurationEntity,
  type TenantProviderCredentialMode,
} from '../persistence/entities/tenant-provider-configuration.entity';

export type ResolvedTenantProviderConfiguration = {
  tenantId: string;
  providerId: ProviderId;
  providerDisplayName: string;
  providerStatus: 'active' | 'disabled';
  enabled: boolean;
  defaultTextModel: string | null;
  defaultImageModel: string | null;
  credentialMode: TenantProviderCredentialMode;
  preferUserCredentials: boolean;
  allowPlatformFallback: boolean;
  allowTenantFallback: boolean;
};

@Injectable()
export class TenantProviderConfigurationService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(TenantProviderConfigurationEntity)
    private readonly tenantProviderConfigurationRepository: Repository<TenantProviderConfigurationEntity>,
  ) {}

  async resolveConfiguration(
    tenantId: string,
    providerId: ProviderId,
  ): Promise<ResolvedTenantProviderConfiguration> {
    const tenant = await this.tenantRepository.findOne({
      where: {
        id: tenantId,
        status: 'active',
      },
    });
    if (!tenant) {
      throw new NotFoundException(
        'Unable to resolve the provider configuration for the authenticated request.',
      );
    }

    const provider = await this.providerRepository.findOne({
      where: {
        providerId,
      },
    });
    if (!provider) {
      throw new NotFoundException(
        'Unable to resolve the provider configuration for the authenticated request.',
      );
    }

    const configuration =
      await this.tenantProviderConfigurationRepository.findOne({
        where: {
          tenantId: tenant.id,
          providerId: provider.id,
        },
      });

    return {
      tenantId: tenant.id,
      providerId: provider.providerId,
      providerDisplayName: provider.displayName,
      providerStatus: provider.status,
      enabled: configuration?.enabled ?? provider.status === 'active',
      defaultTextModel: configuration?.defaultTextModel ?? null,
      defaultImageModel: configuration?.defaultImageModel ?? null,
      credentialMode:
        configuration?.credentialMode ??
        (tenant.allowUserCredentialOverride ? 'hybrid' : 'tenant_byok'),
      preferUserCredentials:
        configuration?.preferUserCredentials ??
        tenant.allowUserCredentialOverride,
      allowPlatformFallback: configuration?.allowPlatformFallback ?? false,
      allowTenantFallback: configuration?.allowTenantFallback ?? true,
    };
  }

  async assertProviderEnabled(
    tenantId: string,
    providerId: ProviderId,
  ): Promise<ResolvedTenantProviderConfiguration> {
    const configuration = await this.resolveConfiguration(tenantId, providerId);
    if (configuration.providerStatus !== 'active' || !configuration.enabled) {
      throw new BadRequestException(
        `Provider ${providerId} is disabled for tenant ${tenantId}.`,
      );
    }

    return configuration;
  }

  resolveTextModel(
    requestedModel: string | undefined,
    providerId: ProviderId,
    authContext: GatewayAuthContext,
    configuration: ResolvedTenantProviderConfiguration,
  ): string {
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

    throw new BadRequestException(
      'No model was supplied and no default text model is configured for the selected provider.',
    );
  }

  resolveImageModel(
    requestedModel: string | undefined,
    providerId: ProviderId,
    authContext: GatewayAuthContext,
    configuration: ResolvedTenantProviderConfiguration,
  ): string {
    if (requestedModel) {
      return requestedModel;
    }

    if (
      authContext.defaultImageProviderId === providerId &&
      authContext.defaultImageModel
    ) {
      return authContext.defaultImageModel;
    }

    if (configuration.defaultImageModel) {
      return configuration.defaultImageModel;
    }

    throw new BadRequestException(
      'No model was supplied and no default image model is configured for the selected provider.',
    );
  }
}
