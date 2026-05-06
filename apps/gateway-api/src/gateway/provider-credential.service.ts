import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId } from '@lxp/domain';
import type { ProviderAccessConfig } from '@lxp/provider-sdk';
import { IsNull, Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';
import type { GatewayAuthContext } from '../auth/auth.types';
import {
  type ResolvedTenantProviderConfiguration,
  TenantProviderConfigurationService,
} from './tenant-provider-configuration.service';

export type ResolvedProviderAccess = {
  providerAccess: ProviderAccessConfig;
  credentialScopeUsed: 'platform' | 'tenant' | 'user';
};

@Injectable()
export class ProviderCredentialService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(UserProviderCredentialEntity)
    private readonly credentialRepository: Repository<UserProviderCredentialEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly tenantRlsService: TenantRlsService,
    private readonly tenantProviderConfigurationService: TenantProviderConfigurationService,
  ) {}

  async resolveProviderAccess(
    authContext: Pick<
      GatewayAuthContext,
      'activeTenantId' | 'emailHash' | 'userId'
    >,
    providerId: ProviderId,
  ): Promise<ProviderAccessConfig> {
    const resolved = await this.resolveProviderAccessWithSource(
      authContext,
      providerId,
    );
    return resolved.providerAccess;
  }

  async resolveProviderAccessWithSource(
    authContext: Pick<
      GatewayAuthContext,
      'activeTenantId' | 'emailHash' | 'userId'
    >,
    providerId: ProviderId,
  ): Promise<ResolvedProviderAccess> {
    if (!authContext.emailHash) {
      throw new BadRequestException('Missing authenticated user email hash.');
    }

    const user = await this.userRepository.findOne({
      where: {
        emailHash: authContext.emailHash,
        status: 'active',
      },
    });
    if (!user) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

    const tenant = await this.tenantRepository.findOne({
      where: {
        id: authContext.activeTenantId,
        status: 'active',
      },
    });
    if (!tenant) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

    const provider = await this.providerRepository.findOne({
      where: { providerId },
    });
    if (!provider) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }
    const configuration =
      await this.tenantProviderConfigurationService.assertProviderEnabled(
        tenant.id,
        providerId,
      );

    const { userCredential, tenantCredential } =
      await this.tenantRlsService.withTenantContext(
        tenant.id,
        async (manager) => {
          const credentialRepository =
            manager.getRepository(UserProviderCredentialEntity);
          const userCredentials = await credentialRepository.find({
            where: {
              tenantId: tenant.id,
              userId: user.id,
              providerId: provider.id,
              scope: 'user',
              isActive: true,
            },
          });
          const userCredential =
            this.selectMostRecentCredential(userCredentials);

          const tenantCredentials = await credentialRepository.find({
            where: {
              tenantId: tenant.id,
              userId: IsNull(),
              providerId: provider.id,
              scope: 'tenant',
              isActive: true,
            },
          });
          const tenantCredential =
            this.selectMostRecentCredential(tenantCredentials);

          return {
            userCredential,
            tenantCredential,
          };
        },
      );
    const userCredentialAccess = userCredential
      ? this.decryptProviderAccess(providerId, userCredential)
      : null;
    const tenantCredentialAccess = tenantCredential
      ? this.decryptProviderAccess(providerId, tenantCredential)
      : null;
    const resolvedProviderAccess = this.resolveProviderAccessForConfiguration(
      configuration,
      {
        userCredentialAccess,
        tenantCredentialAccess,
        platformProviderAccess: this.getPlatformProviderAccess(providerId),
      },
    );
    if (!resolvedProviderAccess) {
      throw new ForbiddenException(
        `No active credential path is configured for provider ${providerId} in tenant ${authContext.activeTenantId}.`,
      );
    }

    return resolvedProviderAccess;
  }

  private decryptProviderAccess(
    providerId: ProviderId,
    credential: UserProviderCredentialEntity,
  ): ProviderAccessConfig {
    try {
      const decryptedPayload = this.encryptionService.decrypt({
        ciphertext: credential.encryptedSecret,
        iv: credential.iv,
        authTag: credential.authTag,
        keyVersion: credential.keyVersion,
      });

      return this.parseProviderAccess(providerId, decryptedPayload);
    } catch {
      throw new InternalServerErrorException(
        `Unable to decrypt the stored credential for provider ${providerId}. Verify that admin-api and gateway-api use the same LXP_ENCRYPTION_MASTER_KEY and LXP_ENCRYPTION_KEY_VERSION, or re-save the provider credential with the active key.`,
      );
    }
  }

  private parseProviderAccess(
    providerId: ProviderId,
    decryptedPayload: string,
  ): ProviderAccessConfig {
    try {
      const parsed = JSON.parse(decryptedPayload) as ProviderAccessConfig;
      return this.normalizeProviderAccess(providerId, parsed);
    } catch {
      return this.normalizeProviderAccess(providerId, {
        apiKey: decryptedPayload,
      });
    }
  }

  private normalizeProviderAccess(
    providerId: ProviderId,
    providerAccess: ProviderAccessConfig,
  ): ProviderAccessConfig {
    if (!providerAccess.baseUrl && !providerAccess.apiKey) {
      throw new InternalServerErrorException(
        `Stored provider access for ${providerId} is empty or invalid.`,
      );
    }

    return {
      ...providerAccess,
      baseUrl: providerAccess.baseUrl?.trim() || undefined,
      apiKey: providerAccess.apiKey?.trim() || undefined,
      headers: providerAccess.headers,
    };
  }

  private selectMostRecentCredential(
    credentials: UserProviderCredentialEntity[],
  ): UserProviderCredentialEntity | null {
    if (credentials.length === 0) {
      return null;
    }

    return [...credentials].sort((left, right) => {
      const rightTimestamp = this.getCredentialTimestamp(right);
      const leftTimestamp = this.getCredentialTimestamp(left);
      return rightTimestamp - leftTimestamp;
    })[0]!;
  }

  private getCredentialTimestamp(
    credential: UserProviderCredentialEntity,
  ): number {
    if (credential.updatedAt instanceof Date) {
      return credential.updatedAt.getTime();
    }

    if (credential.createdAt instanceof Date) {
      return credential.createdAt.getTime();
    }

    return 0;
  }

  private resolveProviderAccessForConfiguration(
    configuration: ResolvedTenantProviderConfiguration,
    candidates: {
      userCredentialAccess: ProviderAccessConfig | null;
      tenantCredentialAccess: ProviderAccessConfig | null;
      platformProviderAccess: ProviderAccessConfig | null;
    },
  ): ResolvedProviderAccess | null {
    if (configuration.credentialMode === 'platform_default') {
      return candidates.platformProviderAccess
        ? {
            providerAccess: candidates.platformProviderAccess,
            credentialScopeUsed: 'platform',
          }
        : null;
    }

    const useUserFirst =
      configuration.credentialMode === 'user_byok' ||
      (configuration.credentialMode === 'hybrid' &&
        configuration.preferUserCredentials);

    if (useUserFirst && candidates.userCredentialAccess) {
      return {
        providerAccess: candidates.userCredentialAccess,
        credentialScopeUsed: 'user',
      };
    }

    if (configuration.allowTenantFallback && candidates.tenantCredentialAccess) {
      return {
        providerAccess: candidates.tenantCredentialAccess,
        credentialScopeUsed: 'tenant',
      };
    }

    if (
      !useUserFirst &&
      configuration.credentialMode === 'hybrid' &&
      candidates.userCredentialAccess
    ) {
      return {
        providerAccess: candidates.userCredentialAccess,
        credentialScopeUsed: 'user',
      };
    }

    if (
      configuration.allowPlatformFallback &&
      candidates.platformProviderAccess
    ) {
      return {
        providerAccess: candidates.platformProviderAccess,
        credentialScopeUsed: 'platform',
      };
    }

    return null;
  }

  private getPlatformProviderAccess(
    providerId: ProviderId,
  ): ProviderAccessConfig | null {
    const envByProvider: Record<ProviderId, { apiKey?: string; baseUrl?: string }> = {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
      },
      google: {
        apiKey: process.env.GOOGLE_API_KEY,
        baseUrl: process.env.GOOGLE_BASE_URL,
      },
      groq: {
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: process.env.GROQ_BASE_URL,
      },
      nanogpt: {
        apiKey: process.env.NANOGPT_API_KEY,
        baseUrl: process.env.NANOGPT_BASE_URL,
      },
      ollama: {
        apiKey: process.env.OLLAMA_API_KEY,
        baseUrl: process.env.OLLAMA_BASE_URL,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: process.env.OPENROUTER_BASE_URL,
      },
      mistral: {
        apiKey: process.env.MISTRAL_API_KEY,
        baseUrl: process.env.MISTRAL_BASE_URL,
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: process.env.DEEPSEEK_BASE_URL,
      },
      moonshot: {
        apiKey: process.env.MOONSHOT_API_KEY,
        baseUrl: process.env.MOONSHOT_BASE_URL,
      },
      xai: {
        apiKey: process.env.XAI_API_KEY,
        baseUrl: process.env.XAI_BASE_URL,
      },
      zai: {
        apiKey: process.env.ZAI_API_KEY,
        baseUrl: process.env.ZAI_BASE_URL,
      },
    };
    const platformAccess = envByProvider[providerId];
    if (!platformAccess) {
      return null;
    }

    const apiKey = platformAccess.apiKey?.trim();
    const baseUrl = platformAccess.baseUrl?.trim();
    if (!apiKey && !baseUrl) {
      return null;
    }

    return {
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
    };
  }
}
