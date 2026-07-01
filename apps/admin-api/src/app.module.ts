import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import {
  buildTypeOrmOptions,
  validateRuntimeConfig,
} from './config/runtime.config';
import { HealthController } from './health.controller';
import { PublicConfigController } from './public-config.controller';
import { AuthModule } from './auth/auth.module';
import { SuperAdminBootstrapService } from './auth/super-admin-bootstrap.service';
import { UserEntity } from './persistence/entities/user.entity';
import { RoleEntity } from './persistence/entities/role.entity';
import { UserRoleEntity } from './persistence/entities/user-role.entity';
import { ProviderEntity } from './persistence/entities/provider.entity';
import { ApiKeyEntity } from './persistence/entities/api-key.entity';
import { IntegrationClientEntity } from './persistence/entities/integration-client.entity';
import { TenantEntity } from './persistence/entities/tenant.entity';
import { TenantMembershipEntity } from './persistence/entities/tenant-membership.entity';
import { TenantModelAccessRuleEntity } from './persistence/entities/tenant-model-access-rule.entity';
import { TenantProviderConfigurationEntity } from './persistence/entities/tenant-provider-configuration.entity';
import { TenantPolicyEntity } from './persistence/entities/tenant-policy.entity';
import { UsageEventEntity } from './persistence/entities/usage-event.entity';
import { UserProviderCredentialEntity } from './persistence/entities/user-provider-credential.entity';
import { TenantRlsService } from './persistence/tenant-rls.service';
import { EmailProtectionService } from './security/email-protection.service';
import { EncryptionService } from './security/encryption.service';
import { PasswordService } from './security/password.service';
import { AdminCatalogService } from './admin/admin-catalog.service';
import { AdminProviderCredentialService } from './admin/admin-provider-credential.service';
import { AdminService } from './admin/admin.service';
import { ConversationTransferController } from './conversation-transfer/conversation-transfer.controller';
import { ConversationTransferService } from './conversation-transfer/conversation-transfer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateRuntimeConfig,
    }),
    TerminusModule,
    TypeOrmModule.forRootAsync({
      useFactory: buildTypeOrmOptions,
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      ProviderEntity,
      IntegrationClientEntity,
      ApiKeyEntity,
      TenantEntity,
      TenantMembershipEntity,
      TenantModelAccessRuleEntity,
      TenantProviderConfigurationEntity,
      TenantPolicyEntity,
      UsageEventEntity,
      UserProviderCredentialEntity,
    ]),
    AuthModule,
  ],
  controllers: [
    AdminController,
    HealthController,
    PublicConfigController,
    ConversationTransferController,
  ],
  providers: [
    EncryptionService,
    EmailProtectionService,
    PasswordService,
    TenantRlsService,
    SuperAdminBootstrapService,
    AdminCatalogService,
    AdminProviderCredentialService,
    AdminService,
    ConversationTransferService,
  ],
})
export class AppModule {}
