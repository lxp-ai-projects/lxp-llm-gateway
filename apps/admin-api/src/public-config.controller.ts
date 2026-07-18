import { Controller, Get, Req } from '@nestjs/common';
import { SUPPORTED_PROVIDERS } from '@lxp/domain';
import type { Request } from 'express';

import { TenantPublicHostResolverService } from './registration/tenant-public-host-resolver.service';
import { TenantRegistrationService } from './registration/tenant-registration.service';

@Controller('public/runtime-config')
export class PublicConfigController {
  constructor(
    private readonly hostResolver: TenantPublicHostResolverService,
    private readonly registrationService: TenantRegistrationService,
  ) {}

  @Get()
  async getRuntimeConfig(@Req() request: Request) {
    const context = await this.registrationService.resolvePublicContext(
      this.hostResolver.resolveRequestHostname(request),
    );
    return {
      registrationEnabled: context.registrationEnabled,
      tenant: context.tenant,
      forgotPasswordEnabled: process.env.LXP_FORGOT_PASSWORD_ENABLED === 'true',
      gatewayOnline: process.env.LXP_GATEWAY_ONLINE !== 'false',
      supportedProviders: SUPPORTED_PROVIDERS,
    };
  }
}
