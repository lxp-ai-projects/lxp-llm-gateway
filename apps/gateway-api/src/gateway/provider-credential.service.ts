import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId } from '@lxp/domain';
import { Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';

@Injectable()
export class ProviderCredentialService {
  constructor(
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(UserProviderCredentialEntity)
    private readonly credentialRepository: Repository<UserProviderCredentialEntity>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async resolveApiKey(userId: string, providerId: ProviderId): Promise<string> {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header.');
    }

    const provider = await this.providerRepository.findOne({
      where: { providerId, status: 'active' },
    });
    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} is not configured.`);
    }

    const credential = await this.credentialRepository.findOne({
      where: {
        userId,
        providerId: provider.id,
        isActive: true,
      },
      order: {
        id: 'DESC',
      },
    });
    if (!credential) {
      throw new NotFoundException(
        `No active credential found for user ${userId} and provider ${providerId}.`,
      );
    }

    return this.encryptionService.decrypt({
      ciphertext: credential.encryptedSecret,
      iv: credential.iv,
      authTag: credential.authTag,
      keyVersion: credential.keyVersion,
    });
  }
}
