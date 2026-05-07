import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { GlobalRole, ProviderId, TenantRole } from '@lxp/domain';
import { IsNull, Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { RoleEntity } from '../persistence/entities/role.entity';
import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import {
  TenantModelAccessRuleEntity,
  type TenantModelAccessCapability,
  type TenantModelAccessEffect,
} from '../persistence/entities/tenant-model-access-rule.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import {
  TenantProviderConfigurationEntity,
  type TenantProviderCredentialMode,
} from '../persistence/entities/tenant-provider-configuration.entity';
import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { SuperAdminBootstrapService } from '../auth/super-admin-bootstrap.service';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { CreateTenantMembershipDto } from './dto/create-tenant-membership.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { StoreProviderCredentialDto } from './dto/store-provider-credential.dto';
import { UpdateProviderCredentialDto } from './dto/update-provider-credential.dto';
import { UpdateProviderSettingsDto } from './dto/update-provider-settings.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type ProviderAccessConfig = {
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
};

type TenantActor = {
  userUuid: string;
  roles: TenantRole[];
  activeTenantId: string;
  activeTenantSlug: string;
  globalRoles?: GlobalRole[];
};

type TenantActorLike = Pick<TenantActor, 'userUuid'> & Partial<TenantActor>;

type TenantProviderConfigurationSummary = {
  id: string | null;
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
  createdAt: Date | null;
  updatedAt: Date | null;
};

type TenantModelAccessRuleSummary = {
  id: string;
  tenantId: string;
  providerId: ProviderId;
  modelPattern: string;
  capability: TenantModelAccessCapability;
  effect: TenantModelAccessEffect;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  maxImagesPerRequest: number | null;
  maxResolution: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};

type TenantUsageEventSummary = {
  id: string;
  requestId: string;
  userUuid: string;
  operation: 'chat' | 'image_generation' | 'image_edit';
  capability: 'text' | 'image' | 'stt' | 'tts' | 'embedding' | null;
  providerId: string;
  model: string;
  identitySource: string;
  integrationClientId: string | null;
  apiKeyId: string | null;
  credentialScopeUsed: 'platform' | 'tenant' | 'user' | null;
  status: 'success' | 'error' | 'blocked_by_policy' | 'blocked_by_quota';
  errorCode: string | null;
  totalTokens: number | null;
  imageCount: number | null;
  costEstimateUsd: string | null;
  latencyMs: number | null;
  createdAt: Date;
};

type TenantUsageSummary = {
  tenantId: string;
  requests24h: number;
  requests7d: number;
  requests30d: number;
  distinctUsers24h: number;
  activeUsers30d: number;
  blockedRequests7d: number;
  estimatedCostUsd30d: string;
};

type TenantUsageByProviderSummary = {
  providerId: string;
  requests30d: number;
  blockedRequests30d: number;
  estimatedCostUsd30d: string;
  lastRequestAt: Date | null;
};

type TenantUsageByModelSummary = {
  providerId: string;
  model: string;
  capability: 'text' | 'image' | 'stt' | 'tts' | 'embedding' | null;
  requests30d: number;
  blockedRequests30d: number;
  estimatedCostUsd30d: string;
  lastRequestAt: Date | null;
};

