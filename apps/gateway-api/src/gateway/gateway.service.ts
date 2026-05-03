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
import { IntegrationClientScopeService } from './integration-client-scope.service';
import {
  ModelAccessPolicyException,
  TenantModelAccessRuleService,
} from './tenant-model-access-rule.service';
import {
  TenantPolicyLimitException,
  TenantPolicyService,
} from './tenant-policy.service';
import { ProviderRegistryService } from './provider-registry.service';
import { TenantProviderConfigurationService } from './tenant-provider-configuration.service';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import type { UsageEventCredentialScopeUsed } from '../persistence/entities/usage-event.entity';

type MessageSummary = {
  messageCount?: number;
  messageCharacters?: number;
};

export type GatewayChatStreamSession = {
  requestId: string;
  providerId: string;
  model: string;
  startedAt: number;
  messageSummary: MessageSummary;
  credentialScopeUsed: UsageEventCredentialScopeUsed;
  stream: ReadableStream<Uint8Array>;
};

@Injectable()
export class GatewayService {
  constructor(
    private readonly gatewayAuditService: GatewayAuditService,
    private readonly gatewayTelemetryService: GatewayTelemetryService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
    private readonly integrationClientScopeService: IntegrationClientScopeService,
    private readonly tenantModelAccessRuleService: TenantModelAccessRuleService,
    private readonly tenantProviderConfigurationService: TenantProviderConfigurationService,
    private readonly tenantRlsService: TenantRlsService,
    private readonly tenantPolicyService?: TenantPolicyService,
  ) {}

