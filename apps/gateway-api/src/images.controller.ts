import type { Request } from 'express';
import { Body, Controller, Headers, Post, Req } from '@nestjs/common';

import { GatewayAuthService } from './auth/gateway-auth.service';
import { GatewayService } from './gateway/gateway.service';
import { GatewayImageEditRequestDto } from './gateway/dto/gateway-image-edit-request.dto';
import { GatewayImageGenerationRequestDto } from './gateway/dto/gateway-image-generation-request.dto';

@Controller('images')
export class ImagesController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly gatewayAuthService: GatewayAuthService,
  ) {}

  @Post('generations')
  async generateImage(
    @Body() request: GatewayImageGenerationRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.gatewayService.generateImage(request, authContext);
  }

  @Post('edits')
  async editImage(
    @Body() request: GatewayImageEditRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.gatewayService.editImage(request, authContext);
  }
}
