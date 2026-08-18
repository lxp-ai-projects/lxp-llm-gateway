import { Body, Controller, Ip, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { TenantPublicHostResolverService } from '../registration/tenant-public-host-resolver.service';
import { CreateEmailChallengeDto } from './dto/create-email-challenge.dto';
import { ResendEmailChallengeDto } from './dto/resend-email-challenge.dto';
import { VerifyEmailChallengeDto } from './dto/verify-email-challenge.dto';
import { RegistrationVerificationService } from './registration-verification.service';

@Controller('public/registration/email/challenges')
export class RegistrationVerificationController {
  constructor(
    private readonly service: RegistrationVerificationService,
    private readonly hosts: TenantPublicHostResolverService,
  ) {}
  @Post() create(
    @Req() request: Request,
    @Ip() ip: string,
    @Body() dto: CreateEmailChallengeDto,
  ) {
    return this.service.create(
      this.hosts.resolveRequestHostname(request),
      dto.email,
      ip,
    );
  }
  @Post(':challengeId/verify') verify(
    @Param('challengeId') challengeId: string,
    @Ip() ip: string,
    @Body() dto: VerifyEmailChallengeDto,
  ) {
    return this.service.verify(challengeId, dto.code, ip);
  }
  @Post(':challengeId/resend') resend(
    @Req() request: Request,
    @Param('challengeId') challengeId: string,
    @Ip() ip: string,
    @Body() dto: ResendEmailChallengeDto,
  ) {
    return this.service.resend(
      this.hosts.resolveRequestHostname(request),
      challengeId,
      dto.email,
      ip,
    );
  }
}
