import { Readable } from 'node:stream';
import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';

type StreamableHttpResponse = {
  status(code: number): StreamableHttpResponse;
  setHeader(name: string, value: string): void;
  flushHeaders?(): void;
  end(chunk?: string): void;
};

@Controller('chat')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly gatewayAuthService: GatewayAuthService,
  ) {}

  @Post()
  async chat(
    @Body() request: GatewayChatRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Res() response: StreamableHttpResponse,
  ): Promise<GatewayChatResponse | void> {
    const authContext =
      await this.gatewayAuthService.authenticateAccessToken(authorizationHeader);

    if (request.stream) {
      const streamResponse = await this.gatewayService.chatStream(request, authContext);
      response.status(200);
      response.setHeader('content-type', 'text/event-stream; charset=utf-8');
      response.setHeader('cache-control', 'no-cache, no-transform');
      response.setHeader('connection', 'keep-alive');
      response.setHeader('x-request-id', streamResponse.requestId);
      response.flushHeaders?.();

      Readable.fromWeb(streamResponse.stream as never)
        .on('error', () => {
          response.end();
        })
        .pipe(response as never);
      return;
    }

    const payload = await this.gatewayService.chat(request, authContext);
    response.status(200);
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
  }
}
