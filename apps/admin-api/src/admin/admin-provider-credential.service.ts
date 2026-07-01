import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { GlobalRole, ProviderId, TenantRole } from '@lxp/domain';
import type { ProviderAccessConfig } from '@lxp/provider-sdk';
import { IsNull, Repository } from 'typeorm';

import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { EncryptionService } from '../security/encryption.service';
import { assertProviderAccessIsValid } from './admin-provider-access';
import { StoreProviderCredentialDto } from './dto/store-provider-credential.dto';
import { UpdateProviderCredentialDto } from './dto/update-provider-credential.dto';

type TenantActor = {
  userUuid: string;
  roles: TenantRole[];
  activeTenantId: string;
  activeTenantSlug: string;
  globalRoles?: GlobalRole[];
};

@Injectable()
export class AdminProviderCredentialService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly tenantRlsService: TenantRlsService,
  ) {}

  async listProviderCredentialsForUser(actor: TenantActor, userUuid: string) {
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

  async storeProviderCredentialForActor(
    actor: TenantActor,
    dto: StoreProviderCredentialDto,
  ) {
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
    } else if (
      !actor.roles.includes('tenant_admin') &&
      !actor.roles.includes('operator')
    ) {
      throw new ForbiddenException(
        'Only tenant administrators or operators can manage tenant credentials.',
      );
    }

    return this.storeProviderCredentialInternal(actor.activeTenantId, {
      ...dto,
      scope,
    });
  }

  async updateOwnProviderCredential(
    actor: TenantActor,
    credentialId: string,
    dto: UpdateProviderCredentialDto,
  ) {
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
        'Only tenant administrators or operators can manage tenant credentials.',
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
      const credentialUserId = credential.scope === 'tenant' ? IsNull() : user.id;
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
          'A credential already exists for this provider/label. Use Edit to update it, or delete the existing credential first.',
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

  async deleteOwnProviderCredential(actor: TenantActor, credentialId: string) {
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
        }),
    );
    if (!credential) {
      throw new NotFoundException('Unable to delete the provider credential.');
    }

    if (
      credential.scope === 'tenant' &&
      !actor.roles.some((role) => role === 'tenant_admin' || role === 'operator')
    ) {
      throw new ForbiddenException(
        'Only tenant administrators or operators can manage tenant credentials.',
      );
    }

    await this.withCredentialRepository(actor.activeTenantId, (credentialRepository) =>
      credentialRepository.delete({
        id: credential.id,
        tenantId: actor.activeTenantId,
      }),
    );

    return { deleted: true as const };
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
      throw new ConflictException(
        'A credential already exists for this provider/label. Use Edit to update it, or delete the existing credential first.',
      );
    }

    const providerAccess = this.createProviderAccess(dto, provider.providerId);
    const encrypted = this.encryptionService.encrypt(
      JSON.stringify(providerAccess),
    );
    const maskedHint = this.maskProviderAccess(providerAccess);

    const credential = {
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
    } as UserProviderCredentialEntity;

    const repositoryCredential = await this.withCredentialRepository(
      tenantId,
      (credentialRepository) =>
        credentialRepository.save(
          credentialRepository.create(credential) as UserProviderCredentialEntity,
        ),
    );

    return {
      id: repositoryCredential.id,
      tenantId,
      userUuid: user?.userUuid ?? null,
      providerId: provider.providerId,
      label: repositoryCredential.label,
      scope: repositoryCredential.scope,
      maskedHint: repositoryCredential.maskedHint,
      isActive: repositoryCredential.isActive,
      createdAt: repositoryCredential.createdAt,
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

    assertProviderAccessIsValid(providerId, providerAccess);

    return providerAccess;
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