type TenantPolicySummary = {
  tenantId: string;
  monthlyBudgetUsd: string | null;
  dailyRequestLimit: number | null;
  monthlyRequestLimit: number | null;
  requestsPerMinute: number;
  tokensPerMinute: number;
  monthlyTokenLimit: number | null;
  imageRequestsPerMonth: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  allowPromptLogging: boolean;
  allowResponseLogging: boolean;
  retentionDays: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type TenantIntegrationClientSummary = {
  id: string;
  tenantId: string;
  clientId: string;
  displayName: string;
  applicationId: string;
  defaultUserUuid: string | null;
  defaultUserDisplayName: string | null;
  scopes: string[];
  trustedForwardedIdentityEnabled: boolean;
  status: 'active' | 'disabled';
  apiKeyCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type TenantIntegrationApiKeySummary = {
  id: string;
  tenantId: string;
  integrationClientId: string;
  integrationClientClientId: string;
  label: string;
  keyHint: string | null;
  scopes: string[];
  status: 'active' | 'disabled';
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TenantIntegrationApiKeySecretSummary = {
  apiKey: string;
  summary: TenantIntegrationApiKeySummary;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(IntegrationClientEntity)
    private readonly integrationClientRepository: Repository<IntegrationClientEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    @InjectRepository(TenantModelAccessRuleEntity)
    private readonly tenantModelAccessRuleRepository: Repository<TenantModelAccessRuleEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(TenantProviderConfigurationEntity)
    private readonly tenantProviderConfigurationRepository: Repository<TenantProviderConfigurationEntity>,
    @InjectRepository(TenantPolicyEntity)
    private readonly tenantPolicyRepository: Repository<TenantPolicyEntity>,
    @InjectRepository(UsageEventEntity)
    private readonly usageEventRepository: Repository<UsageEventEntity>,
    @InjectRepository(UserProviderCredentialEntity)
    private readonly credentialRepository: Repository<UserProviderCredentialEntity>,
    private readonly emailProtectionService: EmailProtectionService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordService: PasswordService,
    private readonly tenantRlsService: TenantRlsService,
    private readonly superAdminBootstrapService: SuperAdminBootstrapService,
  ) {}

  async createUser(
    actor: TenantActorLike,
    dto: CreateUserDto,
  ): Promise<ReturnType<AdminService['mapUserSummary']>>;
  async createUser(
    dto: CreateUserDto,
  ): Promise<ReturnType<AdminService['mapUserSummary']>>;
  async createUser(
    actorOrDto: TenantActorLike | CreateUserDto,
    maybeDto?: CreateUserDto,
  ) {
    const actor =
      maybeDto === undefined
        ? await this.getDefaultTenantActor()
        : await this.resolveActor(actorOrDto as TenantActorLike);
    const dto = maybeDto ?? (actorOrDto as CreateUserDto);
    return this.createUserInTenant(actor.activeTenantId, dto);
  }

  async createTenantUser(tenantId: string, dto: CreateTenantMembershipDto) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return this.createUserInTenant(tenantId, dto);
  }

  private async createUserInTenant(
    tenantId: string,
    dto: {
      email: string;
      password?: string;
      displayName?: string;
      roles?: TenantRole[];
    },
  ) {
    const protectedEmail = this.emailProtectionService.protect(dto.email);
    const existingUser = await this.userRepository.findOne({
      where: { emailHash: protectedEmail.emailHash },
    });

    let user = existingUser;
    if (!user) {
      if (!dto.password || dto.password.trim().length < 8) {
        throw new BadRequestException(
          'A temporary password is required when provisioning a new global user.',
        );
      }
      if (!dto.displayName?.trim()) {
        throw new BadRequestException(
          'A display name is required when provisioning a new global user.',
        );
      }
      const passwordHash = await this.passwordService.hashPassword(dto.password);
      user = this.userRepository.create({
        userUuid: randomUUID(),
        emailHash: protectedEmail.emailHash,
        encryptedEmail: protectedEmail.encryptedEmail,
        emailIv: protectedEmail.emailIv,
        emailAuthTag: protectedEmail.emailAuthTag,
        emailKeyVersion: protectedEmail.emailKeyVersion,
        passwordHash,
        displayName: dto.displayName.trim(),
        status: 'active',
        lastActiveTenantId: tenantId,
        defaultProviderId: null,
        defaultModel: null,
        defaultImageProviderId: null,
        defaultImageModel: null,
      });
      await this.userRepository.save(user);
    }
    await this.superAdminBootstrapService.syncUserIfConfigured(user);

    const existingMembership = await this.tenantMembershipRepository.findOne({
      where: {
        tenantId,
        userId: user.id,
      },
    });
    if (existingMembership) {
      throw new ConflictException(
        'Unable to create user with the provided data.',
      );
    }

    const tenantRoles: TenantRole[] = dto.roles?.length ? dto.roles : ['user'];
    await this.tenantMembershipRepository.save(
      tenantRoles.map((role) =>
        this.tenantMembershipRepository.create({
          tenantId,
          userId: user.id,
          role,
        }),
      ),
    );
    const globalRoles =
      (await this.getUserGlobalRoleMap([user.id])).get(user.id) ?? [];

    return this.mapUserSummary(user, tenantId, tenantRoles, globalRoles);
  }

  async bootstrapAdmin(dto: CreateUserDto) {
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      throw new ConflictException('Bootstrap is not available.');
    }

    let tenant = await this.tenantRepository.findOne({
      where: { slug: 'lxp-internal' },
    });
    if (!tenant) {
      tenant = this.tenantRepository.create({
        slug: 'lxp-internal',
        displayName: 'LXP Internal',
        allowUserCredentialOverride: true,
        status: 'active',
      });
      await this.tenantRepository.save(tenant);
    }

    const protectedEmail = this.emailProtectionService.protect(dto.email);
    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const user = this.userRepository.create({
      userUuid: randomUUID(),
      emailHash: protectedEmail.emailHash,
      encryptedEmail: protectedEmail.encryptedEmail,
      emailIv: protectedEmail.emailIv,
      emailAuthTag: protectedEmail.emailAuthTag,
      emailKeyVersion: protectedEmail.emailKeyVersion,
      passwordHash,
      displayName: dto.displayName,
      status: 'active',
      lastActiveTenantId: tenant.id,
      defaultProviderId: null,
      defaultModel: null,
      defaultImageProviderId: null,
      defaultImageModel: null,
    });
    await this.userRepository.save(user);
    await this.superAdminBootstrapService.syncUserIfConfigured(user);

    await this.tenantMembershipRepository.save(
      this.tenantMembershipRepository.create({
        tenantId: tenant.id,
        userId: user.id,
        role: 'tenant_admin',
      }),
    );

    const superAdminRole = await this.roleRepository.findOne({
      where: { name: 'super_admin' },
    });
    if (superAdminRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: user.id,
          roleId: superAdminRole.id,
        }),
      );
    }

    return this.mapUserSummary(user, tenant.id, ['tenant_admin'], [
      'super_admin',
    ]);
  }

  async listTenants() {
    const tenants = await this.tenantRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
    const membershipCounts = await this.getTenantMembershipCounts(
      tenants.map((tenant) => tenant.id),
    );

    return tenants.map((tenant) => ({
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      allowUserCredentialOverride: tenant.allowUserCredentialOverride,
      status: tenant.status,
      membershipCount: membershipCounts.get(tenant.id) ?? 0,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }));
  }

  async createTenant(dto: {
    slug: string;
    displayName: string;
    allowUserCredentialOverride?: boolean;
  }) {
    const slug = dto.slug.trim().toLowerCase();
    const existingTenant = await this.tenantRepository.findOne({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException('Unable to create tenant with the provided data.');
    }

    const tenant = this.tenantRepository.create({
      slug,
      displayName: dto.displayName.trim(),
      allowUserCredentialOverride: dto.allowUserCredentialOverride ?? true,
      status: 'active',
    });
    await this.tenantRepository.save(tenant);

    return {
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      allowUserCredentialOverride: tenant.allowUserCredentialOverride,
      status: tenant.status,
      membershipCount: 0,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async updateTenant(
    tenantId: string,
    dto: {
      displayName?: string;
      allowUserCredentialOverride?: boolean;
      status?: 'active' | 'disabled';
    },
  ) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    if (dto.displayName !== undefined) {
      tenant.displayName = dto.displayName.trim();
    }
    if (dto.allowUserCredentialOverride !== undefined) {
      tenant.allowUserCredentialOverride = dto.allowUserCredentialOverride;
    }
    if (dto.status !== undefined) {
      tenant.status = dto.status;
    }

    await this.tenantRepository.save(tenant);
    const membershipCounts = await this.getTenantMembershipCounts([tenant.id]);

    return {
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      allowUserCredentialOverride: tenant.allowUserCredentialOverride,
      status: tenant.status,
      membershipCount: membershipCounts.get(tenant.id) ?? 0,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async listTenantMemberships(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const memberships = await this.tenantMembershipRepository.find({
      where: { tenantId },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
    const roleMap = await this.getTenantRoleMap(
      tenantId,
      memberships.map((membership) => membership.userId),
    );
    const globalRoleMap = await this.getUserGlobalRoleMap(
      memberships.map((membership) => membership.userId),
    );
    const membershipsByUserId = new Map<
      string,
      (typeof memberships)[number]
    >();

    for (const membership of memberships) {
      if (!membership.user || membershipsByUserId.has(membership.userId)) {
        continue;
      }

      membershipsByUserId.set(membership.userId, membership);
    }

    return [...membershipsByUserId.values()].map((membership) => ({
      tenantId,
      userUuid: membership.user!.userUuid,
      displayName: membership.user!.displayName,
      email: this.emailProtectionService.reveal({
        emailHash: membership.user!.emailHash,
        encryptedEmail: membership.user!.encryptedEmail,
        emailIv: membership.user!.emailIv,
        emailAuthTag: membership.user!.emailAuthTag,
        emailKeyVersion: membership.user!.emailKeyVersion,
      }),
      status: membership.user!.status,
      roles: roleMap.get(membership.userId) ?? [],
      globalRoles: globalRoleMap.get(membership.userId) ?? [],
      createdAt: membership.createdAt,
    }));
  }

  async listTenantProviderConfigurations(
    tenantId: string,
  ): Promise<TenantProviderConfigurationSummary[]> {
    const tenant = await this.assertTenantExists(tenantId);
    const providers = await this.providerRepository.find({
      order: {
        displayName: 'ASC',
      },
    });
    const configurations =
      await this.tenantProviderConfigurationRepository.find({
        where: { tenantId },
      });
    const configurationByProviderId = new Map(
      configurations.map((configuration) => [configuration.providerId, configuration]),
    );

    return providers.map((provider) =>
      this.mapTenantProviderConfigurationSummary(
        tenant,
        provider,
        configurationByProviderId.get(provider.id) ?? null,
      ),
    );
  }

  async upsertTenantProviderConfiguration(
    tenantId: string,
    providerId: string,
    dto: {
      enabled: boolean;
      defaultTextModel?: string;
      defaultImageModel?: string;
      credentialMode: TenantProviderCredentialMode;
      preferUserCredentials: boolean;
      allowPlatformFallback: boolean;
      allowTenantFallback: boolean;
    },
  ): Promise<TenantProviderConfigurationSummary> {
    const tenant = await this.assertTenantExists(tenantId);
    const provider = await this.assertProviderExists(providerId);
    const normalizedSettings =
      this.normalizeTenantProviderConfigurationSettings(dto);
    const existingConfiguration =
      await this.tenantProviderConfigurationRepository.findOne({
        where: {
          tenantId,
          providerId: provider.id,
        },
      });
    const configuration =
      existingConfiguration ??
      this.tenantProviderConfigurationRepository.create({
        tenantId,
        providerId: provider.id,
      });

    configuration.enabled = normalizedSettings.enabled;
    configuration.defaultTextModel = normalizedSettings.defaultTextModel;
    configuration.defaultImageModel = normalizedSettings.defaultImageModel;
    configuration.credentialMode = normalizedSettings.credentialMode;
    configuration.preferUserCredentials =
      normalizedSettings.preferUserCredentials;
    configuration.allowPlatformFallback =
      normalizedSettings.allowPlatformFallback;
    configuration.allowTenantFallback = normalizedSettings.allowTenantFallback;

    const savedConfiguration =
      await this.tenantProviderConfigurationRepository.save(configuration);

    return this.mapTenantProviderConfigurationSummary(
      tenant,
      provider,
      savedConfiguration,
    );
  }

  async testTenantProviderConfiguration(
    actor: TenantActorLike,
    tenantId: string,
    providerId: string,
    dto?: {
      userUuid?: string;
    },
  ) {
    const tenant = await this.assertTenantExists(tenantId);
    const provider = await this.assertProviderExists(providerId);
    const configuration = await this.getResolvedTenantProviderConfiguration(
      tenant,
      provider,
    );
    const testedUser =
      dto?.userUuid !== undefined
        ? await this.assertTenantScopedUser(tenantId, dto.userUuid)
        : await this.tryResolveTenantScopedUser(tenantId, actor.userUuid);
    const [userCredentialAvailable, tenantCredentialAvailable] =
      await Promise.all([
        testedUser
          ? this.hasActiveCredential(tenantId, testedUser.id, provider.id, 'user')
          : Promise.resolve(false),
        this.hasActiveCredential(tenantId, null, provider.id, 'tenant'),
      ]);
    const platformProviderAccess = this.getPlatformProviderAccess(
      provider.providerId,
    );
    const platformCredentialAvailable =
      platformProviderAccess !== null &&
      Boolean(
        platformProviderAccess.apiKey || platformProviderAccess.baseUrl,
      );
    const resolvedCredentialScope = this.resolveCredentialScopeForConfiguration(
      configuration,
      {
        userCredentialAvailable,
        tenantCredentialAvailable,
        platformCredentialAvailable,
      },
    );
    const canResolve =
      configuration.enabled &&
      configuration.providerStatus === 'active' &&
      resolvedCredentialScope !== null;

    return {
      tenantId,
      providerId: provider.providerId,
      providerDisplayName: provider.displayName,
      configuration,
      testedUserUuid: testedUser?.userUuid ?? null,
      userCredentialAvailable,
      tenantCredentialAvailable,
      platformCredentialAvailable,
      canResolve,
      resolvedCredentialScope,
      message: this.buildTenantProviderConfigurationTestMessage({
        configuration,
        canResolve,
        resolvedCredentialScope,
        testedUserUuid: testedUser?.userUuid ?? null,
        userCredentialAvailable,
        tenantCredentialAvailable,
        platformCredentialAvailable,
      }),
    };
  }

  async getTenantPolicy(tenantId: string): Promise<TenantPolicySummary> {
    const tenant = await this.assertTenantExists(tenantId);
    const policy = await this.tenantPolicyRepository.findOne({
      where: { tenantId },
    });

    return this.mapTenantPolicySummary(tenant.id, policy);
  }

  async upsertTenantPolicy(
    tenantId: string,
    dto: {
      monthlyBudgetUsd?: string;
      dailyRequestLimit?: number;
      monthlyRequestLimit?: number;
      requestsPerMinute?: number;
      tokensPerMinute?: number;
      monthlyTokenLimit?: number;
      imageRequestsPerMonth?: number;
      maxInputTokens?: number;
      maxOutputTokens?: number;
      allowPromptLogging?: boolean;
      allowResponseLogging?: boolean;
      retentionDays?: number;
    },
  ): Promise<TenantPolicySummary> {
    const tenant = await this.assertTenantExists(tenantId);
    const existingPolicy = await this.tenantPolicyRepository.findOne({
      where: { tenantId },
    });
    const policy =
      existingPolicy ??
      this.tenantPolicyRepository.create({
        tenantId,
      });
    const normalized = this.normalizeTenantPolicyInput(dto);

    policy.monthlyBudgetUsd = normalized.monthlyBudgetUsd;
    policy.dailyRequestLimit = normalized.dailyRequestLimit;
    policy.monthlyRequestLimit = normalized.monthlyRequestLimit;
    policy.requestsPerMinute = normalized.requestsPerMinute;
    policy.tokensPerMinute = normalized.tokensPerMinute;
    policy.monthlyTokenLimit = normalized.monthlyTokenLimit;
    policy.imageRequestsPerMonth = normalized.imageRequestsPerMonth;
    policy.maxInputTokens = normalized.maxInputTokens;
    policy.maxOutputTokens = normalized.maxOutputTokens;
    policy.allowPromptLogging = normalized.allowPromptLogging;
    policy.allowResponseLogging = normalized.allowResponseLogging;
    policy.retentionDays = normalized.retentionDays;

    const savedPolicy = await this.tenantPolicyRepository.save(policy);
    return this.mapTenantPolicySummary(tenant.id, savedPolicy);
  }

  async listTenantIntegrationClients(
    tenantId: string,
  ): Promise<TenantIntegrationClientSummary[]> {
    await this.assertTenantExists(tenantId);
    const clients = await this.integrationClientRepository.find({
      where: { tenantId },
      relations: {
        defaultUser: true,
        apiKeys: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return clients.map((client) => this.mapTenantIntegrationClientSummary(client));
  }

  async createTenantIntegrationClient(
    tenantId: string,
    dto: {
      clientId: string;
      displayName: string;
      applicationId: string;
      defaultUserUuid?: string;
      scopes: string[];
      trustedForwardedIdentityEnabled: boolean;
    },
  ): Promise<TenantIntegrationClientSummary> {
    await this.assertTenantExists(tenantId);
    const normalized = await this.normalizeIntegrationClientInput(tenantId, dto);
    const existingClient = await this.integrationClientRepository.findOne({
      where: {
        tenantId,
        clientId: normalized.clientId,
      },
    });
    if (existingClient) {
      throw new ConflictException(
        'Unable to create integration client with the provided data.',
      );
    }

    const createdClient = this.integrationClientRepository.create({
      tenantId,
      clientId: normalized.clientId,
      displayName: normalized.displayName,
      applicationId: normalized.applicationId,
      defaultUserId: normalized.defaultUser?.id ?? null,
      scopes: normalized.scopes,
      trustedForwardedIdentityEnabled:
        normalized.trustedForwardedIdentityEnabled,
      status: 'active',
    });
    const savedClient = await this.integrationClientRepository.save(createdClient);

    return this.mapTenantIntegrationClientSummary({
      ...savedClient,
      defaultUser: normalized.defaultUser,
      apiKeys: [],
    } as IntegrationClientEntity);
  }

  async updateTenantIntegrationClient(
    tenantId: string,
    integrationClientId: string,
    dto: {
      displayName?: string;
      applicationId?: string;
      defaultUserUuid?: string;
      scopes?: string[];
      trustedForwardedIdentityEnabled?: boolean;
      status?: 'active' | 'disabled';
    },
  ): Promise<TenantIntegrationClientSummary> {
    await this.assertTenantExists(tenantId);
    const client = await this.integrationClientRepository.findOne({
      where: {
        tenantId,
        id: integrationClientId,
      },
      relations: {
        defaultUser: true,
        apiKeys: true,
      },
    });
    if (!client) {
      throw new NotFoundException('Integration client not found.');
    }

    const normalized = await this.normalizeIntegrationClientInput(tenantId, {
      clientId: client.clientId,
      displayName: dto.displayName ?? client.displayName,
      applicationId: dto.applicationId ?? client.applicationId,
      defaultUserUuid:
        dto.defaultUserUuid !== undefined
          ? dto.defaultUserUuid
          : client.defaultUser?.userUuid,
      scopes: dto.scopes ?? client.scopes,
      trustedForwardedIdentityEnabled:
        dto.trustedForwardedIdentityEnabled ??
        client.trustedForwardedIdentityEnabled,
    });

    client.displayName = normalized.displayName;
    client.applicationId = normalized.applicationId;
    client.defaultUserId = normalized.defaultUser?.id ?? null;
    client.defaultUser = normalized.defaultUser;
    client.scopes = normalized.scopes;
    client.trustedForwardedIdentityEnabled =
      normalized.trustedForwardedIdentityEnabled;
    if (dto.status !== undefined) {
      client.status = dto.status;
    }

    const savedClient = await this.integrationClientRepository.save(client);
    return this.mapTenantIntegrationClientSummary({
      ...savedClient,
      defaultUser: normalized.defaultUser,
      apiKeys: client.apiKeys,
    } as IntegrationClientEntity);
  }

  async listTenantIntegrationApiKeys(
    tenantId: string,
    integrationClientId: string,
  ): Promise<TenantIntegrationApiKeySummary[]> {
    await this.assertTenantExists(tenantId);
    const integrationClient = await this.assertTenantIntegrationClient(
      tenantId,
      integrationClientId,
    );
    const apiKeys = await this.apiKeyRepository.find({
      where: {
        tenantId,
        integrationClientId: integrationClient.id,
      },
      relations: {
        integrationClient: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return apiKeys.map((apiKey) => this.mapTenantIntegrationApiKeySummary(apiKey));
  }

  async createTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    dto: {
      label: string;
      scopes?: string[];
      expiresAt?: string | null;
    },
  ): Promise<TenantIntegrationApiKeySecretSummary> {
    await this.assertTenantExists(tenantId);
    const integrationClient = await this.assertTenantIntegrationClient(
      tenantId,
      integrationClientId,
    );
    const normalized = this.normalizeIntegrationApiKeyInput(dto);
    const rawApiKey = this.generateIntegrationApiKey();
    const apiKey = this.apiKeyRepository.create({
      tenantId,
      integrationClientId: integrationClient.id,
      label: normalized.label,
      keyHash: this.hashIntegrationApiKey(rawApiKey),
      keyHint: this.buildIntegrationApiKeyHint(rawApiKey),
      scopes: normalized.scopes ?? integrationClient.scopes,
      status: 'active',
      expiresAt: normalized.expiresAt,
      lastUsedAt: null,
    });
    const savedKey = await this.apiKeyRepository.save(apiKey);

    return {
      apiKey: rawApiKey,
      summary: this.mapTenantIntegrationApiKeySummary({
        ...savedKey,
        integrationClient,
      } as ApiKeyEntity),
    };
  }

  async rotateTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    apiKeyId: string,
  ): Promise<TenantIntegrationApiKeySecretSummary> {
    await this.assertTenantExists(tenantId);
    const integrationClient = await this.assertTenantIntegrationClient(
      tenantId,
      integrationClientId,
    );
    const apiKey = await this.assertTenantIntegrationApiKey(
      tenantId,
      integrationClient.id,
      apiKeyId,
    );
    const rawApiKey = this.generateIntegrationApiKey();

    apiKey.keyHash = this.hashIntegrationApiKey(rawApiKey);
    apiKey.keyHint = this.buildIntegrationApiKeyHint(rawApiKey);
    apiKey.lastUsedAt = null;

    const savedKey = await this.apiKeyRepository.save(apiKey);
    return {
      apiKey: rawApiKey,
      summary: this.mapTenantIntegrationApiKeySummary({
        ...savedKey,
        integrationClient,
      } as ApiKeyEntity),
    };
  }

  async updateTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    apiKeyId: string,
    dto: {
      label?: string;
      scopes?: string[];
      status?: 'active' | 'disabled';
      expiresAt?: string | null;
    },
  ): Promise<TenantIntegrationApiKeySummary> {
    await this.assertTenantExists(tenantId);
    const integrationClient = await this.assertTenantIntegrationClient(
      tenantId,
      integrationClientId,
    );
    const apiKey = await this.assertTenantIntegrationApiKey(
      tenantId,
      integrationClient.id,
      apiKeyId,
    );
    const normalized = this.normalizeIntegrationApiKeyInput({
      label: dto.label ?? apiKey.label,
      scopes: dto.scopes ?? apiKey.scopes,
      expiresAt:
        dto.expiresAt !== undefined
          ? dto.expiresAt
          : apiKey.expiresAt?.toISOString(),
    });

    apiKey.label = normalized.label;
    apiKey.scopes = normalized.scopes ?? integrationClient.scopes;
    apiKey.expiresAt = normalized.expiresAt;
    if (dto.status !== undefined) {
      apiKey.status = dto.status;
    }

    const savedKey = await this.apiKeyRepository.save(apiKey);
    return this.mapTenantIntegrationApiKeySummary({
      ...savedKey,
      integrationClient,
    } as ApiKeyEntity);
  }

  async listTenantModelAccessRules(
    tenantId: string,
  ): Promise<TenantModelAccessRuleSummary[]> {
    await this.assertTenantExists(tenantId);
    const rules = await this.tenantModelAccessRuleRepository.find({
      where: { tenantId },
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
    });

    return rules.map((rule) => this.mapTenantModelAccessRuleSummary(rule));
  }

  async createTenantModelAccessRule(
    tenantId: string,
    dto: {
      providerId: string;
      modelPattern: string;
      capability: TenantModelAccessCapability;
      effect: TenantModelAccessEffect;
      maxInputTokens?: number;
      maxOutputTokens?: number;
      maxImagesPerRequest?: number;
      maxResolution?: string;
      priority?: number;
    },
  ): Promise<TenantModelAccessRuleSummary> {
    await this.assertTenantExists(tenantId);
    await this.assertProviderExists(dto.providerId);
    const normalizedRule = this.normalizeTenantModelAccessRuleInput(dto);
    const existingRule = await this.tenantModelAccessRuleRepository.findOne({
      where: {
        tenantId,
        providerId: normalizedRule.providerId,
        modelPattern: normalizedRule.modelPattern,
        capability: normalizedRule.capability,
        priority: normalizedRule.priority,
      },
    });
    if (existingRule) {
      throw new ConflictException(
        'A model access rule with the same provider, pattern, capability, and priority already exists for this tenant.',
      );
    }

    const createdRule = await this.tenantModelAccessRuleRepository.save(
      this.tenantModelAccessRuleRepository.create({
        tenantId,
        ...normalizedRule,
      }),
    );

    return this.mapTenantModelAccessRuleSummary(createdRule);
  }

  async updateTenantModelAccessRule(
    tenantId: string,
    ruleId: string,
    dto: {
      providerId?: string;
      modelPattern?: string;
      capability?: TenantModelAccessCapability;
      effect?: TenantModelAccessEffect;
      maxInputTokens?: number;
      maxOutputTokens?: number;
      maxImagesPerRequest?: number;
      maxResolution?: string;
      priority?: number;
    },
  ): Promise<TenantModelAccessRuleSummary> {
    await this.assertTenantExists(tenantId);
    const rule = await this.tenantModelAccessRuleRepository.findOne({
      where: {
        id: ruleId,
        tenantId,
      },
    });
    if (!rule) {
      throw new NotFoundException('Model access rule not found.');
    }

    const providerId = dto.providerId ?? rule.providerId;
    await this.assertProviderExists(providerId);
    const normalizedRule = this.normalizeTenantModelAccessRuleInput({
      providerId,
      modelPattern: dto.modelPattern ?? rule.modelPattern,
      capability: dto.capability ?? rule.capability,
      effect: dto.effect ?? rule.effect,
      maxInputTokens: dto.maxInputTokens ?? rule.maxInputTokens ?? undefined,
      maxOutputTokens:
        dto.maxOutputTokens ?? rule.maxOutputTokens ?? undefined,
      maxImagesPerRequest:
        dto.maxImagesPerRequest ?? rule.maxImagesPerRequest ?? undefined,
      maxResolution: dto.maxResolution ?? rule.maxResolution ?? undefined,
      priority: dto.priority ?? rule.priority,
    });
    const duplicateRule = await this.tenantModelAccessRuleRepository.findOne({
      where: {
        tenantId,
        providerId: normalizedRule.providerId,
        modelPattern: normalizedRule.modelPattern,
        capability: normalizedRule.capability,
        priority: normalizedRule.priority,
      },
    });
    if (duplicateRule && duplicateRule.id !== rule.id) {
      throw new ConflictException(
        'A model access rule with the same provider, pattern, capability, and priority already exists for this tenant.',
      );
    }

    Object.assign(rule, normalizedRule);
    const savedRule = await this.tenantModelAccessRuleRepository.save(rule);
    return this.mapTenantModelAccessRuleSummary(savedRule);
  }

  async deleteTenantModelAccessRule(tenantId: string, ruleId: string) {
    await this.assertTenantExists(tenantId);
    const rule = await this.tenantModelAccessRuleRepository.findOne({
      where: {
        id: ruleId,
        tenantId,
      },
    });
    if (!rule) {
      throw new NotFoundException('Model access rule not found.');
    }

    await this.tenantModelAccessRuleRepository.delete({
      id: ruleId,
      tenantId,
    });
    return { deleted: true as const };
  }

  async listTenantUsageEvents(
    actor: TenantActorLike,
    tenantId: string,
  ): Promise<TenantUsageEventSummary[]> {
    await this.assertTenantUsageAccess(actor, tenantId);
    const events = await this.usageEventRepository.find({
      where: { tenantId },
      order: {
        createdAt: 'DESC',
      },
    });

    return events.map((event) => this.mapTenantUsageEventSummary(event));
  }

  async getTenantUsageSummary(
    actor: TenantActorLike,
    tenantId: string,
  ): Promise<TenantUsageSummary> {
    const events = await this.listTenantUsageEvents(actor, tenantId);
    const windows = this.partitionUsageWindows(events);

    return {
      tenantId,
      requests24h: windows.last24Hours.length,
      requests7d: windows.last7Days.length,
      requests30d: windows.last30Days.length,
      distinctUsers24h: this.countDistinctUsers(windows.last24Hours),
      activeUsers30d: this.countDistinctUsers(windows.last30Days),
      blockedRequests7d: windows.last7Days.filter((event) =>
        this.isBlockedUsageStatus(event.status),
      ).length,
      estimatedCostUsd30d: this.sumUsageCost(windows.last30Days),
    };
  }

  async getTenantUsageByProvider(
    actor: TenantActorLike,
    tenantId: string,
  ): Promise<TenantUsageByProviderSummary[]> {
    const events = await this.listTenantUsageEvents(actor, tenantId);
    const buckets = new Map<string, TenantUsageByProviderSummary>();

    for (const event of this.partitionUsageWindows(events).last30Days) {
      const bucket = buckets.get(event.providerId) ?? {
        providerId: event.providerId,
        requests30d: 0,
        blockedRequests30d: 0,
        estimatedCostUsd30d: '0.000000',
        lastRequestAt: null,
      };

      bucket.requests30d += 1;
      if (this.isBlockedUsageStatus(event.status)) {
        bucket.blockedRequests30d += 1;
      }
      bucket.estimatedCostUsd30d = this.addCostStrings(
        bucket.estimatedCostUsd30d,
        event.costEstimateUsd,
      );
      if (!bucket.lastRequestAt || event.createdAt > bucket.lastRequestAt) {
        bucket.lastRequestAt = event.createdAt;
      }

      buckets.set(event.providerId, bucket);
    }

    return [...buckets.values()].sort((left, right) => {
      if (left.requests30d !== right.requests30d) {
        return right.requests30d - left.requests30d;
      }

      return left.providerId.localeCompare(right.providerId);
    });
  }

  async getTenantUsageByModel(
    actor: TenantActorLike,
    tenantId: string,
  ): Promise<TenantUsageByModelSummary[]> {
    const events = await this.listTenantUsageEvents(actor, tenantId);
    const buckets = new Map<string, TenantUsageByModelSummary>();

    for (const event of this.partitionUsageWindows(events).last30Days) {
      const bucketKey = `${event.providerId}:${event.model}:${event.capability ?? 'unknown'}`;
      const bucket = buckets.get(bucketKey) ?? {
        providerId: event.providerId,
        model: event.model,
        capability: event.capability,
        requests30d: 0,
        blockedRequests30d: 0,
        estimatedCostUsd30d: '0.000000',
        lastRequestAt: null,
      };

      bucket.requests30d += 1;
      if (this.isBlockedUsageStatus(event.status)) {
        bucket.blockedRequests30d += 1;
      }
      bucket.estimatedCostUsd30d = this.addCostStrings(
        bucket.estimatedCostUsd30d,
        event.costEstimateUsd,
      );
      if (!bucket.lastRequestAt || event.createdAt > bucket.lastRequestAt) {
        bucket.lastRequestAt = event.createdAt;
      }

      buckets.set(bucketKey, bucket);
    }

    return [...buckets.values()].sort((left, right) => {
      if (left.requests30d !== right.requests30d) {
        return right.requests30d - left.requests30d;
      }

      const providerCompare = left.providerId.localeCompare(right.providerId);
      if (providerCompare !== 0) {
        return providerCompare;
      }

      return left.model.localeCompare(right.model);
    });
  }

  async listUsers(actor?: TenantActorLike) {
    const resolvedActor = actor
      ? await this.resolveActor(actor)
      : await this.getDefaultTenantActor();
    const memberships = await this.tenantMembershipRepository.find({
      where: { tenantId: resolvedActor.activeTenantId },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const usersById = new Map<string, UserEntity>();
    for (const membership of memberships) {
      if (membership.user) {
        usersById.set(membership.user.id, membership.user);
      }
    }

    const roleMap = await this.getTenantRoleMap(
      resolvedActor.activeTenantId,
      [...usersById.keys()],
    );

    return [...usersById.values()].map((user) =>
      this.mapUserSummary(
        user,
        resolvedActor.activeTenantId,
        roleMap.get(user.id) ?? [],
      ),
    );
  }

  async updateUser(
    actor: TenantActorLike,
    userUuid: string,
    dto: UpdateUserDto,
  ): Promise<ReturnType<AdminService['mapUserSummary']> | undefined>;
  async updateUser(
    userUuid: string,
    dto: UpdateUserDto,
  ): Promise<ReturnType<AdminService['mapUserSummary']> | undefined>;
  async updateUser(
    actorOrUserUuid: TenantActorLike | string,
    userUuidOrDto: string | UpdateUserDto,
    maybeDto?: UpdateUserDto,
  ) {
    const actor =
      typeof actorOrUserUuid === 'string'
        ? await this.getDefaultTenantActor()
        : await this.resolveActor(actorOrUserUuid);
    const userUuid =
      typeof actorOrUserUuid === 'string'
        ? actorOrUserUuid
        : (userUuidOrDto as string);
    const dto =
      typeof actorOrUserUuid === 'string'
        ? (userUuidOrDto as UpdateUserDto)
        : maybeDto!;

    return this.updateUserInTenant(actor.activeTenantId, userUuid, dto);
  }

  async updateTenantUser(
    tenantId: string,
    userUuid: string,
    dto: UpdateUserDto,
  ) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return this.updateUserInTenant(tenantId, userUuid, dto);
  }

  async updateUserGlobalRoles(
    actor: TenantActorLike,
    userUuid: string,
    dto: {
      globalRoles: GlobalRole[];
    },
  ) {
    const resolvedActor = await this.resolveActor(actor);
    const user = await this.userRepository.findOne({
      where: { userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const nextGlobalRoles = dto.globalRoles.filter(
      (role): role is GlobalRole => role === 'super_admin',
    );
    const currentGlobalRoles =
      (await this.getUserGlobalRoleMap([user.id])).get(user.id) ?? [];
    const currentlySuperAdmin = currentGlobalRoles.includes('super_admin');
    const nextIsSuperAdmin = nextGlobalRoles.includes('super_admin');

    if (
      currentlySuperAdmin &&
      !nextIsSuperAdmin &&
      resolvedActor.userUuid === userUuid
    ) {
      throw new ForbiddenException(
        'A super-admin cannot remove their own global access.',
      );
    }

    const superAdminRole = await this.roleRepository.findOne({
      where: { name: 'super_admin' },
    });
    if (!superAdminRole) {
      throw new NotFoundException('Global role not found.');
    }

    const existingUserRole = await this.userRoleRepository.findOne({
      where: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    if (nextIsSuperAdmin && !existingUserRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: user.id,
          roleId: superAdminRole.id,
        }),
      );
    }

    if (!nextIsSuperAdmin && existingUserRole) {
      await this.userRoleRepository.delete({
        userId: user.id,
        roleId: superAdminRole.id,
      });
    }

    return {
      userUuid: user.userUuid,
      globalRoles: nextGlobalRoles,
    };
  }

  private async updateUserInTenant(
    tenantId: string,
    userUuid: string,
    dto: UpdateUserDto,
  ) {
    const user = await this.assertTenantScopedUser(tenantId, userUuid);
    const globalRoles =
      (await this.getUserGlobalRoleMap([user.id])).get(user.id) ?? [];
    if (
      globalRoles.includes('super_admin') &&
      (dto.roles !== undefined || dto.status !== undefined)
    ) {
      throw new ForbiddenException(
        'Global super-admin users cannot be downgraded or disabled from tenant workflows.',
      );
    }

    if (dto.displayName) {
      user.displayName = dto.displayName;
    }

    if (dto.status) {
      user.status = dto.status;
    }

    if (dto.password) {
      user.passwordHash = await this.passwordService.hashPassword(dto.password);
    }

    await this.userRepository.save(user);

    if (dto.roles) {
      await this.tenantMembershipRepository.delete({
        tenantId,
        userId: user.id,
      });
      await this.tenantMembershipRepository.save(
        dto.roles.map((role) =>
          this.tenantMembershipRepository.create({
            tenantId,
            userId: user.id,
            role,
          }),
        ),
      );
    }

    return this.mapUserSummary(
      user,
      tenantId,
      dto.roles ?? (await this.getTenantRoles(tenantId, user.id)),
      globalRoles,
    );
  }

  async listProviderCredentialsForUser(
    actor: TenantActorLike,
    userUuid: string,
  ): Promise<
    Array<{
      id: string;
      userUuid: string;
      providerId: ProviderId;
      providerDisplayName: string;
      label: string;
      scope: 'tenant' | 'user';
      maskedHint: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      lastUsedAt: Date | null;
    }>
  >;
  async listProviderCredentialsForUser(userUuid: string): Promise<
    Array<{
      id: string;
      userUuid: string;
      providerId: ProviderId;
      providerDisplayName: string;
      label: string;
      scope: 'tenant' | 'user';
      maskedHint: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      lastUsedAt: Date | null;
    }>
  >;
  async listProviderCredentialsForUser(
    actorOrUserUuid: TenantActorLike | string,
    maybeUserUuid?: string,
  ) {
    const actor =
      typeof actorOrUserUuid === 'string'
        ? await this.getDefaultTenantActor()
        : await this.resolveActor(actorOrUserUuid);
    const userUuid =
      typeof actorOrUserUuid === 'string' ? actorOrUserUuid : maybeUserUuid!;
    const user = await this.assertTenantScopedUser(actor.activeTenantId, userUuid);
    const credentials = await this.withCredentialRepository(
      actor.activeTenantId,
      (credentialRepository) =>
        credentialRepository.find({
          where: [
            {
              tenantId: actor.activeTenantId,
              userId: user.id,
            },
            {
              tenantId: actor.activeTenantId,
              userId: IsNull(),
              scope: 'tenant',
            },
          ],
          relations: {
            provider: true,
          },
          order: {
            createdAt: 'DESC',
          },
        }),
    );
    const providerIds = new Set(
      credentials
        .map((credential) => credential.providerId)
        .filter((providerId): providerId is string => Boolean(providerId)),
    );
    const providerMap = new Map(
      (
        await this.providerRepository.find({
          where: [...providerIds].map((providerId) => ({ id: providerId })),
        })
      ).map((provider) => [provider.id, provider]),
    );

    return credentials.map((credential) => ({
      id: credential.id,
      userUuid,
      providerId:
        credential.provider?.providerId ??
        providerMap.get(credential.providerId)?.providerId ??
        credential.providerId,
      providerDisplayName:
        credential.provider?.displayName ??
        providerMap.get(credential.providerId)?.displayName ??
        'Unknown provider',
      label: credential.label,
      scope: credential.scope,
      maskedHint: credential.maskedHint,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      lastUsedAt: credential.lastUsedAt,
    }));
  }

  async storeProviderCredential(dto: StoreProviderCredentialDto) {
    const actor = await this.getDefaultTenantActor();
    return this.storeProviderCredentialForActor(actor, {
      ...dto,
      userUuid: dto.userUuid ?? actor.userUuid,
      scope: dto.scope ?? 'user',
    });
  }

  async storeProviderCredentialForActor(
    actorLike: TenantActorLike,
    dto: StoreProviderCredentialDto,
  ) {
    const actor = await this.resolveActor(actorLike);
    const scope = dto.scope ?? (dto.userUuid ? 'user' : 'tenant');
    if (scope === 'user' && !dto.userUuid) {
      dto = { ...dto, userUuid: actor.userUuid };
    }

    if (scope === 'tenant' && dto.userUuid) {
      throw new BadRequestException(
        'Tenant-scoped credentials cannot target an individual user.',
      );
    }

    if (scope === 'user') {
      const targetUserUuid = dto.userUuid ?? actor.userUuid;
      const isOwnCredential = targetUserUuid === actor.userUuid;
      const isPrivileged =
        actor.roles.includes('tenant_admin') || actor.roles.includes('operator');

      if (!isOwnCredential && !isPrivileged) {
        throw new ForbiddenException(
          'You cannot manage another user provider credential.',
        );
      }
    } else if (!actor.roles.includes('tenant_admin')) {
      throw new ForbiddenException(
        'Only tenant administrators can manage tenant credentials.',
      );
    }

    return this.storeProviderCredentialInternal(actor.activeTenantId, {
      ...dto,
      scope,
    });
  }

  async updateOwnProviderCredential(
    actorLike: TenantActorLike,
    credentialId: string,
    dto: UpdateProviderCredentialDto,
  ) {
    const actor = await this.resolveActor(actorLike);
    const user = await this.assertTenantScopedUser(
      actor.activeTenantId,
      actor.userUuid,
    );
    const credential = await this.withCredentialRepository(
      actor.activeTenantId,
      (credentialRepository) =>
        credentialRepository.findOne({
          where: [
            {
              id: credentialId,
              tenantId: actor.activeTenantId,
              userId: user.id,
              scope: 'user',
            },
            {
              id: credentialId,
              tenantId: actor.activeTenantId,
              userId: IsNull(),
              scope: 'tenant',
            },
          ],
          relations: {
            provider: true,
          },
        }),
    );
    if (!credential) {
      throw new NotFoundException('Unable to update the provider credential.');
    }

    if (
      credential.scope === 'tenant' &&
      !actor.roles.some((role) => role === 'tenant_admin' || role === 'operator')
    ) {
      throw new ForbiddenException(
        'Only tenant administrators can manage tenant credentials.',
      );
    }

    const provider =
      credential.provider ??
      (await this.providerRepository.findOne({
        where: { id: credential.providerId },
      }));
    if (!provider) {
      throw new NotFoundException('Unable to update the provider credential.');
    }

    const nextLabel = dto.label?.trim() ?? credential.label;
    if (nextLabel !== credential.label) {
      const credentialUserId =
        credential.scope === 'tenant' ? IsNull() : user.id;
      const duplicateCredential = await this.withCredentialRepository(
        actor.activeTenantId,
        (credentialRepository) =>
          credentialRepository.findOne({
            where: {
              tenantId: actor.activeTenantId,
              userId: credentialUserId,
              providerId: credential.providerId,
              label: nextLabel,
              scope: credential.scope,
            },
          }),
      );

      if (duplicateCredential && duplicateCredential.id !== credential.id) {
        throw new ConflictException(
          'Unable to update the provider credential.',
        );
      }
      credential.label = nextLabel;
    }

    if (dto.apiToken?.trim() || dto.baseUrl?.trim()) {
      const providerAccess = this.createProviderAccess(
        dto,
        provider.providerId,
        credential,
      );
      const encrypted = this.encryptionService.encrypt(
        JSON.stringify(providerAccess),
      );
      credential.encryptedSecret = encrypted.ciphertext;
      credential.iv = encrypted.iv;
      credential.authTag = encrypted.authTag;
      credential.keyVersion = encrypted.keyVersion;
      credential.maskedHint = this.maskProviderAccess(providerAccess);
    }

    await this.withCredentialRepository(actor.activeTenantId, (credentialRepository) =>
      credentialRepository.save(credential),
    );

    return {
      id: credential.id,
      userUuid: credential.scope === 'tenant' ? actor.userUuid : user.userUuid,
      providerId: provider.providerId,
      providerDisplayName: provider.displayName,
      label: credential.label,
      scope: credential.scope,
      maskedHint: credential.maskedHint,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      lastUsedAt: credential.lastUsedAt,
    };
  }

  async getProviderSettingsForUser(
    actor: TenantActorLike,
    userUuid: string,
  ): Promise<Record<string, unknown>>;
  async getProviderSettingsForUser(
    userUuid: string,
  ): Promise<Record<string, unknown>>;
  async getProviderSettingsForUser(
    actorOrUserUuid: TenantActorLike | string,
    maybeUserUuid?: string,
  ) {
    const actor =
      typeof actorOrUserUuid === 'string'
        ? await this.getDefaultTenantActor()
        : await this.resolveActor(actorOrUserUuid);
    const userUuid =
      typeof actorOrUserUuid === 'string' ? actorOrUserUuid : maybeUserUuid!;
    const user = await this.assertTenantScopedUser(actor.activeTenantId, userUuid);

    return {
      userUuid: user.userUuid,
      tenantId: actor.activeTenantId,
      tenantSlug: actor.activeTenantSlug,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
      defaultImageProviderId: user.defaultImageProviderId,
      defaultImageModel: user.defaultImageModel,
    };
  }

  async updateProviderSettingsForUser(
    actor: TenantActorLike,
    userUuid: string,
    dto: UpdateProviderSettingsDto,
  ): Promise<Record<string, unknown>>;
  async updateProviderSettingsForUser(
    userUuid: string,
    dto: UpdateProviderSettingsDto,
  ): Promise<Record<string, unknown>>;
  async updateProviderSettingsForUser(
    actorOrUserUuid: TenantActorLike | string,
    userUuidOrDto: string | UpdateProviderSettingsDto,
    maybeDto?: UpdateProviderSettingsDto,
  ) {
    const actor =
      typeof actorOrUserUuid === 'string'
        ? await this.getDefaultTenantActor()
        : await this.resolveActor(actorOrUserUuid);
    const userUuid =
      typeof actorOrUserUuid === 'string'
        ? actorOrUserUuid
        : (userUuidOrDto as string);
    const dto =
      typeof actorOrUserUuid === 'string'
        ? (userUuidOrDto as UpdateProviderSettingsDto)
        : maybeDto!;
    const user = await this.assertTenantScopedUser(actor.activeTenantId, userUuid);
    const providerIdWasUpdated = Object.prototype.hasOwnProperty.call(
      dto,
      'defaultProviderId',
    );
    const modelWasUpdated = Object.prototype.hasOwnProperty.call(
      dto,
      'defaultModel',
    );
    const imageProviderIdWasUpdated = Object.prototype.hasOwnProperty.call(
      dto,
      'defaultImageProviderId',
    );
    const imageModelWasUpdated = Object.prototype.hasOwnProperty.call(
      dto,
      'defaultImageModel',
    );

    if (providerIdWasUpdated) {
      if (dto.defaultProviderId === null) {
        user.defaultProviderId = null;
        user.defaultModel = null;
      } else {
        await this.assertActiveCredentialExists(
          actor.activeTenantId,
          user.id,
          dto.defaultProviderId as ProviderId,
        );
        user.defaultProviderId = dto.defaultProviderId ?? null;
        if (!modelWasUpdated) {
          user.defaultModel = null;
        }
      }
    }

    if (modelWasUpdated) {
      if (dto.defaultModel === null) {
        user.defaultModel = null;
      } else if (!user.defaultProviderId) {
        throw new ConflictException('Unable to update provider settings.');
      } else {
        user.defaultModel = dto.defaultModel?.trim() ?? null;
      }
    }

    if (imageProviderIdWasUpdated) {
      if (dto.defaultImageProviderId === null) {
        user.defaultImageProviderId = null;
        user.defaultImageModel = null;
      } else {
        await this.assertActiveCredentialExists(
          actor.activeTenantId,
          user.id,
          dto.defaultImageProviderId as ProviderId,
        );
        user.defaultImageProviderId = dto.defaultImageProviderId ?? null;
        if (!imageModelWasUpdated) {
          user.defaultImageModel = null;
        }
      }
    }

    if (imageModelWasUpdated) {
      if (dto.defaultImageModel === null) {
        user.defaultImageModel = null;
      } else if (!user.defaultImageProviderId) {
        throw new ConflictException('Unable to update provider settings.');
      } else {
        user.defaultImageModel = dto.defaultImageModel?.trim() ?? null;
      }
    }

    await this.userRepository.save(user);

    return {
      userUuid: user.userUuid,
      tenantId: actor.activeTenantId,
      tenantSlug: actor.activeTenantSlug,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
      defaultImageProviderId: user.defaultImageProviderId,
      defaultImageModel: user.defaultImageModel,
    };
  }

  private async storeProviderCredentialInternal(
    tenantId: string,
    dto: StoreProviderCredentialDto & { scope: 'tenant' | 'user' },
  ) {
    const user =
      dto.scope === 'user'
        ? await this.assertTenantScopedUser(tenantId, dto.userUuid!)
        : null;

    const provider = await this.providerRepository.findOne({
      where: { providerId: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Unable to store the provider credential.');
    }

    const existingCredential = await this.withCredentialRepository(
      tenantId,
      (credentialRepository) =>
        credentialRepository.findOne({
          where: {
            tenantId,
            userId: user?.id ?? IsNull(),
            providerId: provider.id,
            label: dto.label,
          },
        }),
    );
    if (existingCredential) {
      throw new ConflictException('Unable to store the provider credential.');
    }

    const providerAccess = this.createProviderAccess(dto, provider.providerId);
    const encrypted = this.encryptionService.encrypt(
      JSON.stringify(providerAccess),
    );
    const maskedHint = this.maskProviderAccess(providerAccess);

    const credential = this.credentialRepository.create({
      tenantId,
      userId: user?.id ?? null,
      providerId: provider.id,
      scope: dto.scope,
      label: dto.label,
      encryptedSecret: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
      isActive: true,
      maskedHint,
    });

    await this.withCredentialRepository(tenantId, (credentialRepository) =>
      credentialRepository.save(credential),
    );

    return {
      id: credential.id,
      tenantId,
      userUuid: user?.userUuid ?? null,
      providerId: provider.providerId,
      label: credential.label,
      scope: credential.scope,
      maskedHint: credential.maskedHint,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    };
  }

  private async assertTenantScopedUser(tenantId: string, userUuid: string) {
    const user = await this.userRepository.findOne({
      where: { userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const membership = await this.tenantMembershipRepository.findOne({
      where: {
        tenantId,
        userId: user.id,
      },
    });
    if (!membership) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private async getTenantRoleMap(tenantId: string, userIds: string[]) {
    const roleMap = new Map<string, TenantRole[]>();
    if (!userIds.length) {
      return roleMap;
    }

    const memberships = await this.tenantMembershipRepository.find({
      where: userIds.map((userId) => ({ tenantId, userId })),
    });
    for (const membership of memberships) {
      const roles = roleMap.get(membership.userId);
      if (roles) {
        roles.push(membership.role);
      } else {
        roleMap.set(membership.userId, [membership.role]);
      }
    }

    return roleMap;
  }

  private async getTenantRoles(tenantId: string, userId: string) {
    const memberships = await this.tenantMembershipRepository.find({
      where: { tenantId, userId },
    });
    return memberships.map((membership) => membership.role);
  }

  private async getUserGlobalRoleMap(userIds: string[]) {
    const roleMap = new Map<string, GlobalRole[]>();
    if (!userIds.length) {
      return roleMap;
    }

    const userRoles = await this.userRoleRepository.find({
      where: userIds.map((userId) => ({ userId })),
      relations: {
        role: true,
      },
    });
    for (const userRole of userRoles) {
      const roleName = userRole.role?.name;
      if (roleName !== 'super_admin') {
        continue;
      }

      const roles = roleMap.get(userRole.userId);
      if (roles) {
        roles.push(roleName);
      } else {
        roleMap.set(userRole.userId, [roleName]);
      }
    }

    return roleMap;
  }

  private async getTenantMembershipCounts(tenantIds: string[]) {
    const counts = new Map<string, number>();
    if (!tenantIds.length) {
      return counts;
    }

    const memberships = await this.tenantMembershipRepository.find({
      where: tenantIds.map((tenantId) => ({ tenantId })),
    });
    const distinctMembershipKeys = new Set<string>();

    for (const membership of memberships) {
      const distinctKey = `${membership.tenantId}:${membership.userId}`;
      if (distinctMembershipKeys.has(distinctKey)) {
        continue;
      }

      distinctMembershipKeys.add(distinctKey);
      counts.set(membership.tenantId, (counts.get(membership.tenantId) ?? 0) + 1);
    }

    return counts;
  }

  private async assertTenantUsageAccess(
    actor: TenantActorLike,
    tenantId: string,
  ): Promise<TenantActor> {
    const resolvedActor = await this.resolveActor(actor);
    await this.assertTenantExists(tenantId);

    if (resolvedActor.globalRoles?.includes('super_admin')) {
      return resolvedActor;
    }

    if (resolvedActor.activeTenantId !== tenantId) {
      throw new ForbiddenException(
        'Usage analytics are only available inside the active tenant context.',
      );
    }

    if (
      !resolvedActor.roles.includes('tenant_admin') &&
      !resolvedActor.roles.includes('operator')
    ) {
      throw new ForbiddenException(
        'Usage analytics require tenant_admin or operator access.',
      );
    }

    return resolvedActor;
  }

  private async assertTenantExists(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }

  private async assertProviderExists(providerId: string) {
    const provider = await this.providerRepository.findOne({
      where: { providerId: providerId as ProviderId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }

    return provider;
  }

  private async assertTenantIntegrationClient(
    tenantId: string,
    integrationClientId: string,
  ) {
    const integrationClient = await this.integrationClientRepository.findOne({
      where: {
        tenantId,
        id: integrationClientId,
      },
      relations: {
        defaultUser: true,
        apiKeys: true,
      },
    });
    if (!integrationClient) {
      throw new NotFoundException('Integration client not found.');
    }

    return integrationClient;
  }

  private async assertTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    apiKeyId: string,
  ) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: {
        tenantId,
        integrationClientId,
        id: apiKeyId,
      },
      relations: {
        integrationClient: true,
      },
    });
    if (!apiKey) {
      throw new NotFoundException('Integration API key not found.');
    }

    return apiKey;
  }

  private async getResolvedTenantProviderConfiguration(
    tenant: TenantEntity,
    provider: ProviderEntity,
  ): Promise<TenantProviderConfigurationSummary> {
    const configuration =
      await this.tenantProviderConfigurationRepository.findOne({
        where: {
          tenantId: tenant.id,
          providerId: provider.id,
        },
      });

    return this.mapTenantProviderConfigurationSummary(
      tenant,
      provider,
      configuration,
    );
  }

  private mapTenantProviderConfigurationSummary(
    tenant: TenantEntity,
    provider: ProviderEntity,
    configuration: TenantProviderConfigurationEntity | null,
  ): TenantProviderConfigurationSummary {
    const implicitDefaults = this.getImplicitTenantProviderConfiguration(tenant);
    return {
      id: configuration?.id ?? null,
      tenantId: tenant.id,
      providerId: provider.providerId,
      providerDisplayName: provider.displayName,
      providerStatus: provider.status,
      enabled: configuration?.enabled ?? provider.status === 'active',
      defaultTextModel: configuration?.defaultTextModel ?? null,
      defaultImageModel: configuration?.defaultImageModel ?? null,
      credentialMode:
        configuration?.credentialMode ?? implicitDefaults.credentialMode,
      preferUserCredentials:
        configuration?.preferUserCredentials ??
        implicitDefaults.preferUserCredentials,
      allowPlatformFallback:
        configuration?.allowPlatformFallback ??
        implicitDefaults.allowPlatformFallback,
      allowTenantFallback:
        configuration?.allowTenantFallback ?? implicitDefaults.allowTenantFallback,
      createdAt: configuration?.createdAt ?? null,
      updatedAt: configuration?.updatedAt ?? null,
    };
  }

  private mapTenantPolicySummary(
    tenantId: string,
    policy: TenantPolicyEntity | null,
  ): TenantPolicySummary {
    const defaults = this.getDefaultTenantPolicy();

    return {
      tenantId,
      monthlyBudgetUsd: policy?.monthlyBudgetUsd ?? defaults.monthlyBudgetUsd,
      dailyRequestLimit: policy?.dailyRequestLimit ?? defaults.dailyRequestLimit,
      monthlyRequestLimit:
        policy?.monthlyRequestLimit ?? defaults.monthlyRequestLimit,
      requestsPerMinute:
        policy?.requestsPerMinute ?? defaults.requestsPerMinute,
      tokensPerMinute: policy?.tokensPerMinute ?? defaults.tokensPerMinute,
      monthlyTokenLimit:
        policy?.monthlyTokenLimit ?? defaults.monthlyTokenLimit,
      imageRequestsPerMonth:
        policy?.imageRequestsPerMonth ?? defaults.imageRequestsPerMonth,
      maxInputTokens: policy?.maxInputTokens ?? defaults.maxInputTokens,
      maxOutputTokens: policy?.maxOutputTokens ?? defaults.maxOutputTokens,
      allowPromptLogging:
        policy?.allowPromptLogging ?? defaults.allowPromptLogging,
      allowResponseLogging:
        policy?.allowResponseLogging ?? defaults.allowResponseLogging,
      retentionDays: policy?.retentionDays ?? defaults.retentionDays,
      createdAt: policy?.createdAt ?? null,
      updatedAt: policy?.updatedAt ?? null,
    };
  }

  private mapTenantIntegrationClientSummary(
    client: IntegrationClientEntity,
  ): TenantIntegrationClientSummary {
    return {
      id: client.id,
      tenantId: client.tenantId,
      clientId: client.clientId,
      displayName: client.displayName,
      applicationId: client.applicationId,
      defaultUserUuid: client.defaultUser?.userUuid ?? null,
      defaultUserDisplayName: client.defaultUser?.displayName ?? null,
      scopes: [...client.scopes].sort(),
      trustedForwardedIdentityEnabled:
        client.trustedForwardedIdentityEnabled,
      status: client.status,
      apiKeyCount: client.apiKeys?.length ?? 0,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  private mapTenantIntegrationApiKeySummary(
    apiKey: ApiKeyEntity,
  ): TenantIntegrationApiKeySummary {
    return {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      integrationClientId: apiKey.integrationClientId,
      integrationClientClientId: apiKey.integrationClient?.clientId ?? 'unknown',
      label: apiKey.label,
      keyHint: apiKey.keyHint,
      scopes: [...apiKey.scopes].sort(),
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }

  private getDefaultTenantPolicy(): Omit<
    TenantPolicySummary,
    'tenantId' | 'createdAt' | 'updatedAt'
  > {
    return {
      monthlyBudgetUsd: null,
      dailyRequestLimit: null,
      monthlyRequestLimit: null,
      requestsPerMinute: 60,
      tokensPerMinute: 100000,
      monthlyTokenLimit: null,
      imageRequestsPerMonth: null,
      maxInputTokens: null,
      maxOutputTokens: null,
      allowPromptLogging: false,
      allowResponseLogging: false,
      retentionDays: 30,
    };
  }

  private getImplicitTenantProviderConfiguration(
    tenant: TenantEntity,
  ): Omit<
    TenantProviderConfigurationSummary,
    | 'id'
    | 'tenantId'
    | 'providerId'
    | 'providerDisplayName'
    | 'providerStatus'
    | 'enabled'
    | 'defaultTextModel'
    | 'defaultImageModel'
    | 'createdAt'
    | 'updatedAt'
  > {
    return {
      credentialMode: tenant.allowUserCredentialOverride ? 'hybrid' : 'tenant_byok',
      preferUserCredentials: tenant.allowUserCredentialOverride,
      allowPlatformFallback: false,
      allowTenantFallback: true,
    };
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

  private normalizeTenantModelAccessRuleInput(dto: {
    providerId: string;
    modelPattern: string;
    capability: TenantModelAccessCapability;
    effect: TenantModelAccessEffect;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    maxImagesPerRequest?: number;
    maxResolution?: string | null;
    priority?: number;
  }) {
    return {
      providerId: dto.providerId.trim() as ProviderId,
      modelPattern: dto.modelPattern.trim(),
      capability: dto.capability,
      effect: dto.effect,
      maxInputTokens: dto.maxInputTokens ?? null,
      maxOutputTokens: dto.maxOutputTokens ?? null,
      maxImagesPerRequest: dto.maxImagesPerRequest ?? null,
      maxResolution: dto.maxResolution?.trim() || null,
      priority: dto.priority ?? 100,
    };
  }

  private mapTenantModelAccessRuleSummary(
    rule: TenantModelAccessRuleEntity,
  ): TenantModelAccessRuleSummary {
    return {
      id: rule.id,
      tenantId: rule.tenantId,
      providerId: rule.providerId as ProviderId,
      modelPattern: rule.modelPattern,
      capability: rule.capability,
      effect: rule.effect,
      maxInputTokens: rule.maxInputTokens,
      maxOutputTokens: rule.maxOutputTokens,
      maxImagesPerRequest: rule.maxImagesPerRequest,
      maxResolution: rule.maxResolution,
      priority: rule.priority,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private normalizeTenantProviderConfigurationSettings(dto: {
    enabled: boolean;
    defaultTextModel?: string;
    defaultImageModel?: string;
    credentialMode: TenantProviderCredentialMode;
    preferUserCredentials: boolean;
    allowPlatformFallback: boolean;
    allowTenantFallback: boolean;
  }) {
    const defaultTextModel = dto.defaultTextModel?.trim() || null;
    const defaultImageModel = dto.defaultImageModel?.trim() || null;

    if (dto.credentialMode === 'platform_default') {
      return {
        enabled: dto.enabled,
        defaultTextModel,
        defaultImageModel,
        credentialMode: dto.credentialMode,
        preferUserCredentials: false,
        allowPlatformFallback: true,
        allowTenantFallback: false,
      };
    }

    if (dto.credentialMode === 'tenant_byok') {
      return {
        enabled: dto.enabled,
        defaultTextModel,
        defaultImageModel,
        credentialMode: dto.credentialMode,
        preferUserCredentials: false,
        allowPlatformFallback: dto.allowPlatformFallback,
        allowTenantFallback: true,
      };
    }

    if (dto.credentialMode === 'user_byok') {
      return {
        enabled: dto.enabled,
        defaultTextModel,
        defaultImageModel,
        credentialMode: dto.credentialMode,
        preferUserCredentials: true,
        allowPlatformFallback: dto.allowPlatformFallback,
        allowTenantFallback: dto.allowTenantFallback,
      };
    }

    return {
      enabled: dto.enabled,
      defaultTextModel,
      defaultImageModel,
      credentialMode: dto.credentialMode,
      preferUserCredentials: dto.preferUserCredentials,
      allowPlatformFallback: dto.allowPlatformFallback,
      allowTenantFallback: dto.allowTenantFallback,
    };
  }

  private normalizeTenantPolicyInput(dto: {
    monthlyBudgetUsd?: string;
    dailyRequestLimit?: number;
    monthlyRequestLimit?: number;
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    monthlyTokenLimit?: number;
    imageRequestsPerMonth?: number;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    allowPromptLogging?: boolean;
    allowResponseLogging?: boolean;
    retentionDays?: number;
  }) {
    const defaults = this.getDefaultTenantPolicy();

    return {
      monthlyBudgetUsd: dto.monthlyBudgetUsd?.trim() || null,
      dailyRequestLimit: dto.dailyRequestLimit ?? null,
      monthlyRequestLimit: dto.monthlyRequestLimit ?? null,
      requestsPerMinute: dto.requestsPerMinute ?? defaults.requestsPerMinute,
      tokensPerMinute: dto.tokensPerMinute ?? defaults.tokensPerMinute,
      monthlyTokenLimit: dto.monthlyTokenLimit ?? null,
      imageRequestsPerMonth: dto.imageRequestsPerMonth ?? null,
      maxInputTokens: dto.maxInputTokens ?? null,
      maxOutputTokens: dto.maxOutputTokens ?? null,
      allowPromptLogging:
        dto.allowPromptLogging ?? defaults.allowPromptLogging,
      allowResponseLogging:
        dto.allowResponseLogging ?? defaults.allowResponseLogging,
      retentionDays: dto.retentionDays ?? defaults.retentionDays,
    };
  }

  private async normalizeIntegrationClientInput(
    tenantId: string,
    dto: {
      clientId: string;
      displayName: string;
      applicationId: string;
      defaultUserUuid?: string;
      scopes: string[];
      trustedForwardedIdentityEnabled: boolean;
    },
  ) {
    const defaultUser =
      dto.defaultUserUuid && dto.defaultUserUuid.trim()
        ? await this.assertTenantScopedUser(tenantId, dto.defaultUserUuid.trim())
        : null;

    return {
      clientId: dto.clientId.trim(),
      displayName: dto.displayName.trim(),
      applicationId: dto.applicationId.trim(),
      defaultUser,
      scopes: [...new Set(dto.scopes)].sort(),
      trustedForwardedIdentityEnabled: dto.trustedForwardedIdentityEnabled,
    };
  }

  private normalizeIntegrationApiKeyInput(dto: {
    label: string;
    scopes?: string[];
    expiresAt?: string | null;
  }) {
    return {
      label: dto.label.trim(),
      scopes:
        dto.scopes === undefined
          ? undefined
          : [...new Set(dto.scopes)].sort(),
      expiresAt:
        dto.expiresAt && dto.expiresAt.trim()
          ? new Date(dto.expiresAt)
          : null,
    };
  }

  private async tryResolveTenantScopedUser(tenantId: string, userUuid: string) {
    try {
      return await this.assertTenantScopedUser(tenantId, userUuid);
    } catch {
      return null;
    }
  }

  private async hasActiveCredential(
    tenantId: string,
    userId: string | null,
    providerId: string,
    scope: 'tenant' | 'user',
  ): Promise<boolean> {
    const credential = await this.withCredentialRepository(
      tenantId,
      (credentialRepository) =>
        credentialRepository.findOne({
          where: {
            tenantId,
            userId: userId ?? IsNull(),
            providerId,
            scope,
            isActive: true,
          },
        }),
    );

    return credential !== null;
  }

  private resolveCredentialScopeForConfiguration(
    configuration: TenantProviderConfigurationSummary,
    availability: {
      userCredentialAvailable: boolean;
      tenantCredentialAvailable: boolean;
      platformCredentialAvailable: boolean;
    },
  ): 'user' | 'tenant' | 'platform' | null {
    if (!configuration.enabled || configuration.providerStatus !== 'active') {
      return null;
    }

    if (configuration.credentialMode === 'platform_default') {
      return availability.platformCredentialAvailable ? 'platform' : null;
    }

    const useUserFirst =
      configuration.credentialMode === 'user_byok' ||
      (configuration.credentialMode === 'hybrid' &&
        configuration.preferUserCredentials);

    if (useUserFirst && availability.userCredentialAvailable) {
      return 'user';
    }

    if (configuration.allowTenantFallback && availability.tenantCredentialAvailable) {
      return 'tenant';
    }

    if (
      !useUserFirst &&
      configuration.credentialMode === 'hybrid' &&
      availability.userCredentialAvailable
    ) {
      return 'user';
    }

    if (
      configuration.allowPlatformFallback &&
      availability.platformCredentialAvailable
    ) {
      return 'platform';
    }

    return null;
  }

  private buildTenantProviderConfigurationTestMessage(input: {
    configuration: TenantProviderConfigurationSummary;
    canResolve: boolean;
    resolvedCredentialScope: 'user' | 'tenant' | 'platform' | null;
    testedUserUuid: string | null;
    userCredentialAvailable: boolean;
    tenantCredentialAvailable: boolean;
    platformCredentialAvailable: boolean;
  }) {
    if (!input.configuration.enabled) {
      return 'Provider access is disabled for this tenant.';
    }

    if (input.configuration.providerStatus !== 'active') {
      return 'Provider is globally disabled and cannot be used by this tenant.';
    }

    if (input.canResolve && input.resolvedCredentialScope) {
      if (input.resolvedCredentialScope === 'user') {
        return `Resolved user-scoped BYOK credentials for ${input.testedUserUuid}.`;
      }

      if (input.resolvedCredentialScope === 'tenant') {
        return 'Resolved tenant-scoped BYOK credentials for this provider.';
      }

      return 'Resolved platform-level provider credentials for this tenant.';
    }

    if (
      input.configuration.credentialMode === 'user_byok' &&
      !input.userCredentialAvailable
    ) {
      return input.testedUserUuid
        ? `No active user-scoped BYOK credential is configured for ${input.testedUserUuid}.`
        : 'No test user was supplied and no tenant-scoped fallback resolved this provider.';
    }

    if (input.configuration.allowTenantFallback && !input.tenantCredentialAvailable) {
      return 'No active tenant-scoped BYOK credential is configured for this provider.';
    }

    if (
      input.configuration.allowPlatformFallback &&
      !input.platformCredentialAvailable
    ) {
      return 'Platform fallback is enabled, but no platform credential is configured in the environment.';
    }

    return 'No credential path could be resolved for this tenant/provider configuration.';
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

  private async assertActiveCredentialExists(
    tenantId: string,
    userId: string,
    providerId: ProviderId,
  ) {
    const provider = await this.providerRepository.findOne({
      where: {
        providerId,
        status: 'active',
      },
    });
    if (!provider) {
      throw new NotFoundException('Unable to update provider settings.');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Unable to update provider settings.');
    }

    const userCredential = await this.withCredentialRepository(
      tenantId,
      (credentialRepository) =>
        credentialRepository.findOne({
          where: {
            tenantId,
            userId,
            providerId: provider.id,
            scope: 'user',
            isActive: true,
          },
        }),
    );
    if (userCredential && tenant.allowUserCredentialOverride) {
      return;
    }

    const tenantCredential = await this.withCredentialRepository(
      tenantId,
      (credentialRepository) =>
        credentialRepository.findOne({
          where: {
            tenantId,
            userId: IsNull(),
            providerId: provider.id,
            scope: 'tenant',
            isActive: true,
          },
        }),
    );
    if (!tenantCredential) {
      throw new ConflictException('Unable to update provider settings.');
    }
  }

  private mapTenantUsageEventSummary(
    event: UsageEventEntity,
  ): TenantUsageEventSummary {
    return {
      id: event.id,
      requestId: event.requestId,
      userUuid: event.userUuid,
      operation: event.operation,
      capability: event.capability,
      providerId: event.providerId,
      model: event.model,
      identitySource: event.identitySource,
      integrationClientId: event.integrationClientId,
      apiKeyId: event.apiKeyId,
      credentialScopeUsed: event.credentialScopeUsed,
      status: event.status,
      errorCode: event.errorCode,
      totalTokens: event.totalTokens,
      imageCount: event.imageCount,
      costEstimateUsd: event.costEstimateUsd,
      latencyMs: event.latencyMs,
      createdAt: event.createdAt,
    };
  }

  private partitionUsageWindows(events: TenantUsageEventSummary[]) {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const last7Days = now - 7 * 24 * 60 * 60 * 1000;
    const last30Days = now - 30 * 24 * 60 * 60 * 1000;

    return {
      last24Hours: events.filter(
        (event) => event.createdAt.getTime() >= last24Hours,
      ),
      last7Days: events.filter((event) => event.createdAt.getTime() >= last7Days),
      last30Days: events.filter(
        (event) => event.createdAt.getTime() >= last30Days,
      ),
    };
  }

  private countDistinctUsers(events: TenantUsageEventSummary[]): number {
    return new Set(events.map((event) => event.userUuid)).size;
  }

  private sumUsageCost(events: TenantUsageEventSummary[]): string {
    return events.reduce(
      (total, event) => this.addCostStrings(total, event.costEstimateUsd),
      '0.000000',
    );
  }

  private addCostStrings(left: string | null, right: string | null): string {
    const leftAmount = Number(left ?? '0');
    const rightAmount = Number(right ?? '0');
    return (leftAmount + rightAmount).toFixed(6);
  }

  private isBlockedUsageStatus(
    status: TenantUsageEventSummary['status'],
  ): boolean {
    return status === 'blocked_by_policy' || status === 'blocked_by_quota';
  }

  private mapUserSummary(
    user: UserEntity,
    tenantId: string,
    roles: TenantRole[],
    globalRoles: GlobalRole[] = [],
  ) {
    return {
      userUuid: user.userUuid,
      tenantId,
      displayName: user.displayName,
      email: this.emailProtectionService.reveal({
        emailHash: user.emailHash,
        encryptedEmail: user.encryptedEmail,
        emailIv: user.emailIv,
        emailAuthTag: user.emailAuthTag,
        emailKeyVersion: user.emailKeyVersion,
      }),
      status: user.status,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
      roles,
      globalRoles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async resolveActor(actor: TenantActorLike): Promise<TenantActor> {
    if (actor.activeTenantId && actor.activeTenantSlug && actor.roles) {
      return {
        userUuid: actor.userUuid,
        activeTenantId: actor.activeTenantId,
        activeTenantSlug: actor.activeTenantSlug,
        roles: actor.roles,
        globalRoles: actor.globalRoles ?? [],
      };
    }

    const user = await this.userRepository.findOne({
      where: { userUuid: actor.userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const memberships = await this.tenantMembershipRepository.find({
      where: { userId: user.id },
      relations: {
        tenant: true,
      },
    });
    const membership = memberships.find(
      (entry) => entry.tenant?.status === 'active',
    );
    if (!membership || !membership.tenant) {
      throw new NotFoundException('User not found.');
    }

    return {
      userUuid: user.userUuid,
      activeTenantId: membership.tenantId,
      activeTenantSlug: membership.tenant.slug,
      roles: memberships
        .filter((entry) => entry.tenantId === membership.tenantId)
        .map((entry) => entry.role),
      globalRoles: (await this.getUserGlobalRoleMap([user.id])).get(user.id) ?? [],
    };
  }

  private async getDefaultTenantActor(): Promise<TenantActor> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug: 'lxp-internal' },
    });
    if (!tenant) {
      throw new NotFoundException('Bootstrap tenant not found.');
    }

    const membership = await this.tenantMembershipRepository.findOne({
      where: { tenantId: tenant.id },
      relations: {
        user: true,
      },
    });
    if (!membership?.user) {
      throw new NotFoundException('Bootstrap tenant actor not found.');
    }

    const roles = await this.getTenantRoles(tenant.id, membership.userId);
    return {
      userUuid: membership.user.userUuid,
      activeTenantId: tenant.id,
      activeTenantSlug: tenant.slug,
      roles,
      globalRoles:
        (await this.getUserGlobalRoleMap([membership.userId])).get(
          membership.userId,
        ) ?? [],
    };
  }

  private createProviderAccess(
    dto:
      | StoreProviderCredentialDto
      | UpdateProviderCredentialDto
      | (Partial<StoreProviderCredentialDto> & Partial<UpdateProviderCredentialDto>),
    providerIdOrCredential: string | UserProviderCredentialEntity,
    existingCredential?: UserProviderCredentialEntity,
  ): ProviderAccessConfig {
    const resolvedExistingCredential =
      typeof providerIdOrCredential === 'string'
        ? existingCredential
        : providerIdOrCredential;
    const providerId =
      typeof providerIdOrCredential === 'string'
        ? providerIdOrCredential
        : providerIdOrCredential.provider?.providerId;
    if (!providerId) {
      throw new BadRequestException(
        'A provider credential must resolve to a provider identifier.',
      );
    }
    const providerAccess = resolvedExistingCredential
      ? this.readProviderAccess(resolvedExistingCredential)
      : {};

    if ('apiToken' in dto && dto.apiToken?.trim()) {
      providerAccess.apiKey = dto.apiToken.trim();
    }

    if ('baseUrl' in dto && dto.baseUrl?.trim()) {
      providerAccess.baseUrl = dto.baseUrl.trim();
    }

    if (!providerAccess.apiKey && !providerAccess.baseUrl) {
      throw new BadRequestException(
        'A provider credential must include an API token, a base URL, or both.',
      );
    }

    this.assertProviderAccessIsValid(providerId, providerAccess);

    return providerAccess;
  }

  private assertProviderAccessIsValid(
    providerId: string | undefined,
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

  private readProviderAccess(
    credential: UserProviderCredentialEntity,
  ): ProviderAccessConfig {
    const decryptedPayload = this.encryptionService.decrypt({
      ciphertext: credential.encryptedSecret,
      iv: credential.iv,
      authTag: credential.authTag,
      keyVersion: credential.keyVersion,
    });

    try {
      return JSON.parse(decryptedPayload) as ProviderAccessConfig;
    } catch {
      return {
        apiKey: decryptedPayload,
      };
    }
  }

  private maskProviderAccess(
    providerAccess: ProviderAccessConfig,
  ): string | null {
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

  private async withCredentialRepository<T>(
    tenantId: string,
    work: (
      credentialRepository: Repository<UserProviderCredentialEntity>,
    ) => Promise<T>,
  ): Promise<T> {
    return this.tenantRlsService.withTenantContext(tenantId, async (manager) =>
      work(manager.getRepository(UserProviderCredentialEntity)),
    );
  }
}
