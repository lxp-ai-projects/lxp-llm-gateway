import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type { LlmProviderAdapter } from '@lxp/provider-sdk';

import { LLM_PROVIDER } from './provider.token';

@Controller()
export class GatewayController {
  constructor(
    @Inject(LLM_PROVIDER) private readonly provider: LlmProviderAdapter,
  ) {}

  @Get('health')
  getHealth() {
    return {
      service: 'gateway-api',
      status: 'ok',
    };
  }

  @Post('v1/chat')
  async chat(@Body() request: GatewayChatRequest): Promise<GatewayChatResponse> {
    return this.provider.chat(request, {
      requestId: crypto.randomUUID(),
    });
  }
}
