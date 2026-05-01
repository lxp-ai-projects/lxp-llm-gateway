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
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
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
    const protectedEmail = this.emailProtectionService.protect(dto.email);
    const existingUser = await this.userRepository.findOne({
      where: { emailHash: protectedEmail.emailHash },
    });

    let user = existingUser;
    if (!user) {
      const passwordHash = await this.passwordService.hashPassword(dto.password);
      user = this.userRepository.create({
        userUuid: randomUUID(),
        emailHash: protectedEmail.emailHash,
        encryptedEmail: protectedEmail.encryptedEmail,
        emailIv: protectedEmail.emailIv,
        emailAuthTag: protectedEmail.emailAuthTag,
        emailKeyVersion: protectedEmail.emailKeyVersion,
        passwordHash,
        displayName: dto.displayName,
        status: 'active',
        lastActiveTenantId: actor.activeTenantId,
        defaultProviderId: null,
        defaultModel: null,
        defaultImageProviderId: null,
        defaultImageModel: null,
      });
      await this.userRepository.save(user);
    }

    const existingMembership = await this.tenantMembershipRepository.findOne({
      where: {
        tenantId: actor.activeTenantId,
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
          tenantId: actor.activeTenantId,
          userId: user.id,
          role,
        }),
      ),
    );

    return this.mapUserSummary(user, actor.activeTenantId, tenantRoles);
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

    const user = await this.assertTenantScopedUser(actor.activeTenantId, userUuid);

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
        tenantId: actor.activeTenantId,
        userId: user.id,
      });
      await this.tenantMembershipRepository.save(
        dto.roles.map((role) =>
          this.tenantMembershipRepository.create({
            tenantId: actor.activeTenantId,
            userId: user.id,
            role,
          }),
        ),
      );
    }

    return this.mapUserSummary(
      user,
      actor.activeTenantId,
      dto.roles ?? (await this.getTenantRoles(actor.activeTenantId, user.id)),
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
      globalRoles: [],
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
      globalRoles: [],
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
