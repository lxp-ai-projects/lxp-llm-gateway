import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import type { GatewayAuthContext } from '../auth/auth.types';
import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayAuditService } from './gateway-audit.service';
import type { ListModelsQueryDto } from './dto/list-models-query.dto';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class GatewayService {
  constructor(
    private readonly gatewayAuditService: GatewayAuditService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
  ) {}

  async listModels(
    query: ListModelsQueryDto,
    authContext: GatewayAuthContext,
  ) {
    const provider = this.providerRegistry.getProvider(query.providerId);
    const requestId = crypto.randomUUID();

    if (!provider.listModels) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not expose a model listing.`,
      );
    }

    const apiKey = await this.providerCredentialService.resolveApiKey(
      authContext.emailHash,
      provider.providerId,
    );

    const models = await provider.listModels({
      requestId,
      userId: authContext.userId,
      providerCredential: {
        apiKey,
      },
    });

    return {
      providerId: provider.providerId,
      models,
    };
  }

  async chat(
    request: GatewayChatRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<GatewayChatResponse> {
    const provider = this.providerRegistry.getProvider(request.providerId);
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    const messageSummary = this.gatewayAuditService.summarizeMessages(request.messages);
    const auditBase = {
      requestId,
      providerId: provider.providerId,
      model: request.model,
      userFingerprint: this.gatewayAuditService.fingerprint(authContext.emailHash),
      stream: false,
      ...messageSummary,
    };
    this.gatewayAuditService.logStarted(auditBase);

    try {
      const apiKey = await this.providerCredentialService.resolveApiKey(
        authContext.emailHash,
        provider.providerId,
      );

      const response = await provider.chat(request, {
        requestId,
        userId: authContext.userId,
        providerCredential: {
          apiKey,
        },
      });

      this.gatewayAuditService.logSucceeded({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'success',
      });

      return response;
    } catch (error) {
      this.gatewayAuditService.logFailed({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'failure',
        error: error instanceof Error ? error.message : 'Unknown gateway error.',
      });
      throw error;
    }
  }

  async chatStream(
    request: GatewayChatRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<{ requestId: string; stream: ReadableStream<Uint8Array> }> {
    const provider = this.providerRegistry.getProvider(request.providerId);
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

    const messageSummary = this.gatewayAuditService.summarizeMessages(request.messages);
    const auditBase = {
      requestId,
      providerId: provider.providerId,
      model: request.model,
      userFingerprint: this.gatewayAuditService.fingerprint(authContext.emailHash),
      stream: true,
      ...messageSummary,
    };
    this.gatewayAuditService.logStarted(auditBase);

    try {
      const apiKey = await this.providerCredentialService.resolveApiKey(
        authContext.emailHash,
        provider.providerId,
      );

      const stream = await provider.chatStream(request, {
        requestId,
        userId: authContext.userId,
        providerCredential: {
          apiKey,
        },
      });

      this.gatewayAuditService.logSucceeded({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'success',
      });

      return {
        requestId,
        stream,
      };
    } catch (error) {
      this.gatewayAuditService.logFailed({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'failure',
        error: error instanceof Error ? error.message : 'Unknown gateway error.',
      });
      throw error;
    }
  }
}
