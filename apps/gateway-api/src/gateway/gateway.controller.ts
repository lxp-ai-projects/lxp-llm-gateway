import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';

@Controller('v1/chat')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post()
  chat(
    @Body() request: GatewayChatRequestDto,
    @Headers('x-user-id') userId: string | undefined,
  ): Promise<GatewayChatResponse> {
    return this.gatewayService.chat(request, userId);
  }
}
