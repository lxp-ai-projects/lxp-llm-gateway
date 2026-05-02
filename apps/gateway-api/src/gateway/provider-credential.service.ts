import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId } from '@lxp/domain';
import type { ProviderAccessConfig } from '@lxp/provider-sdk';
import { IsNull, Repository } from 'typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';
import type { GatewayAuthContext } from '../auth/auth.types';

@Injectable()
export class ProviderCredentialService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(UserProviderCredentialEntity)
    private readonly credentialRepository: Repository<UserProviderCredentialEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly tenantRlsService: TenantRlsService,
  ) {}

  async resolveProviderAccess(
    authContext: Pick<
      GatewayAuthContext,
      'activeTenantId' | 'emailHash' | 'userId'
    >,
    providerId: ProviderId,
  ): Promise<ProviderAccessConfig> {
    if (!authContext.emailHash) {
      throw new BadRequestException('Missing authenticated user email hash.');
    }

    const user = await this.userRepository.findOne({
      where: {
        emailHash: authContext.emailHash,
        status: 'active',
      },
    });
    if (!user) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

    const tenant = await this.tenantRepository.findOne({
      where: {
        id: authContext.activeTenantId,
        status: 'active',
      },
    });
    if (!tenant) {
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

    const { userCredential, tenantCredential } =
      await this.tenantRlsService.withTenantContext(
        tenant.id,
        async (manager) => {
          const credentialRepository =
            manager.getRepository(UserProviderCredentialEntity);
          const userCredentials = await credentialRepository.find({
            where: {
              tenantId: tenant.id,
              userId: user.id,
              providerId: provider.id,
              scope: 'user',
              isActive: true,
            },
          });
          const userCredential =
            this.selectMostRecentCredential(userCredentials);

          const tenantCredentials = await credentialRepository.find({
            where: {
              tenantId: tenant.id,
              userId: IsNull(),
              providerId: provider.id,
              scope: 'tenant',
              isActive: true,
            },
          });
          const tenantCredential =
            this.selectMostRecentCredential(tenantCredentials);

          return {
            userCredential,
            tenantCredential,
          };
        },
      );
    if (userCredential && tenant.allowUserCredentialOverride) {
      return this.decryptProviderAccess(providerId, userCredential);
    }

    if (!tenantCredential) {
      throw new NotFoundException(
        'Unable to resolve the provider credential for the authenticated request.',
      );
    }

    return this.decryptProviderAccess(providerId, tenantCredential);
  }

  private decryptProviderAccess(
    providerId: ProviderId,
    credential: UserProviderCredentialEntity,
  ): ProviderAccessConfig {
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

  private selectMostRecentCredential(
    credentials: UserProviderCredentialEntity[],
  ): UserProviderCredentialEntity | null {
    if (credentials.length === 0) {
      return null;
    }

    return [...credentials].sort((left, right) => {
      const rightTimestamp = this.getCredentialTimestamp(right);
      const leftTimestamp = this.getCredentialTimestamp(left);
      return rightTimestamp - leftTimestamp;
    })[0]!;
  }

  private getCredentialTimestamp(
    credential: UserProviderCredentialEntity,
  ): number {
    if (credential.updatedAt instanceof Date) {
      return credential.updatedAt.getTime();
    }

    if (credential.createdAt instanceof Date) {
      return credential.createdAt.getTime();
    }

    return 0;
  }
}
