import { Readable } from 'node:stream';
import type { Request } from 'express';
import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import { GatewayService, type GatewayChatStreamSession } from '../gateway/gateway.service';
import type { StreamableHttpResponse } from '../shared/http.types';
import { OpenAiCompatibleChatCompletionsRequestDto } from './dto/openai-compatible-chat-completions-request.dto';
import { OpenAiCompatibleService } from './openai-compatible.service';

@Controller('openai')
export class OpenAiCompatibleController {
  constructor(
    private readonly openAiCompatibleService: OpenAiCompatibleService,
    private readonly gatewayAuthService: GatewayAuthService,
    private readonly gatewayService: GatewayService,
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

    const payload = await this.openAiCompatibleService.createChatCompletion(
      request,
      authContext,
    );
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

      const candidate = payload as Record<string, unknown>;
      const recordUsage = (value: unknown) => {
        if (
          value &&
          typeof value === 'object' &&
          ('prompt_tokens' in value ||
            'completion_tokens' in value ||
            'total_tokens' in value ||
            'reasoning_tokens' in value)
        ) {
          const usageCandidate = value as Record<string, unknown>;
          usage = {
            promptTokens:
              typeof usageCandidate.prompt_tokens === 'number'
                ? usageCandidate.prompt_tokens
                : usage?.promptTokens,
            completionTokens:
              typeof usageCandidate.completion_tokens === 'number'
                ? usageCandidate.completion_tokens
                : usage?.completionTokens,
            totalTokens:
              typeof usageCandidate.total_tokens === 'number'
                ? usageCandidate.total_tokens
                : usage?.totalTokens,
            reasoningTokens:
              typeof usageCandidate.reasoning_tokens === 'number'
                ? usageCandidate.reasoning_tokens
                : usage?.reasoningTokens,
          };
        }
      };

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
