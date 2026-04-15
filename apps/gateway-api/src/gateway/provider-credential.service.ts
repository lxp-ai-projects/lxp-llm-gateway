import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId } from '@lxp/domain';
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

  async resolveApiKey(emailHash: string, providerId: ProviderId): Promise<string> {
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
      throw new NotFoundException('Authenticated user could not be resolved.');
    }

    const provider = await this.providerRepository.findOne({
      where: { providerId, status: 'active' },
    });
    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} is not configured.`);
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
        `No active credential found for the authenticated user and provider ${providerId}.`,
      );
    }

    try {
      return this.encryptionService.decrypt({
        ciphertext: credential.encryptedSecret,
        iv: credential.iv,
        authTag: credential.authTag,
        keyVersion: credential.keyVersion,
      });
    } catch {
      throw new InternalServerErrorException(
        `Unable to decrypt the stored credential for provider ${providerId}. Verify that admin-api and gateway-api use the same LXP_ENCRYPTION_MASTER_KEY and LXP_ENCRYPTION_KEY_VERSION, or re-save the provider credential with the active key.`,
      );
    }
  }
}
