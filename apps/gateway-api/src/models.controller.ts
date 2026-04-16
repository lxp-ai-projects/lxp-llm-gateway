import type { Request } from 'express';
import { Controller, Get, Headers, Query, Req } from '@nestjs/common';

import { GatewayAuthService } from './auth/gateway-auth.service';
import { GatewayService } from './gateway/gateway.service';
import { ListModelsQueryDto } from './gateway/dto/list-models-query.dto';

@Controller('models')
export class ModelsController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly gatewayAuthService: GatewayAuthService,
  ) {}

  @Get()
  async listModels(
    @Query() query: ListModelsQueryDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req() httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.gatewayService.listModels(query, authContext);
  }
}
