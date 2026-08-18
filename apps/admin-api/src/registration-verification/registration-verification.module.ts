import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantPublicHostEntity } from '../persistence/entities/tenant-public-host.entity';
import { TenantRegistrationSettingsEntity } from '../persistence/entities/tenant-registration-settings.entity';
import { RegistrationVerificationChallengeEntity } from '../persistence/entities/registration-verification-challenge.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { TenantPublicHostResolverService } from '../registration/tenant-public-host-resolver.service';
import { TenantRegistrationService } from '../registration/tenant-registration.service';
import { SmtpVerificationDeliveryProvider } from './delivery/smtp-verification-delivery.provider';
import { MailerSendVerificationDeliveryProvider } from './delivery/mailersend-verification-delivery.provider';
import { VerificationDeliveryService } from './delivery/verification-delivery.service';
import { RegistrationVerificationController } from './registration-verification.controller';
import { RegistrationVerificationRateLimitService } from './registration-verification-rate-limit.service';
import { RegistrationVerificationService } from './registration-verification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegistrationVerificationChallengeEntity,
      TenantEntity,
      TenantPublicHostEntity,
      TenantRegistrationSettingsEntity,
    ]),
  ],
  controllers: [RegistrationVerificationController],
  providers: [
    EncryptionService,
    EmailProtectionService,
    TenantPublicHostResolverService,
    TenantRegistrationService,
    SmtpVerificationDeliveryProvider,
    MailerSendVerificationDeliveryProvider,
    VerificationDeliveryService,
    RegistrationVerificationRateLimitService,
    RegistrationVerificationService,
  ],
  exports: [RegistrationVerificationService, VerificationDeliveryService],
})
export class RegistrationVerificationModule {}
