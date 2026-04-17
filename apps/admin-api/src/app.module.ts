import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { buildTypeOrmOptions, validateRuntimeConfig } from './config/runtime.config';
import { HealthController } from './health.controller';
import { PublicConfigController } from './public-config.controller';
import { AuthModule } from './auth/auth.module';
import { UserEntity } from './persistence/entities/user.entity';
import { RoleEntity } from './persistence/entities/role.entity';
import { UserRoleEntity } from './persistence/entities/user-role.entity';
import { ProviderEntity } from './persistence/entities/provider.entity';
import { UserProviderCredentialEntity } from './persistence/entities/user-provider-credential.entity';
import { EmailProtectionService } from './security/email-protection.service';
import { EncryptionService } from './security/encryption.service';
import { PasswordService } from './security/password.service';
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
    AdminService,
    ConversationTransferService,
  ],
})
export class AppModule {}
