import { randomUUID } from 'node:crypto';
import {
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
import { StoreProviderCredentialDto } from './dto/store-provider-credential.dto';

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
      throw new ConflictException('A user with this email already exists.');
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
    });
    await this.userRepository.save(user);

    const roleNames = dto.roles?.length ? dto.roles : ['user'];
    const roles = await this.roleRepository.find({
      where: roleNames.map((name) => ({ name })),
    });

    if (roles.length !== roleNames.length) {
      throw new NotFoundException('One or more roles do not exist.');
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
      throw new ConflictException(
        'Bootstrap admin is only available before the first user exists.',
      );
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
      throw new NotFoundException('User not found.');
    }

    const provider = await this.providerRepository.findOne({
      where: { providerId: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }

    const existingCredential = await this.credentialRepository.findOne({
      where: {
        userId: user.id,
        providerId: provider.id,
        label: dto.label,
      },
    });
    if (existingCredential) {
      throw new ConflictException(
        'A credential with this label already exists for the user and provider.',
      );
    }

    const encrypted = this.encryptionService.encrypt(dto.apiToken);
    const maskedHint =
      dto.apiToken.length <= 4 ? dto.apiToken : `***${dto.apiToken.slice(-4)}`;

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
}
