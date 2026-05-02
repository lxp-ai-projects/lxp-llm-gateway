import {
  BadRequestException,
  BadGatewayException,
  HttpException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import type { ProviderId } from '@lxp/domain';
import type { GatewayChatResponse } from '@lxp/contracts';

import type { GatewayAuthContext } from '../auth/auth.types';
import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayAuditService } from './gateway-audit.service';
import { GatewayTelemetryService } from './gateway-telemetry.service';
import type { ListModelsQueryDto } from './dto/list-models-query.dto';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class GatewayService {
  constructor(
    private readonly gatewayAuditService: GatewayAuditService,
    private readonly gatewayTelemetryService: GatewayTelemetryService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
  ) {}

  async listModels(query: ListModelsQueryDto, authContext: GatewayAuthContext) {
    const provider = this.providerRegistry.getProvider(
      query.providerId ?? authContext.defaultProviderId ?? undefined,
    );
    const requestId = crypto.randomUUID();

    if (!provider.listModels) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not expose a model listing.`,
      );
    }

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext,
          provider.providerId,
        );

      const models = await provider.listModels({
        requestId,
        userId: authContext.userId,
        providerAccess,
      });

      return {
        providerId: provider.providerId,
        models,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async chat(
    request: GatewayChatRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<GatewayChatResponse> {
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const model = this.resolveModel(request.model, providerId, authContext);
    const provider = this.providerRegistry.getProvider(providerId);
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    const messageSummary = this.gatewayAuditService.summarizeMessages(
      request.messages,
    );
    const auditBase = {
      requestId,
      providerId: provider.providerId,
      model,
      resolvedUserUuid: authContext.userUuid,
      userFingerprint: this.gatewayAuditService.fingerprint(
        authContext.emailHash,
      ),
      identitySource: authContext.identitySource,
      tenantId: authContext.activeTenantId,
      tenantSlug: authContext.activeTenantSlug,
      stream: false,
      ...messageSummary,
    };
    this.gatewayAuditService.logStarted(auditBase);

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext,
          provider.providerId,
        );

      const response = await provider.chat(
        {
          ...request,
          providerId,
          model,
        },
        {
          requestId,
          userId: authContext.userId,
          providerAccess,
        },
      );

      this.gatewayAuditService.logSucceeded({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'success',
      });
      await this.recordTelemetrySafely(() =>
        this.gatewayTelemetryService.recordChatSuccess({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          route: '/api/v1/chat',
          latencyMs: Date.now() - startedAt,
          stream: false,
          messageSummary,
          response,
        }),
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown gateway error.';
      this.gatewayAuditService.logFailed({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'failure',
        error: errorMessage,
      });
      await this.recordTelemetrySafely(() =>
        this.gatewayTelemetryService.recordChatFailure({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          route: '/api/v1/chat',
          latencyMs: Date.now() - startedAt,
          stream: false,
          messageSummary,
          error: errorMessage,
        }),
      );
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async chatStream(
    request: GatewayChatRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<{ requestId: string; stream: ReadableStream<Uint8Array> }> {
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const model = this.resolveModel(request.model, providerId, authContext);
    const provider = this.providerRegistry.getProvider(providerId);
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    if (!provider.supportsStreaming() || !provider.chatStream) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not support streaming.`,
      );
    }

    const messageSummary = this.gatewayAuditService.summarizeMessages(
      request.messages,
    );
    const auditBase = {
      requestId,
      providerId: provider.providerId,
      model,
      resolvedUserUuid: authContext.userUuid,
      userFingerprint: this.gatewayAuditService.fingerprint(
        authContext.emailHash,
      ),
      identitySource: authContext.identitySource,
      tenantId: authContext.activeTenantId,
      tenantSlug: authContext.activeTenantSlug,
      stream: true,
      ...messageSummary,
    };
    this.gatewayAuditService.logStarted(auditBase);

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext,
          provider.providerId,
        );

      const stream = await provider.chatStream(
        {
          ...request,
          providerId,
          model,
        },
        {
          requestId,
          userId: authContext.userId,
          providerAccess,
        },
      );

      this.gatewayAuditService.logSucceeded({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'success',
      });
      await this.recordTelemetrySafely(() =>
        this.gatewayTelemetryService.recordChatSuccess({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          route: '/api/v1/chat',
          latencyMs: Date.now() - startedAt,
          stream: true,
          messageSummary,
          response: {
            requestId,
            providerId: provider.providerId,
            model,
            message: {
              role: 'assistant',
              content: '',
            },
            finishReason: null,
          },
        }),
      );

      return {
        requestId,
        stream,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown gateway error.';
      this.gatewayAuditService.logFailed({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'failure',
        error: errorMessage,
      });
      await this.recordTelemetrySafely(() =>
        this.gatewayTelemetryService.recordChatFailure({
          authContext,
          requestId,
          providerId: provider.providerId,
          model,
          route: '/api/v1/chat',
          latencyMs: Date.now() - startedAt,
          stream: true,
          messageSummary,
          error: errorMessage,
        }),
      );
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  private resolveProviderId(
    requestedProviderId: ProviderId | undefined,
    authContext: GatewayAuthContext,
  ): ProviderId {
    if (requestedProviderId) {
      return requestedProviderId;
    }

    if (authContext.defaultProviderId) {
      return authContext.defaultProviderId;
    }

    throw new BadRequestException(
      'No provider was supplied and no default provider is configured for the authenticated user.',
    );
  }

  private resolveModel(
    requestedModel: string | undefined,
    providerId: ProviderId,
    authContext: GatewayAuthContext,
  ): string {
    if (requestedModel) {
      return requestedModel;
    }

    if (
      authContext.defaultProviderId === providerId &&
      authContext.defaultModel
    ) {
      return authContext.defaultModel;
    }

    throw new BadRequestException(
      'No model was supplied and no default model is configured for the selected provider.',
    );
  }

  private async recordTelemetrySafely(work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      console.warn('Gateway telemetry write failed.', error);
    }
  }
}
