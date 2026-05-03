import { Injectable } from '@nestjs/common';
import type { GatewayChatResponse, GatewayImageGenerationResponse } from '@lxp/contracts';
import type { EntityManager } from 'typeorm';

import type { GatewayAuthContext } from '../auth/auth.types';
import { AuditLogEntity } from '../persistence/entities/audit-log.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';
import type {
  UsageEventCapability,
  UsageEventCredentialScopeUsed,
  UsageEventStatus,
} from '../persistence/entities/usage-event.entity';

type MessageSummary = {
  messageCount?: number;
  messageCharacters?: number;
};

@Injectable()
export class GatewayTelemetryService {
  constructor(
    private readonly tenantRlsService: TenantRlsService,
  ) {}

  async reserveChatUsageEvent(
    params: {
      authContext: GatewayAuthContext;
      requestId: string;
      providerId: string;
      model: string;
      stream: boolean;
      messageSummary: MessageSummary;
    },
    manager: EntityManager,
  ): Promise<void> {
    await this.writeUsageEvent(
      {
        tenantId: params.authContext.activeTenantId,
        userId: params.authContext.userId,
        userUuid: params.authContext.userUuid,
        requestId: params.requestId,
        operation: 'chat',
        capability: 'text',
        providerId: params.providerId,
        model: params.model,
        identitySource: params.authContext.identitySource,
        integrationClientId: params.authContext.integrationClientId ?? null,
        apiKeyId: params.authContext.integrationClientKeyId ?? null,
        credentialScopeUsed: null,
        status: 'reserved',
        errorCode: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        reasoningTokens: null,
        imageCount: null,
        costEstimateUsd: null,
        latencyMs: null,
        metadata: {
          stream: params.stream,
          messageCount: params.messageSummary.messageCount ?? null,
          messageCharacters: params.messageSummary.messageCharacters ?? null,
        },
      },
      manager,
    );
  }

  async reserveImageUsageEvent(
    params: {
      authContext: GatewayAuthContext;
      requestId: string;
      providerId: string;
      model: string;
      operation: 'image_generation' | 'image_edit';
      promptLength: number;
    },
    manager: EntityManager,
  ): Promise<void> {
    await this.writeUsageEvent(
      {
        tenantId: params.authContext.activeTenantId,
        userId: params.authContext.userId,
        userUuid: params.authContext.userUuid,
        requestId: params.requestId,
        operation: params.operation,
        capability: 'image',
        providerId: params.providerId,
        model: params.model,
        identitySource: params.authContext.identitySource,
        integrationClientId: params.authContext.integrationClientId ?? null,
        apiKeyId: params.authContext.integrationClientKeyId ?? null,
        credentialScopeUsed: null,
        status: 'reserved',
        errorCode: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        reasoningTokens: null,
        imageCount: null,
        costEstimateUsd: null,
        latencyMs: null,
        metadata: {
          promptLength: params.promptLength,
        },
      },
      manager,
    );
  }

