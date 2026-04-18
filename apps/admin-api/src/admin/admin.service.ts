import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { RoleEntity } from '../persistence/entities/role.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProviderCredentialDto } from './dto/update-provider-credential.dto';
import { UpdateProviderSettingsDto } from './dto/update-provider-settings.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StoreProviderCredentialDto } from './dto/store-provider-credential.dto';

type ProviderAccessConfig = {
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
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
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(UserProviderCredentialEntity)
    private readonly credentialRepository: Repository<UserProviderCredentialEntity>,
    private readonly emailProtectionService: EmailProtectionService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordService: PasswordService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const protectedEmail = this.emailProtectionService.protect(dto.email);
    const existingUser = await this.userRepository.findOne({
      where: { emailHash: protectedEmail.emailHash },
    });

    if (existingUser) {
      throw new ConflictException(
        'Unable to create user with the provided data.',
      );
    }

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
      defaultProviderId: null,
      defaultModel: null,
    });
    await this.userRepository.save(user);

    const roleNames = dto.roles?.length ? dto.roles : ['user'];
    const roles = await this.roleRepository.find({
      where: roleNames.map((name) => ({ name })),
    });

    if (roles.length !== roleNames.length) {
      throw new NotFoundException(
        'Unable to assign one or more requested roles.',
      );
    }

    await this.userRoleRepository.save(
      roles.map((role) =>
        this.userRoleRepository.create({
          userId: user.id,
          roleId: role.id,
        }),
      ),
    );

    return {
      userUuid: user.userUuid,
      displayName: user.displayName,
      email: this.emailProtectionService.reveal({
        emailHash: user.emailHash,
        encryptedEmail: user.encryptedEmail,
        emailIv: user.emailIv,
        emailAuthTag: user.emailAuthTag,
        emailKeyVersion: user.emailKeyVersion,
      }),
      status: user.status,
      roles: roleNames,
    };
  }

  async bootstrapAdmin(dto: CreateUserDto) {
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      throw new ConflictException('Bootstrap is not available.');
    }

    return this.createUser({
      ...dto,
      roles: dto.roles?.length ? dto.roles : ['admin'],
    });
  }

  async storeProviderCredential(dto: StoreProviderCredentialDto) {
    const user = await this.userRepository.findOne({
      where: { userUuid: dto.userUuid },
    });
    if (!user) {
      throw new NotFoundException('Unable to store the provider credential.');
    }

    const provider = await this.providerRepository.findOne({
      where: { providerId: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Unable to store the provider credential.');
    }

    const existingCredential = await this.credentialRepository.findOne({
      where: {
        userId: user.id,
        providerId: provider.id,
        label: dto.label,
      },
    });
    if (existingCredential) {
      throw new ConflictException('Unable to store the provider credential.');
    }

    const providerAccess = this.createProviderAccess(dto);
    const encrypted = this.encryptionService.encrypt(
      JSON.stringify(providerAccess),
    );
    const maskedHint = this.maskProviderAccess(providerAccess);

    const credential = this.credentialRepository.create({
      userId: user.id,
      providerId: provider.id,
      label: dto.label,
      encryptedSecret: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
      isActive: true,
      maskedHint,
    });

    await this.credentialRepository.save(credential);

    return {
      id: credential.id,
      userUuid: user.userUuid,
      providerId: provider.providerId,
      label: credential.label,
      maskedHint: credential.maskedHint,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    };
  }

  async updateOwnProviderCredential(
    actor: { userUuid: string },
    credentialId: string,
    dto: UpdateProviderCredentialDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { userUuid: actor.userUuid },
    });
    if (!user) {
      throw new NotFoundException('Unable to update the provider credential.');
    }

    const credential = await this.credentialRepository.findOne({
      where: {
        id: credentialId,
        userId: user.id,
      },
      relations: {
        provider: true,
      },
    });
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
      const duplicateCredential = await this.credentialRepository.findOne({
        where: {
          userId: user.id,
          providerId: credential.providerId,
          label: nextLabel,
        },
      });

      if (duplicateCredential && duplicateCredential.id !== credential.id) {
        throw new ConflictException(
          'Unable to update the provider credential.',
        );
      }
      credential.label = nextLabel;
    }

    if (dto.apiToken?.trim() || dto.baseUrl?.trim()) {
      const providerAccess = this.createProviderAccess(dto, credential);
      const encrypted = this.encryptionService.encrypt(
        JSON.stringify(providerAccess),
      );
      credential.encryptedSecret = encrypted.ciphertext;
      credential.iv = encrypted.iv;
      credential.authTag = encrypted.authTag;
      credential.keyVersion = encrypted.keyVersion;
      credential.maskedHint = this.maskProviderAccess(providerAccess);
    }

    await this.credentialRepository.save(credential);

    return {
      id: credential.id,
      userUuid: actor.userUuid,
      providerId: provider.providerId,
      providerDisplayName: provider.displayName,
      label: credential.label,
      maskedHint: credential.maskedHint,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      lastUsedAt: credential.lastUsedAt,
    };
  }

  async listUsers() {
    const users = await this.userRepository.find({
      relations: {
        roles: {
          role: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return users.map((user) => ({
      userUuid: user.userUuid,
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
      roles: user.roles
        .map((userRole) => userRole.role?.name)
        .filter((roleName): roleName is string => Boolean(roleName)),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async updateUser(userUuid: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (dto.displayName) {
      user.displayName = dto.displayName;
    }

    if (dto.status) {
      user.status = dto.status;
    }

    await this.userRepository.save(user);

    if (dto.roles) {
      const roles = await this.roleRepository.find({
        where: dto.roles.map((name) => ({ name })),
      });
      if (roles.length !== dto.roles.length) {
        throw new NotFoundException(
          'Unable to assign one or more requested roles.',
        );
      }

      await this.userRoleRepository.delete({ userId: user.id });
      await this.userRoleRepository.save(
        roles.map((role) =>
          this.userRoleRepository.create({
            userId: user.id,
            roleId: role.id,
          }),
        ),
      );
    }

    return this.listUsers().then((users) =>
      users.find((entry) => entry.userUuid === userUuid),
    );
  }

  async listProviderCredentialsForUser(userUuid: string) {
    const user = await this.userRepository.findOne({
      where: { userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const credentials = await this.credentialRepository.find({
      where: { userId: user.id },
      relations: {
        provider: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return credentials.map((credential) => ({
      id: credential.id,
      userUuid,
      providerId: credential.provider.providerId,
      providerDisplayName: credential.provider.displayName,
      label: credential.label,
      maskedHint: credential.maskedHint,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      lastUsedAt: credential.lastUsedAt,
    }));
  }

  async storeProviderCredentialForActor(
    actor: { userUuid: string; roles: string[] },
    dto: StoreProviderCredentialDto,
  ) {
    const targetUserUuid = dto.userUuid || actor.userUuid;
    const isOwnCredential = targetUserUuid === actor.userUuid;
    const isAdmin = actor.roles.includes('admin');

    if (!isOwnCredential && !isAdmin) {
      throw new ForbiddenException(
        'You cannot manage another user provider credential.',
      );
    }

    return this.storeProviderCredential({
      ...dto,
      userUuid: targetUserUuid,
    });
  }

  async getProviderSettingsForUser(userUuid: string) {
    const user = await this.userRepository.findOne({
      where: { userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      userUuid: user.userUuid,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
    };
  }

  async updateProviderSettingsForUser(
    userUuid: string,
    dto: UpdateProviderSettingsDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const providerIdWasUpdated = Object.prototype.hasOwnProperty.call(
      dto,
      'defaultProviderId',
    );
    const modelWasUpdated = Object.prototype.hasOwnProperty.call(
      dto,
      'defaultModel',
    );

    if (providerIdWasUpdated) {
      if (dto.defaultProviderId === null) {
        user.defaultProviderId = null;
        user.defaultModel = null;
      } else {
        const provider = await this.providerRepository.findOne({
          where: {
            providerId: dto.defaultProviderId,
            status: 'active',
          },
        });
        if (!provider) {
          throw new NotFoundException('Unable to update provider settings.');
        }

        const activeCredential = await this.credentialRepository.findOne({
          where: {
            userId: user.id,
            providerId: provider.id,
            isActive: true,
          },
        });
        if (!activeCredential) {
          throw new ConflictException('Unable to update provider settings.');
        }

        user.defaultProviderId = dto.defaultProviderId ?? null;
        if (!modelWasUpdated) {
          user.defaultModel = null;
        }
      }
    }

    if (modelWasUpdated) {
      if (dto.defaultModel === null) {
        user.defaultModel = null;
      } else {
        const targetProviderId = providerIdWasUpdated
          ? user.defaultProviderId
          : user.defaultProviderId;

        if (!targetProviderId) {
          throw new ConflictException('Unable to update provider settings.');
        }

        user.defaultModel = dto.defaultModel?.trim() ?? null;
      }
    }

    await this.userRepository.save(user);

    return {
      userUuid: user.userUuid,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
    };
  }

  private createProviderAccess(
    dto:
      | StoreProviderCredentialDto
      | UpdateProviderCredentialDto
      | (Partial<StoreProviderCredentialDto> & Partial<UpdateProviderCredentialDto>),
    existingCredential?: UserProviderCredentialEntity,
  ): ProviderAccessConfig {
    const providerAccess = existingCredential
      ? this.readProviderAccess(existingCredential)
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
}
