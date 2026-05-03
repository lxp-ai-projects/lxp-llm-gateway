import { Readable } from 'node:stream';
import type { Request } from 'express';
import { Body, Controller, Headers, Post, Req, Res } from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import type { StreamableHttpResponse } from '../shared/http.types';
import { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayService } from './gateway.service';
import type { GatewayChatStreamSession } from './gateway.service';

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
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
    @Res() response: StreamableHttpResponse,
  ): Promise<GatewayChatResponse | void> {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );

    if (request.stream) {
      const streamResponse = await this.gatewayService.chatStream(
        request,
        authContext,
      );
      response.status(200);
      response.setHeader('content-type', 'text/event-stream; charset=utf-8');
      response.setHeader('cache-control', 'no-cache, no-transform');
      response.setHeader('connection', 'keep-alive');
      response.setHeader('x-request-id', streamResponse.requestId);
      response.flushHeaders?.();

      const [clientStream, telemetryStream] = streamResponse.stream.tee();
      const nodeStream = Readable.fromWeb(clientStream as never);
      const httpResponse = response as unknown as {
        once: (event: 'finish' | 'close', handler: () => void) => void;
      };
      const telemetryCompletion = this.consumeChatStreamTelemetry(
        telemetryStream,
        streamResponse,
      );
      let finalized = false;

      const finalizeSuccess = () => {
        if (finalized) {
          return;
        }

        finalized = true;
        void telemetryCompletion.then(
          async (chatResponse) => {
            await this.gatewayService.recordChatStreamSuccess(
              authContext,
              streamResponse,
              chatResponse,
            );
          },
          async (error: unknown) => {
            await this.gatewayService.recordChatStreamFailure(
              authContext,
              streamResponse,
              error instanceof Error ? error.message : 'Unknown gateway error.',
            );
          },
        );
      };

      const finalizeFailure = (error: unknown) => {
        if (finalized) {
          return;
        }

        finalized = true;
        void this.gatewayService.recordChatStreamFailure(
          authContext,
          streamResponse,
          error instanceof Error ? error.message : 'Unknown gateway error.',
        );
      };

      nodeStream.once('error', finalizeFailure);
      httpResponse.once('finish', finalizeSuccess);
      httpResponse.once('close', () => {
        if (!finalized) {
          finalizeFailure(
            new Error('Client disconnected before the stream completed.'),
          );
        }
      });

      nodeStream.pipe(response as never);
      return;
    }

    const payload = await this.gatewayService.chat(request, authContext);
    response.status(200);
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
  }

  private async consumeChatStreamTelemetry(
    stream: ReadableStream<Uint8Array>,
    session: GatewayChatStreamSession,
  ): Promise<GatewayChatResponse> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let reasoning = '';
    let finishReason: string | null = null;
    let usage: GatewayChatResponse['usage'] | undefined;
    let providerMetadata: Record<string, unknown> | undefined;

    const processEvent = (eventText: string) => {
      const data = eventText
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trimStart())
        .join('\n');

      if (!data || data === '[DONE]') {
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(data) as unknown;
      } catch {
        return;
      }

      if (!payload || typeof payload !== 'object') {
        return;
      }

      const recordUsage = (value: unknown) => {
        if (
          value &&
          typeof value === 'object' &&
          ('prompt_tokens' in value ||
            'completion_tokens' in value ||
            'total_tokens' in value ||
            'reasoning_tokens' in value)
        ) {
          const candidate = value as Record<string, unknown>;
          usage = {
            promptTokens:
              typeof candidate.prompt_tokens === 'number'
                ? candidate.prompt_tokens
                : usage?.promptTokens,
            completionTokens:
              typeof candidate.completion_tokens === 'number'
                ? candidate.completion_tokens
                : usage?.completionTokens,
            totalTokens:
              typeof candidate.total_tokens === 'number'
                ? candidate.total_tokens
                : usage?.totalTokens,
            reasoningTokens:
              typeof candidate.reasoning_tokens === 'number'
                ? candidate.reasoning_tokens
                : usage?.reasoningTokens,
          };
        }
      };

      const candidate = payload as Record<string, unknown>;
      if ('usage' in candidate) {
        recordUsage(candidate.usage);
      }
      if ('providerMetadata' in candidate && candidate.providerMetadata) {
        providerMetadata = candidate.providerMetadata as Record<string, unknown>;
      }
      if ('metadata' in candidate && candidate.metadata) {
        providerMetadata = candidate.metadata as Record<string, unknown>;
      }

      const choices = Array.isArray(candidate.choices) ? candidate.choices : [];
      const choice = choices[0] as Record<string, unknown> | undefined;
      if (!choice) {
        return;
      }

      if ('finish_reason' in choice && typeof choice.finish_reason === 'string') {
        finishReason = choice.finish_reason;
      } else if ('finishReason' in choice && typeof choice.finishReason === 'string') {
        finishReason = choice.finishReason;
      }

      const delta = choice.delta as Record<string, unknown> | undefined;
      if (delta) {
        if (typeof delta.content === 'string') {
          content += delta.content;
        }

        if (typeof delta.reasoning === 'string') {
          reasoning += delta.reasoning;
        }
      }

      const message = choice.message as Record<string, unknown> | undefined;
      if (message) {
        if (typeof message.content === 'string' && !content) {
          content = message.content;
        }

        if (typeof message.reasoning === 'string' && !reasoning) {
          reasoning = message.reasoning;
        }
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let boundaryIndex = buffer.indexOf('\n\n');
        while (boundaryIndex !== -1) {
          const eventText = buffer.slice(0, boundaryIndex).trim();
          buffer = buffer.slice(boundaryIndex + 2);
          if (eventText) {
            processEvent(eventText);
          }
          boundaryIndex = buffer.indexOf('\n\n');
        }
      }

      const trailing = buffer.trim();
      if (trailing) {
        processEvent(trailing);
      }

      return {
        requestId: session.requestId,
        providerId: session.providerId,
        model: session.model,
        message: {
          role: 'assistant',
          content,
          ...(reasoning ? { reasoning } : {}),
        },
        ...(finishReason !== null ? { finishReason } : {}),
        ...(usage ? { usage } : {}),
        ...(providerMetadata ? { providerMetadata } : {}),
      };
    } finally {
      reader.releaseLock();
    }
  }
}
