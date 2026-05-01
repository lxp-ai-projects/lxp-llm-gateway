import { Readable } from 'node:stream';
import type { Request } from 'express';
import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import type { StreamableHttpResponse } from '../shared/http.types';
import { OpenAiCompatibleChatCompletionsRequestDto } from './dto/openai-compatible-chat-completions-request.dto';
import { OpenAiCompatibleService } from './openai-compatible.service';

@Controller('openai')
export class OpenAiCompatibleController {
  constructor(
    private readonly openAiCompatibleService: OpenAiCompatibleService,
    private readonly gatewayAuthService: GatewayAuthService,
  ) {}

  @Get('models')
  async listModels(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext =
      await this.gatewayAuthService.authenticateOpenAiCompatibleRequest(
        authorizationHeader,
        httpRequest.cookies?.lxp_access_token,
        httpRequest.headers,
      );

    return this.openAiCompatibleService.listModels(authContext);
  }

  @Post('chat/completions')
  async createChatCompletion(
    @Body() request: OpenAiCompatibleChatCompletionsRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
    @Res() response: StreamableHttpResponse,
  ) {
    const authContext =
      await this.gatewayAuthService.authenticateOpenAiCompatibleRequest(
        authorizationHeader,
        httpRequest.cookies?.lxp_access_token,
        httpRequest.headers,
      );

    if (request.stream) {
      const streamResponse =
        await this.openAiCompatibleService.createChatCompletionStream(
          request,
          authContext,
        );
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

    const payload = await this.openAiCompatibleService.createChatCompletion(
      request,
      authContext,
    );
    response.status(200);
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
  }
}
