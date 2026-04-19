import {
  BadRequestException,
  BadGatewayException,
  HttpException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import type { ProviderId } from '@lxp/domain';
import type {
  GatewayChatResponse,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';

import type { GatewayAuthContext } from '../auth/auth.types';
import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { GatewayAuditService } from './gateway-audit.service';
import type { GatewayImageEditRequestDto } from './dto/gateway-image-edit-request.dto';
import type { GatewayImageGenerationRequestDto } from './dto/gateway-image-generation-request.dto';
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
          authContext.emailHash,
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
      userFingerprint: this.gatewayAuditService.fingerprint(
        authContext.emailHash,
      ),
      stream: false,
      ...messageSummary,
    };
    this.gatewayAuditService.logStarted(auditBase);

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
        authContext.emailHash,
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

      return response;
    } catch (error) {
      this.gatewayAuditService.logFailed({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'failure',
        error:
          error instanceof Error ? error.message : 'Unknown gateway error.',
      });
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
      userFingerprint: this.gatewayAuditService.fingerprint(
        authContext.emailHash,
      ),
      stream: true,
      ...messageSummary,
    };
    this.gatewayAuditService.logStarted(auditBase);

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
        authContext.emailHash,
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

      return {
        requestId,
        stream,
      };
    } catch (error) {
      this.gatewayAuditService.logFailed({
        ...auditBase,
        durationMs: Date.now() - startedAt,
        outcome: 'failure',
        error:
          error instanceof Error ? error.message : 'Unknown gateway error.',
      });
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async generateImage(
    request: GatewayImageGenerationRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageGenerationResponse> {
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const model = this.resolveModel(request.model, providerId, authContext);
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider.capabilities.imageGeneration || !provider.generateImage) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not support image generation.`,
      );
    }

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext.emailHash,
          provider.providerId,
        );

      return await provider.generateImage(
        {
          ...request,
          providerId,
          model,
        },
        {
          requestId: crypto.randomUUID(),
          userId: authContext.userId,
          providerAccess,
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unknown gateway error.',
      );
    }
  }

  async editImage(
    request: GatewayImageEditRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<GatewayImageGenerationResponse> {
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const model = this.resolveModel(request.model, providerId, authContext);
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider.capabilities.imageEditing || !provider.editImage) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not support image editing.`,
      );
    }

    try {
      const providerAccess =
        await this.providerCredentialService.resolveProviderAccess(
          authContext.emailHash,
          provider.providerId,
        );

      return await provider.editImage(
        {
          ...request,
          providerId,
          model,
        },
        {
          requestId: crypto.randomUUID(),
          userId: authContext.userId,
          providerAccess,
        },
      );
    } catch (error) {
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
}
