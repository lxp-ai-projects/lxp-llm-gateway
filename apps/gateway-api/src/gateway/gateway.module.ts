import { Module } from '@nestjs/common';
import { NanoGptProviderAdapter } from '@lxp/provider-nanogpt';
import { OllamaProviderAdapter } from '@lxp/provider-ollama';
import { OpenRouterProviderAdapter } from '@lxp/provider-openrouter';
import { GroqProviderAdapter } from '@lxp/provider-groq';
import { GoogleProviderAdapter } from '@lxp/provider-google';
import { OpenAiProviderAdapter } from '@lxp/provider-openai';
import { AnthropicProviderAdapter } from '@lxp/provider-anthropic';
import { XaiProviderAdapter } from '@lxp/provider-xai';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import { GatewayController } from './gateway.controller';
import { GatewayAuditService } from './gateway-audit.service';
import { GatewayService } from './gateway.service';
import { ImagesController } from '../images.controller';
import { ModelsController } from '../models.controller';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';
import { LLM_PROVIDERS } from './provider.tokens';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { EncryptionService } from '../security/encryption.service';
import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { ImageJobEntity } from '../persistence/entities/image-job.entity';
import { ImageJobResultEntity } from '../persistence/entities/image-job-result.entity';
import { ImageApplicationService } from '../images/image-application.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
      ImageAssetEntity,
      ImageJobEntity,
      ImageJobResultEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('LXP_JWT_PRIVATE_KEY'),
      }),
    }),
  ],
  controllers: [GatewayController, ModelsController, ImagesController],
  providers: [
    GatewayAuthService,
    GatewayAuditService,
    GatewayService,
    ProviderCredentialService,
    ProviderRegistryService,
    ImageApplicationService,
    EncryptionService,
    {
      provide: LLM_PROVIDERS,
      useFactory: () => [
        new NanoGptProviderAdapter(),
        new OpenRouterProviderAdapter(),
        new OllamaProviderAdapter(),
        new GroqProviderAdapter(),
        new GoogleProviderAdapter(),
        new OpenAiProviderAdapter(),
        new AnthropicProviderAdapter(),
        new XaiProviderAdapter(),
      ],
    },
  ],
})
export class GatewayModule {}
