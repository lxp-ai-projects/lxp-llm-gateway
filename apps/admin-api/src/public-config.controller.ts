import { Controller, Get } from '@nestjs/common';
import { SUPPORTED_PROVIDERS } from '@lxp/domain';

@Controller('public/runtime-config')
export class PublicConfigController {
  @Get()
  getRuntimeConfig() {
    return {
      registrationEnabled: process.env.LXP_REGISTRATION_ENABLED === 'true',
      forgotPasswordEnabled: process.env.LXP_FORGOT_PASSWORD_ENABLED === 'true',
      gatewayOnline: process.env.LXP_GATEWAY_ONLINE !== 'false',
      supportedProviders: SUPPORTED_PROVIDERS,
    };
  }
}
