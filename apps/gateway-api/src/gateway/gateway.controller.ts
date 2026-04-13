import { Body, Controller, Post } from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';

@Controller('v1/chat')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post()
  chat(@Body() request: GatewayChatRequestDto): Promise<GatewayChatResponse> {
    return this.gatewayService.chat(request);
  }
}
