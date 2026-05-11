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
import { InstallationStateEntity } from './persistence/entities/installation-state.entity';
import { UserProviderCredentialEntity } from './persistence/entities/user-provider-credential.entity';
import { TenantRlsService } from './persistence/tenant-rls.service';
import { EmailProtectionService } from './security/email-protection.service';
import { EncryptionService } from './security/encryption.service';
import { PasswordService } from './security/password.service';
import { AdminService } from './admin/admin.service';
import { ConversationTransferController } from './conversation-transfer/conversation-transfer.controller';
import { ConversationTransferService } from './conversation-transfer/conversation-transfer.service';
import { SetupController } from './setup/setup.controller';
import { SetupAccessService } from './setup/setup-access.service';
import { SetupBootstrapService } from './setup/setup-bootstrap.service';
import { SetupStatusBootstrapService } from './setup/setup-status-bootstrap.service';
import { SetupStatusService } from './setup/setup-status.service';
import { SetupTokenGuard } from './setup/setup-token.guard';

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
      InstallationStateEntity,
    ]),
    AuthModule,
  ],
  controllers: [
    AdminController,
    HealthController,
    PublicConfigController,
    ConversationTransferController,
    SetupController,
  ],
  providers: [
    EncryptionService,
    EmailProtectionService,
    PasswordService,
    TenantRlsService,
    SuperAdminBootstrapService,
    AdminService,
    ConversationTransferService,
    SetupAccessService,
    SetupBootstrapService,
    SetupStatusService,
    SetupStatusBootstrapService,
    SetupTokenGuard,
  ],
})
export class AppModule {}
