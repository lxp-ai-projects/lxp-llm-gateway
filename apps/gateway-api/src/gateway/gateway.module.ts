import { Module } from '@nestjs/common';
import { NanoGptProviderAdapter } from '@lxp/provider-nanogpt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';
import { LLM_PROVIDERS } from './provider.tokens';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderEntity, UserProviderCredentialEntity])],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    ProviderCredentialService,
    ProviderRegistryService,
    EncryptionService,
    {
      provide: LLM_PROVIDERS,
      useFactory: () => [new NanoGptProviderAdapter()],
    },
  ],
})
export class GatewayModule {}
