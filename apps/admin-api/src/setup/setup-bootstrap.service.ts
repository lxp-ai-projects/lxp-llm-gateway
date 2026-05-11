import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { ProviderId } from '@lxp/domain';

import { InstallationStateEntity, INSTALLATION_STATE_SINGLETON_ID } from '../persistence/entities/installation-state.entity';
import { RoleEntity } from '../persistence/entities/role.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { TenantProviderConfigurationEntity } from '../persistence/entities/tenant-provider-configuration.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { SetupBootstrapRequestDto } from './dto/setup-bootstrap-request.dto';

type ProviderAccessConfig = {
  apiKey?: string;
  baseUrl?: string;
};

type SetupProviderCredentialInput = NonNullable<
  SetupBootstrapRequestDto['providerCredentials']
>[number];

type SetupBootstrapResult = {
  setupCompleted: true;
  tenant: {
    id: string;
    slug: string;
    displayName: string;
  };
  superAdmin: {
    userUuid: string;
    email: string;
    displayName: string;
  };
  openWebUi: null | {
    clientId: string;
    displayName: string;
    applicationId: string;
    scopes: string[];
    trustedForwardedIdentityEnabled: boolean;
    apiKey: string | null;
  };
};

@Injectable()
export class SetupBootstrapService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly emailProtectionService: EmailProtectionService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordService: PasswordService,
  ) {}

  async bootstrap(
    dto: SetupBootstrapRequestDto,
  ): Promise<SetupBootstrapResult> {
    return this.dataSource.transaction(async (manager) => {
      const state = await this.lockInstallationState(manager);
      const existingSuperAdminUserId = await this.findSuperAdminUserId(manager);
      if (state.status === 'COMPLETED' || existingSuperAdminUserId) {
        throw new GoneException('Setup is no longer available.');
      }

      const now = new Date();
      state.status = 'IN_PROGRESS';
      state.setupStartedAt = state.setupStartedAt ?? now;
      state.setupCompletedAt = null;
      state.completedByUserId = null;
      state.appVersion = state.appVersion ?? this.resolveAppVersion();
      await manager.getRepository(InstallationStateEntity).save(state);

      const tenantInput = this.normalizeTenantInput(dto.tenant);
      await this.assertEmailAvailable(manager, dto.superAdmin.email);
      await this.assertTenantSlugAvailable(manager, tenantInput.slug);

      const tenant = await manager.getRepository(TenantEntity).save(
        manager.getRepository(TenantEntity).create({
          slug: tenantInput.slug,
          displayName: tenantInput.displayName,
          allowUserCredentialOverride: tenantInput.allowUserCredentialOverride,
          status: 'active',
        }),
      );

      const protectedEmail = this.emailProtectionService.protect(
        dto.superAdmin.email.trim(),
      );
      const passwordHash = await this.passwordService.hashPassword(
        dto.superAdmin.password,
      );
      const superAdmin = await manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          userUuid: randomUUID(),
          emailHash: protectedEmail.emailHash,
          encryptedEmail: protectedEmail.encryptedEmail,
          emailIv: protectedEmail.emailIv,
          emailAuthTag: protectedEmail.emailAuthTag,
          emailKeyVersion: protectedEmail.emailKeyVersion,
          passwordHash,
          displayName: dto.superAdmin.displayName.trim(),
          status: 'active',
          lastActiveTenantId: tenant.id,
          defaultProviderId: null,
          defaultModel: null,
          defaultImageProviderId: null,
          defaultImageModel: null,
        }),
      );

      await manager.getRepository(TenantMembershipEntity).save(
        manager.getRepository(TenantMembershipEntity).create({
          tenantId: tenant.id,
          userId: superAdmin.id,
          role: 'tenant_admin',
        }),
      );

      const superAdminRole = await manager.getRepository(RoleEntity).findOne({
        where: { name: 'super_admin' },
      });
      if (!superAdminRole) {
        throw new ConflictException('Setup prerequisites are incomplete.');
      }

      await manager.getRepository(UserRoleEntity).save(
        manager.getRepository(UserRoleEntity).create({
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        }),
      );

      const normalizedPolicy = this.normalizePolicyInput(dto.tenantPolicy);
      await manager.getRepository(TenantPolicyEntity).save(
        manager.getRepository(TenantPolicyEntity).create({
          tenantId: tenant.id,
          ...normalizedPolicy,
        }),
      );

      for (const providerCredential of dto.providerCredentials ?? []) {
        await this.createTenantProviderCredential(
          manager,
          tenant.id,
          providerCredential,
        );
      }

      const openWebUi = dto.openWebUi?.enabled
        ? await this.createOpenWebUiIntegration(
            manager,
            tenant.id,
            superAdmin.id,
            dto.openWebUi,
          )
        : null;

      state.status = 'COMPLETED';
      state.setupCompletedAt = new Date();
      state.completedByUserId = superAdmin.id;
      state.appVersion = this.resolveAppVersion();
      await manager.getRepository(InstallationStateEntity).save(state);

      return {
        setupCompleted: true,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          displayName: tenant.displayName,
        },
        superAdmin: {
          userUuid: superAdmin.userUuid,
          email: dto.superAdmin.email.trim(),
          displayName: superAdmin.displayName,
        },
        openWebUi,
      };
    });
  }

  private async lockInstallationState(
    manager: EntityManager,
  ): Promise<InstallationStateEntity> {
    const repository = manager.getRepository(InstallationStateEntity);
    let state = await repository.findOne({
      where: { id: INSTALLATION_STATE_SINGLETON_ID },
      lock: { mode: 'pessimistic_write' },
    });

    if (state) {
      return state;
    }

    await repository.save(
      repository.create({
        id: INSTALLATION_STATE_SINGLETON_ID,
        status: 'PENDING',
        setupStartedAt: null,
        setupCompletedAt: null,
        completedByUserId: null,
        appVersion: this.resolveAppVersion(),
      }),
    );

    state = await repository.findOne({
      where: { id: INSTALLATION_STATE_SINGLETON_ID },
      lock: { mode: 'pessimistic_write' },
    });
    if (!state) {
      throw new ConflictException('Setup bootstrap could not be initialized.');
    }

    return state;
  }

  private async findSuperAdminUserId(
    manager: EntityManager,
  ): Promise<string | null> {
    const superAdminRole = await manager.getRepository(RoleEntity).findOne({
      where: { name: 'super_admin' },
    });
    if (!superAdminRole) {
      return null;
    }

    const assignment = await manager.getRepository(UserRoleEntity).findOne({
      where: {
        roleId: superAdminRole.id,
      },
    });

    return assignment?.userId ?? null;
  }

  private async assertEmailAvailable(
    manager: EntityManager,
    email: string,
  ): Promise<void> {
    const protectedEmail = this.emailProtectionService.protect(email.trim());
    const existingUser = await manager.getRepository(UserEntity).findOne({
      where: { emailHash: protectedEmail.emailHash },
    });
    if (existingUser) {
      throw new ConflictException('Setup is no longer available.');
    }
  }

  private async assertTenantSlugAvailable(
    manager: EntityManager,
    slug: string,
  ): Promise<void> {
    const existingTenant = await manager.getRepository(TenantEntity).findOne({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException(
        'A tenant with this slug already exists.',
      );
    }
  }

  private async createTenantProviderCredential(
    manager: EntityManager,
    tenantId: string,
    input: SetupProviderCredentialInput,
  ): Promise<void> {
    const provider = await manager.getRepository(ProviderEntity).findOne({
      where: { providerId: input.providerId },
    });
    if (!provider) {
      throw new ConflictException('Unknown provider in setup payload.');
    }

    const providerAccess = this.createProviderAccess(
      input.providerId,
      input.apiToken,
      input.baseUrl,
    );
    const encrypted = this.encryptionService.encrypt(
      JSON.stringify(providerAccess),
    );

    await manager.getRepository(UserProviderCredentialEntity).save(
      manager.getRepository(UserProviderCredentialEntity).create({
        tenantId,
        userId: null,
        providerId: provider.id,
        scope: 'tenant',
        label: input.label.trim(),
        encryptedSecret: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        isActive: true,
        maskedHint: this.maskProviderAccess(providerAccess),
        lastUsedAt: null,
      }),
    );

    const configurationRepository = manager.getRepository(
      TenantProviderConfigurationEntity,
    );
    const existingConfiguration = await configurationRepository.findOne({
      where: {
        tenantId,
        providerId: provider.id,
      },
    });
    const configuration =
      existingConfiguration ??
      configurationRepository.create({
        tenantId,
        providerId: provider.id,
      });

    configuration.enabled = true;
    configuration.defaultTextModel = input.defaultTextModel?.trim() || null;
    configuration.defaultImageModel = input.defaultImageModel?.trim() || null;
    configuration.credentialMode = 'tenant_byok';
    configuration.preferUserCredentials = false;
    configuration.allowPlatformFallback = false;
    configuration.allowTenantFallback = true;

    await configurationRepository.save(configuration);
  }

  private async createOpenWebUiIntegration(
    manager: EntityManager,
    tenantId: string,
    defaultUserId: string,
    input: NonNullable<SetupBootstrapRequestDto['openWebUi']>,
  ) {
    const normalizedClientId = input.clientId?.trim() || 'open-webui';
    const existingClient = await manager.getRepository(IntegrationClientEntity).findOne({
      where: {
        tenantId,
        clientId: normalizedClientId,
      },
    });
    if (existingClient) {
      throw new ConflictException(
        'An Open WebUI integration client with this ID already exists.',
      );
    }

    const scopes =
      input.scopes?.map((scope) => scope.trim()).filter(Boolean) ?? [
        'chat:completion',
        'models:list',
      ];
    const uniqueScopes = [...new Set(scopes)].sort();

    const client = await manager.getRepository(IntegrationClientEntity).save(
      manager.getRepository(IntegrationClientEntity).create({
        tenantId,
        clientId: normalizedClientId,
        displayName: input.displayName?.trim() || 'Open WebUI',
        applicationId: input.applicationId?.trim() || 'open-webui',
        defaultUserId,
        scopes: uniqueScopes,
        trustedForwardedIdentityEnabled:
          input.trustedForwardedIdentityEnabled ?? false,
        status: 'active',
      }),
    );

    let rawApiKey: string | null = null;
    if (input.createApiKey ?? true) {
      rawApiKey = this.generateIntegrationApiKey();
      await manager.getRepository(ApiKeyEntity).save(
        manager.getRepository(ApiKeyEntity).create({
          tenantId,
          integrationClientId: client.id,
          label: input.apiKeyLabel?.trim() || 'Primary setup key',
          keyHash: this.hashIntegrationApiKey(rawApiKey),
          keyHint: this.buildIntegrationApiKeyHint(rawApiKey),
          scopes: uniqueScopes,
          status: 'active',
          expiresAt: null,
          lastUsedAt: null,
        }),
      );
    }

    return {
      clientId: client.clientId,
      displayName: client.displayName,
      applicationId: client.applicationId,
      scopes: uniqueScopes,
      trustedForwardedIdentityEnabled:
        client.trustedForwardedIdentityEnabled,
      apiKey: rawApiKey,
    };
  }

  private normalizeTenantInput(input: SetupBootstrapRequestDto['tenant']) {
    return {
      slug: input.slug.trim().toLowerCase(),
      displayName: input.displayName.trim(),
      allowUserCredentialOverride: input.allowUserCredentialOverride ?? true,
    };
  }

  private normalizePolicyInput(input?: SetupBootstrapRequestDto['tenantPolicy']) {
    return {
      monthlyBudgetUsd: input?.monthlyBudgetUsd?.trim() || null,
      dailyRequestLimit: null,
      monthlyRequestLimit: null,
      requestsPerMinute: input?.requestsPerMinute ?? 60,
      tokensPerMinute: input?.tokensPerMinute ?? 100000,
      monthlyTokenLimit: input?.monthlyTokenLimit ?? null,
      imageRequestsPerMonth: input?.imageRequestsPerMonth ?? null,
      maxInputTokens: input?.maxInputTokens ?? null,
      maxOutputTokens: input?.maxOutputTokens ?? null,
      allowPromptLogging: input?.allowPromptLogging ?? false,
      allowResponseLogging: input?.allowResponseLogging ?? false,
      retentionDays: input?.retentionDays ?? 30,
    };
  }

  private createProviderAccess(
    providerId: ProviderId,
    apiToken?: string,
    baseUrl?: string,
  ): ProviderAccessConfig {
    const providerAccess = {
      apiKey: apiToken?.trim() || undefined,
      baseUrl: baseUrl?.trim() || undefined,
    };

    if (!providerAccess.apiKey && !providerAccess.baseUrl) {
      throw new BadRequestException(
        'A provider credential must include an API token, a base URL, or both.',
      );
    }

    this.assertProviderAccessIsValid(providerId, providerAccess);
    return providerAccess;
  }

  private assertProviderAccessIsValid(
    providerId: ProviderId,
    providerAccess: ProviderAccessConfig,
  ): void {
    if (
      (providerId === 'google' ||
        providerId === 'xai' ||
        providerId === 'openai' ||
        providerId === 'anthropic' ||
        providerId === 'mistral' ||
        providerId === 'deepseek') &&
      !providerAccess.apiKey
    ) {
      throw new BadRequestException(
        providerId === 'google'
          ? 'Google Gemini credentials require an API token.'
          : providerId === 'xai'
            ? 'xAI Grok credentials require an API token.'
            : providerId === 'openai'
              ? 'OpenAI credentials require an API token.'
              : providerId === 'anthropic'
                ? 'Anthropic credentials require an API token.'
                : providerId === 'mistral'
                  ? 'Mistral credentials require an API token.'
                  : 'DeepSeek credentials require an API token.',
      );
    }

    if (providerId !== 'ollama' || !providerAccess.baseUrl) {
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(providerAccess.baseUrl);
    } catch {
      throw new BadRequestException(
        'Ollama base URL must be a valid absolute URL.',
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      (hostname === 'ollama.com' || hostname === 'www.ollama.com') &&
      !providerAccess.apiKey
    ) {
      throw new BadRequestException(
        'Ollama cloud credentials on ollama.com require an API token.',
      );
    }
  }

  private maskProviderAccess(providerAccess: ProviderAccessConfig): string | null {
    if (providerAccess.apiKey) {
      return providerAccess.apiKey.length <= 4
        ? providerAccess.apiKey
        : `***${providerAccess.apiKey.slice(-4)}`;
    }

    if (providerAccess.baseUrl) {
      return providerAccess.baseUrl;
    }

    return null;
  }

  private generateIntegrationApiKey(): string {
    return `lxp_${randomBytes(24).toString('hex')}`;
  }

  private hashIntegrationApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private buildIntegrationApiKeyHint(apiKey: string): string {
    return apiKey.length <= 8 ? apiKey : `***${apiKey.slice(-4)}`;
  }

  private resolveAppVersion(): string | null {
    const version = process.env.npm_package_version?.trim();
    return version && version.length > 0 ? version : null;
  }
}
