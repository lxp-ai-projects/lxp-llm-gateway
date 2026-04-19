import { Module } from '@nestjs/common';
import { NanoGptProviderAdapter } from '@lxp/provider-nanogpt';
import { OllamaProviderAdapter } from '@lxp/provider-ollama';
import { OpenRouterProviderAdapter } from '@lxp/provider-openrouter';
import { GroqProviderAdapter } from '@lxp/provider-groq';
import { XaiProviderAdapter } from '@lxp/provider-xai';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import { GatewayController } from './gateway.controller';
import { GatewayAuditService } from './gateway-audit.service';
import { GatewayService } from './gateway.service';
import { ModelsController } from '../models.controller';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';
import { LLM_PROVIDERS } from './provider.tokens';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('LXP_JWT_PRIVATE_KEY'),
      }),
    }),
  ],
  controllers: [GatewayController, ModelsController],
  providers: [
    GatewayAuthService,
    GatewayAuditService,
    GatewayService,
    ProviderCredentialService,
    ProviderRegistryService,
    EncryptionService,
    {
      provide: LLM_PROVIDERS,
      useFactory: () => [
        new NanoGptProviderAdapter(),
        new OpenRouterProviderAdapter(),
        new OllamaProviderAdapter(),
        new GroqProviderAdapter(),
        new XaiProviderAdapter(),
      ],
    },
  ],
})
export class GatewayModule {}