  async recordChatSuccess(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    route: string;
    latencyMs: number;
    stream: boolean;
    messageSummary: MessageSummary;
    credentialScopeUsed: UsageEventCredentialScopeUsed;
    response: GatewayChatResponse;
  }): Promise<void> {
    await this.tenantRlsService.withTenantContext(
      params.authContext.activeTenantId,
      async (manager) => {
        await manager.getRepository(AuditLogEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          route: params.route,
          action: params.stream ? 'chat.stream' : 'chat',
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'success',
          messageCount: params.messageSummary.messageCount ?? null,
          messageCharacters: params.messageSummary.messageCharacters ?? null,
          latencyMs: params.latencyMs,
          errorCode: null,
          errorMessage: null,
          metadata: {
            finishReason: params.response.finishReason ?? null,
            stream: params.stream,
          },
        } satisfies Partial<AuditLogEntity>);

        await this.writeUsageEvent(
          {
            tenantId: params.authContext.activeTenantId,
            userId: params.authContext.userId,
            userUuid: params.authContext.userUuid,
            requestId: params.requestId,
            operation: 'chat',
            capability: 'text',
            providerId: params.providerId,
            model: params.model,
            identitySource: params.authContext.identitySource,
            integrationClientId: params.authContext.integrationClientId ?? null,
            apiKeyId: params.authContext.integrationClientKeyId ?? null,
            credentialScopeUsed: params.credentialScopeUsed,
            status: 'success',
            errorCode: null,
            promptTokens: params.response.usage?.promptTokens ?? null,
            completionTokens: params.response.usage?.completionTokens ?? null,
            totalTokens: params.response.usage?.totalTokens ?? null,
            reasoningTokens: params.response.usage?.reasoningTokens ?? null,
            imageCount: null,
            costEstimateUsd: this.extractCostEstimateUsd(
              params.response.providerMetadata,
            ),
            latencyMs: params.latencyMs,
            metadata: {
              finishReason: params.response.finishReason ?? null,
              stream: params.stream,
            },
          },
          manager,
        );
      },
    );
  }

  async recordChatFailure(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    route: string;
    latencyMs: number;
    stream: boolean;
    messageSummary: MessageSummary;
    credentialScopeUsed?: UsageEventCredentialScopeUsed;
    error: string;
    errorCode?: string;
  }): Promise<void> {
    await this.tenantRlsService.withTenantContext(
      params.authContext.activeTenantId,
      async (manager) => {
        await manager.getRepository(AuditLogEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          route: params.route,
          action: params.stream ? 'chat.stream' : 'chat',
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'failure',
          messageCount: params.messageSummary.messageCount ?? null,
          messageCharacters: params.messageSummary.messageCharacters ?? null,
          latencyMs: params.latencyMs,
          errorCode: params.errorCode ?? 'gateway_error',
          errorMessage: params.error,
          metadata: {
            stream: params.stream,
          },
        } satisfies Partial<AuditLogEntity>);

        await this.writeUsageEvent(
          {
            tenantId: params.authContext.activeTenantId,
            userId: params.authContext.userId,
            userUuid: params.authContext.userUuid,
            requestId: params.requestId,
            operation: 'chat',
            capability: 'text',
            providerId: params.providerId,
            model: params.model,
            identitySource: params.authContext.identitySource,
            integrationClientId: params.authContext.integrationClientId ?? null,
            apiKeyId: params.authContext.integrationClientKeyId ?? null,
            credentialScopeUsed: params.credentialScopeUsed ?? null,
            status: 'error',
            errorCode: params.errorCode ?? 'gateway_error',
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            reasoningTokens: null,
            imageCount: null,
            costEstimateUsd: null,
            latencyMs: params.latencyMs,
            metadata: {
              stream: params.stream,
              messageCount: params.messageSummary.messageCount ?? null,
              messageCharacters:
                params.messageSummary.messageCharacters ?? null,
            },
          },
          manager,
        );
      },
    );
  }

  async recordImageSuccess(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    operation: 'image_generation' | 'image_edit';
    route: string;
    latencyMs: number;
    promptLength: number;
    credentialScopeUsed: UsageEventCredentialScopeUsed;
    response: GatewayImageGenerationResponse;
  }): Promise<void> {
    await this.tenantRlsService.withTenantContext(
      params.authContext.activeTenantId,
      async (manager) => {
        await manager.getRepository(AuditLogEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          route: params.route,
          action: params.operation,
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'success',
          messageCount: 1,
          messageCharacters: params.promptLength,
          latencyMs: params.latencyMs,
          errorCode: null,
          errorMessage: null,
          metadata: {
            imageCount: params.response.images.length,
          },
        } satisfies Partial<AuditLogEntity>);

        await this.writeUsageEvent(
          {
            tenantId: params.authContext.activeTenantId,
            userId: params.authContext.userId,
            userUuid: params.authContext.userUuid,
            requestId: params.requestId,
            operation: params.operation,
            capability: 'image',
            providerId: params.providerId,
            model: params.model,
            identitySource: params.authContext.identitySource,
            integrationClientId: params.authContext.integrationClientId ?? null,
            apiKeyId: params.authContext.integrationClientKeyId ?? null,
            credentialScopeUsed: params.credentialScopeUsed,
            status: 'success',
            errorCode: null,
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            reasoningTokens: null,
            imageCount: params.response.images.length,
            costEstimateUsd: this.extractCostEstimateUsd(
              params.response.providerMetadata,
            ),
            latencyMs: params.latencyMs,
            metadata: params.response.providerMetadata ?? null,
          },
          manager,
        );
      },
    );
  }

  async recordImageFailure(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    operation: 'image_generation' | 'image_edit';
    route: string;
    latencyMs: number;
    promptLength: number;
    credentialScopeUsed?: UsageEventCredentialScopeUsed;
    error: string;
    errorCode?: string;
  }): Promise<void> {
    await this.tenantRlsService.withTenantContext(
      params.authContext.activeTenantId,
      async (manager) => {
        await manager.getRepository(AuditLogEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          route: params.route,
          action: params.operation,
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'failure',
          messageCount: 1,
          messageCharacters: params.promptLength,
          latencyMs: params.latencyMs,
          errorCode: params.errorCode ?? 'gateway_error',
          errorMessage: params.error,
          metadata: null,
        } satisfies Partial<AuditLogEntity>);

        await this.writeUsageEvent(
          {
            tenantId: params.authContext.activeTenantId,
            userId: params.authContext.userId,
            userUuid: params.authContext.userUuid,
            requestId: params.requestId,
            operation: params.operation,
            capability: 'image',
            providerId: params.providerId,
            model: params.model,
            identitySource: params.authContext.identitySource,
            integrationClientId: params.authContext.integrationClientId ?? null,
            apiKeyId: params.authContext.integrationClientKeyId ?? null,
            credentialScopeUsed: params.credentialScopeUsed ?? null,
            status: 'error',
            errorCode: params.errorCode ?? 'gateway_error',
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            reasoningTokens: null,
            imageCount: null,
            costEstimateUsd: null,
            latencyMs: params.latencyMs,
            metadata: {
              promptLength: params.promptLength,
            },
          },
          manager,
        );
      },
    );
  }

  async recordBlockedByPolicy(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    operation: 'chat' | 'image_generation' | 'image_edit';
    capability: UsageEventCapability;
    route: string;
    latencyMs: number;
    error: string;
    errorCode: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.recordUsageEvent({
      authContext: params.authContext,
      requestId: params.requestId,
      operation: params.operation,
      capability: params.capability,
      providerId: params.providerId,
      model: params.model,
      status: 'blocked_by_policy',
      errorCode: params.errorCode,
      latencyMs: params.latencyMs,
      route: params.route,
      error: params.error,
      metadata: params.metadata ?? null,
    });
  }

  async recordBlockedByQuota(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    operation: 'chat' | 'image_generation' | 'image_edit';
    capability: UsageEventCapability;
    route: string;
    latencyMs: number;
    error: string;
    errorCode: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.recordUsageEvent({
      authContext: params.authContext,
      requestId: params.requestId,
      operation: params.operation,
      capability: params.capability,
      providerId: params.providerId,
      model: params.model,
      status: 'blocked_by_quota',
      errorCode: params.errorCode,
      latencyMs: params.latencyMs,
      route: params.route,
      error: params.error,
      metadata: params.metadata ?? null,
    });
  }

  private async recordUsageEvent(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    operation: 'chat' | 'image_generation' | 'image_edit';
    capability: UsageEventCapability;
    providerId: string;
    model: string;
    status: UsageEventStatus;
    errorCode: string | null;
    latencyMs: number;
    route: string;
    error: string;
    metadata: Record<string, unknown> | null;
  }): Promise<void> {
    await this.tenantRlsService.withTenantContext(
      params.authContext.activeTenantId,
      async (manager) => {
        await manager.getRepository(AuditLogEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          route: params.route,
          action: params.operation,
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'failure',
          messageCount: null,
          messageCharacters: null,
          latencyMs: params.latencyMs,
          errorCode: params.errorCode,
          errorMessage: params.error,
          metadata: params.metadata,
        } satisfies Partial<AuditLogEntity>);

        await this.writeUsageEvent(
          {
            tenantId: params.authContext.activeTenantId,
            userId: params.authContext.userId,
            userUuid: params.authContext.userUuid,
            requestId: params.requestId,
            operation: params.operation,
            capability: params.capability,
            providerId: params.providerId,
            model: params.model,
            identitySource: params.authContext.identitySource,
            integrationClientId: params.authContext.integrationClientId ?? null,
            apiKeyId: params.authContext.integrationClientKeyId ?? null,
            credentialScopeUsed: null,
            status: params.status,
            errorCode: params.errorCode,
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            reasoningTokens: null,
            imageCount: null,
            costEstimateUsd: null,
            latencyMs: params.latencyMs,
            metadata: params.metadata,
          },
          manager,
        );
      },
    );
  }

  private async writeUsageEvent(
    entry: Partial<UsageEventEntity> & { tenantId: string; requestId: string },
    manager: EntityManager,
  ): Promise<void> {
    await this.upsertUsageEvent(manager, entry);
  }

  private async upsertUsageEvent(
    manager: EntityManager,
    entry: Partial<UsageEventEntity> & { tenantId: string; requestId: string },
  ): Promise<void> {
    const repository = manager.getRepository(UsageEventEntity);
    const existing = await repository.findOne({
      where: {
        tenantId: entry.tenantId,
        requestId: entry.requestId,
      },
    });

    await repository.save({
      ...(existing ?? {}),
      ...entry,
    });
  }



  private extractCostEstimateUsd(
    providerMetadata: Record<string, unknown> | null | undefined,
  ): string | null {
    if (!providerMetadata) {
      return null;
    }

    const pricing = providerMetadata['x_nanogpt_pricing'];
    if (
      pricing &&
      typeof pricing === 'object' &&
      pricing !== null &&
      'amount' in pricing
    ) {
      const amount = pricing.amount;
      if (typeof amount === 'number' && Number.isFinite(amount)) {
        return amount.toFixed(6);
      }
    }

    return null;
  }
}
