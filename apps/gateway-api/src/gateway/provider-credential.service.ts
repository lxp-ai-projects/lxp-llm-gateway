import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId } from '@lxp/domain';
import type { ProviderAccessConfig } from '@lxp/provider-sdk';
import { Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';

@Injectable()
export class ProviderCredentialService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(UserProviderCredentialEntity)
    private readonly credentialRepository: Repository<UserProviderCredentialEntity>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async resolveProviderAccess(
    emailHash: string,
    providerId: ProviderId,
  ): Promise<ProviderAccessConfig> {
    if (!emailHash) {
      throw new BadRequestException('Missing authenticated user email hash.');
    }

    const user = await this.userRepository.findOne({
      where: {
        emailHash,
        status: 'active',
      },
    });
    if (!user) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

    const provider = await this.providerRepository.findOne({
      where: { providerId, status: 'active' },
    });
    if (!provider) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

    const credential = await this.credentialRepository.findOne({
      where: {
        userId: user.id,
        providerId: provider.id,
        isActive: true,
      },
      order: {
        id: 'DESC',
      },
    });
    if (!credential) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

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
}
