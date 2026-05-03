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
import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { AuditLogEntity } from '../persistence/entities/audit-log.entity';
import { ImagesController } from '../images.controller';
import { ImageApplicationService } from '../images/image-application.service';
import { ModelsController } from '../models.controller';
import { OpenAiCompatibleController } from '../openai-compatible/openai-compatible.controller';
import { OpenAiCompatibleService } from '../openai-compatible/openai-compatible.service';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';
import { TenantProviderConfigurationService } from './tenant-provider-configuration.service';
import { GatewayTelemetryService } from './gateway-telemetry.service';
import { IntegrationClientScopeService } from './integration-client-scope.service';
import { TenantModelAccessRuleService } from './tenant-model-access-rule.service';
import { LLM_PROVIDERS } from './provider.tokens';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { TenantModelAccessRuleEntity } from '../persistence/entities/tenant-model-access-rule.entity';
import { TenantProviderConfigurationEntity } from '../persistence/entities/tenant-provider-configuration.entity';
import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';
import { EncryptionService } from '../security/encryption.service';
import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { ImageJobEntity } from '../persistence/entities/image-job.entity';
import { ImageJobResultEntity } from '../persistence/entities/image-job-result.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { TenantPolicyService } from './tenant-policy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      TenantEntity,
      TenantMembershipEntity,
      TenantModelAccessRuleEntity,
      IntegrationClientEntity,
      ApiKeyEntity,
      AuditLogEntity,
      UsageEventEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
      TenantProviderConfigurationEntity,
      TenantPolicyEntity,
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
  controllers: [
    GatewayController,
    ModelsController,
    ImagesController,
    OpenAiCompatibleController,
  ],
  providers: [
    GatewayAuthService,
    GatewayAuditService,
    GatewayService,
    GatewayTelemetryService,
    IntegrationClientScopeService,
    TenantModelAccessRuleService,
    OpenAiCompatibleService,
    ProviderCredentialService,
    ProviderRegistryService,
    TenantProviderConfigurationService,
    TenantPolicyService,
    ImageApplicationService,
    TenantRlsService,
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
