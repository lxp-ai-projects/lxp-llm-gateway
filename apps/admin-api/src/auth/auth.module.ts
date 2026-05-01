import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../persistence/entities/role.entity';

import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { AccessTokenGuard } from './access-token.guard';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { AuthTokenStore } from './auth-token.store';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserRoleEntity,
      RoleEntity,
      TenantEntity,
      TenantMembershipEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('LXP_JWT_PRIVATE_KEY'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthCookieService,
    AuthService,
    AuthTokenStore,
    AccessTokenGuard,
    Reflector,
    RolesGuard,
    EncryptionService,
    EmailProtectionService,
    PasswordService,
  ],
  exports: [AccessTokenGuard, AuthService, RolesGuard],
})
export class AuthModule {}
