import { randomUUID } from 'node:crypto';
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
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
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
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
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
          where: { tenantId: actor.activeTenantId, userId: user.id },
          relations: {
            provider: true,
          },
          order: {
            createdAt: 'DESC',
          },
        }),
    );

    return credentials.map((credential) => ({
      id: credential.id,
      userUuid,
      providerId: credential.provider.providerId,
      providerDisplayName: credential.provider.displayName,
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
          where: {
            id: credentialId,
            tenantId: actor.activeTenantId,
            userId: user.id,
            scope: 'user',
          },
          relations: {
            provider: true,
          },
        }),
    );
    if (!credential) {
      throw new NotFoundException('Unable to update the provider credential.');
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
      const duplicateCredential = await this.withCredentialRepository(
        actor.activeTenantId,
        (credentialRepository) =>
          credentialRepository.findOne({
            where: {
              tenantId: actor.activeTenantId,
              userId: user.id,
              providerId: credential.providerId,
              label: nextLabel,
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
      userUuid: actor.userUuid,
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
        providerId === 'anthropic') &&
      !providerAccess.apiKey
    ) {
      throw new BadRequestException(
        providerId === 'google'
          ? 'Google Gemini credentials require an API token.'
          : providerId === 'xai'
            ? 'xAI Grok credentials require an API token.'
            : providerId === 'openai'
              ? 'OpenAI credentials require an API token.'
              : 'Anthropic credentials require an API token.',
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