  async listModels(query: ListModelsQueryDto, authContext: GatewayAuthContext) {
    this.integrationClientScopeService.assertScope(
      authContext,
      'models:list',
    );
    const providerId = this.resolveProviderId(query.providerId, authContext);
    const configuration =
      await this.tenantProviderConfigurationService.assertProviderEnabled(
        authContext.activeTenantId,
        providerId,
      );
    const provider = this.providerRegistry.getProvider(providerId);
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
      const filteredModels =
        await this.tenantModelAccessRuleService.filterTextModels(
          authContext.activeTenantId,
          provider.providerId,
          models,
        );

      return {
        providerId: provider.providerId,
        models: filteredModels,
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
    this.integrationClientScopeService.assertScope(
      authContext,
      'chat:completion',
    );
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const configuration =
      await this.tenantProviderConfigurationService.assertProviderEnabled(
        authContext.activeTenantId,
        providerId,
      );
    const model = this.tenantProviderConfigurationService.resolveTextModel(
      request.model,
      providerId,
      authContext,
      configuration,
    );
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
      await this.tenantRlsService.withTenantLockContext(
        authContext.activeTenantId,
        async (manager) => {
          await this.tenantModelAccessRuleService.assertTextModelAllowed(
            authContext.activeTenantId,
            providerId,
            model,
          );
          await this.tenantPolicyService?.assertTextRequestAllowed(
            {
              tenantId: authContext.activeTenantId,
              providerId,
              model,
            },
            manager,
          );
          await this.gatewayTelemetryService.reserveChatUsageEvent(
            {
              authContext,
              requestId,
              providerId: provider.providerId,
              model,
              stream: false,
              messageSummary,
            },
            manager,
          );
        },
      );
      const { providerAccess, credentialScopeUsed } =
        await this.providerCredentialService.resolveProviderAccessWithSource(
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
          credentialScopeUsed,
          response,
        }),
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown gateway error.';
      if (error instanceof ModelAccessPolicyException) {
        await this.recordTelemetrySafely(() =>
          this.gatewayTelemetryService.recordBlockedByPolicy({
            authContext,
            requestId,
            providerId: provider.providerId,
            model,
            operation: 'chat',
            capability: 'text',
            route: '/api/v1/chat',
            latencyMs: Date.now() - startedAt,
            error: errorMessage,
            errorCode: 'model_access_denied',
            metadata: {
              stream: false,
            },
          }),
        );
        throw error;
      }
      if (error instanceof TenantPolicyLimitException) {
        await this.recordTelemetrySafely(() =>
          this.gatewayTelemetryService.recordBlockedByQuota({
            authContext,
            requestId,
            providerId: provider.providerId,
            model,
            operation: 'chat',
            capability: 'text',
            route: '/api/v1/chat',
            latencyMs: Date.now() - startedAt,
            error: errorMessage,
            errorCode: error.errorCode,
            metadata: {
              stream: false,
              ...(error.metadata ?? {}),
            },
          }),
        );
        throw error;
      }
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
          errorCode:
            error instanceof ModelAccessPolicyException
              ? 'model_access_denied'
              : 'gateway_error',
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
  ): Promise<GatewayChatStreamSession> {
    this.integrationClientScopeService.assertScope(
      authContext,
      'chat:completion',
    );
    const providerId = this.resolveProviderId(request.providerId, authContext);
    const configuration =
      await this.tenantProviderConfigurationService.assertProviderEnabled(
        authContext.activeTenantId,
        providerId,
      );
    const model = this.tenantProviderConfigurationService.resolveTextModel(
      request.model,
      providerId,
      authContext,
      configuration,
    );
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
      await this.tenantRlsService.withTenantLockContext(
        authContext.activeTenantId,
        async (manager) => {
          await this.tenantModelAccessRuleService.assertTextModelAllowed(
            authContext.activeTenantId,
            providerId,
            model,
          );
          await this.tenantPolicyService?.assertTextRequestAllowed(
            {
              tenantId: authContext.activeTenantId,
              providerId,
              model,
            },
            manager,
          );
          await this.gatewayTelemetryService.reserveChatUsageEvent(
            {
              authContext,
              requestId,
              providerId: provider.providerId,
              model,
              stream: true,
              messageSummary,
            },
            manager,
          );
        },
      );
      const { providerAccess, credentialScopeUsed } =
        await this.providerCredentialService.resolveProviderAccessWithSource(
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

      return {
        requestId,
        providerId: provider.providerId,
        model,
        startedAt,
        messageSummary,
        credentialScopeUsed,
        stream,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown gateway error.';
      if (error instanceof ModelAccessPolicyException) {
        await this.recordTelemetrySafely(() =>
          this.gatewayTelemetryService.recordBlockedByPolicy({
            authContext,
            requestId,
            providerId: provider.providerId,
            model,
            operation: 'chat',
            capability: 'text',
            route: '/api/v1/chat',
            latencyMs: Date.now() - startedAt,
            error: errorMessage,
            errorCode: 'model_access_denied',
            metadata: {
              stream: true,
            },
          }),
        );
        throw error;
      }
      if (error instanceof TenantPolicyLimitException) {
        await this.recordTelemetrySafely(() =>
          this.gatewayTelemetryService.recordBlockedByQuota({
            authContext,
            requestId,
            providerId: provider.providerId,
            model,
            operation: 'chat',
            capability: 'text',
            route: '/api/v1/chat',
            latencyMs: Date.now() - startedAt,
            error: errorMessage,
            errorCode: error.errorCode,
            metadata: {
              stream: true,
              ...(error.metadata ?? {}),
            },
          }),
        );
        throw error;
      }
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
          errorCode:
            error instanceof ModelAccessPolicyException
              ? 'model_access_denied'
              : 'gateway_error',
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

  async recordChatStreamSuccess(
    authContext: GatewayAuthContext,
    session: Pick<
      GatewayChatStreamSession,
      | 'requestId'
      | 'providerId'
      | 'model'
      | 'startedAt'
      | 'messageSummary'
      | 'credentialScopeUsed'
    >,
    response: GatewayChatResponse,
  ): Promise<void> {
    this.gatewayAuditService.logSucceeded({
      requestId: session.requestId,
      providerId: session.providerId,
      model: session.model,
      resolvedUserUuid: authContext.userUuid,
      userFingerprint: this.gatewayAuditService.fingerprint(
        authContext.emailHash,
      ),
      identitySource: authContext.identitySource,
      tenantId: authContext.activeTenantId,
      tenantSlug: authContext.activeTenantSlug,
      stream: true,
      messageCount: session.messageSummary.messageCount ?? 0,
      messageCharacters: session.messageSummary.messageCharacters ?? 0,
      durationMs: Date.now() - session.startedAt,
      outcome: 'success',
    });

    await this.recordTelemetrySafely(() =>
      this.gatewayTelemetryService.recordChatSuccess({
        authContext,
        requestId: session.requestId,
        providerId: session.providerId,
        model: session.model,
        route: '/api/v1/chat',
        latencyMs: Date.now() - session.startedAt,
        stream: true,
        messageSummary: session.messageSummary,
        credentialScopeUsed: session.credentialScopeUsed,
        response,
      }),
    );
  }

  async recordChatStreamFailure(
    authContext: GatewayAuthContext,
    session: Pick<
      GatewayChatStreamSession,
      | 'requestId'
      | 'providerId'
      | 'model'
      | 'startedAt'
      | 'messageSummary'
      | 'credentialScopeUsed'
    >,
    errorMessage: string,
  ): Promise<void> {
    this.gatewayAuditService.logFailed({
      requestId: session.requestId,
      providerId: session.providerId,
      model: session.model,
      resolvedUserUuid: authContext.userUuid,
      userFingerprint: this.gatewayAuditService.fingerprint(
        authContext.emailHash,
      ),
      identitySource: authContext.identitySource,
      tenantId: authContext.activeTenantId,
      tenantSlug: authContext.activeTenantSlug,
      stream: true,
      messageCount: session.messageSummary.messageCount ?? 0,
      messageCharacters: session.messageSummary.messageCharacters ?? 0,
      durationMs: Date.now() - session.startedAt,
      outcome: 'failure',
      error: errorMessage,
    });

    await this.recordTelemetrySafely(() =>
      this.gatewayTelemetryService.recordChatFailure({
        authContext,
        requestId: session.requestId,
        providerId: session.providerId,
        model: session.model,
        route: '/api/v1/chat',
        latencyMs: Date.now() - session.startedAt,
        stream: true,
        messageSummary: session.messageSummary,
        credentialScopeUsed: session.credentialScopeUsed,
        error: errorMessage,
      }),
    );
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
  private async recordTelemetrySafely(work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      console.warn('Gateway telemetry write failed.', error);
    }
  }
}
