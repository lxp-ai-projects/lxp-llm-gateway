import { Injectable } from '@nestjs/common';
import type { GatewayChatResponse, GatewayImageGenerationResponse } from '@lxp/contracts';

import type { GatewayAuthContext } from '../auth/auth.types';
import { AuditLogEntity } from '../persistence/entities/audit-log.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';

type MessageSummary = {
  messageCount?: number;
  messageCharacters?: number;
};

@Injectable()
export class GatewayTelemetryService {
  constructor(
    private readonly tenantRlsService: TenantRlsService,
  ) {}

  async recordChatSuccess(params: {
    authContext: GatewayAuthContext;
    requestId: string;
    providerId: string;
    model: string;
    route: string;
    latencyMs: number;
    stream: boolean;
    messageSummary: MessageSummary;
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

        await manager.getRepository(UsageEventEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          operation: 'chat',
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'success',
          promptTokens: params.response.usage?.promptTokens ?? null,
          completionTokens: params.response.usage?.completionTokens ?? null,
          totalTokens: params.response.usage?.totalTokens ?? null,
          reasoningTokens: params.response.usage?.reasoningTokens ?? null,
          imageCount: null,
          costEstimateUsd: this.extractCostEstimateUsd(params.response.providerMetadata),
          latencyMs: params.latencyMs,
          metadata: {
            finishReason: params.response.finishReason ?? null,
            stream: params.stream,
          },
        } satisfies Partial<UsageEventEntity>);
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
    error: string;
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
          errorCode: 'gateway_error',
          errorMessage: params.error,
          metadata: {
            stream: params.stream,
          },
        } satisfies Partial<AuditLogEntity>);
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

        await manager.getRepository(UsageEventEntity).save({
          tenantId: params.authContext.activeTenantId,
          userId: params.authContext.userId,
          userUuid: params.authContext.userUuid,
          requestId: params.requestId,
          operation: params.operation,
          providerId: params.providerId,
          model: params.model,
          identitySource: params.authContext.identitySource,
          integrationClientId: params.authContext.integrationClientId ?? null,
          status: 'success',
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          reasoningTokens: null,
          imageCount: params.response.images.length,
          costEstimateUsd: this.extractCostEstimateUsd(params.response.providerMetadata),
          latencyMs: params.latencyMs,
          metadata: params.response.providerMetadata ?? null,
        } satisfies Partial<UsageEventEntity>);
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
    error: string;
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
          errorCode: 'gateway_error',
          errorMessage: params.error,
          metadata: null,
        } satisfies Partial<AuditLogEntity>);
      },
    );
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
