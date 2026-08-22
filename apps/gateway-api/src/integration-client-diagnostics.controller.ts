import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { GatewayAuthService } from './auth/gateway-auth.service';

@Controller('integration-clients')
export class IntegrationClientDiagnosticsController {
  constructor(private readonly auth: GatewayAuthService) {}

  @Post('self-test')
  @HttpCode(HttpStatus.OK)
  async selfTest(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req() request: Request,
  ) {
    const context = await this.auth.authenticateIntegrationClientRequest(
      authorizationHeader,
      request.headers,
    );

    return {
      status: 'ok' as const,
      principalKind:
        context.identitySource === 'integration-client-service'
          ? ('SERVICE' as const)
          : ('USER' as const),
      identitySource: context.identitySource,
      tenantId: context.activeTenantId,
      clientId: context.integrationClientId,
      scopes: [...(context.integrationClientScopes ?? [])].sort(),
    };
  }
}
