import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  GatewayChatContentPart,
  GatewayChatReasoningRequest,
  GatewayChatResponse,
} from '@lxp/contracts';
import type { ProviderId } from '@lxp/domain';

import type { GatewayAuthContext } from '../auth/auth.types';
import {
  GatewayService,
  type GatewayChatStreamSession,
} from '../gateway/gateway.service';
import { IntegrationClientScopeService } from '../gateway/integration-client-scope.service';
import { ProviderCredentialService } from '../gateway/provider-credential.service';
import { ProviderRegistryService } from '../gateway/provider-registry.service';
import { TenantModelAccessRuleService } from '../gateway/tenant-model-access-rule.service';
import type { OpenAiCompatibleChatCompletionsRequestDto } from './dto/openai-compatible-chat-completions-request.dto';

type OpenAiCompatibleModelListResponse = {
  object: 'list';
  data: Array<{
    id: string;
    object: 'model';
    created: number;
    owned_by: string;
  }>;
};

type OpenAiCompatibleChatCompletionResponse = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      reasoning?: string;
      reasoning_details?: unknown;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    reasoning_tokens?: number;
  };
};

@Injectable()
export class OpenAiCompatibleService {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
    private readonly integrationClientScopeService: IntegrationClientScopeService,
    private readonly tenantModelAccessRuleService: TenantModelAccessRuleService,
  ) {}

  async listModels(
    authContext: GatewayAuthContext,
  ): Promise<OpenAiCompatibleModelListResponse> {
    this.integrationClientScopeService.assertScope(authContext, 'models:list');
    const created = Math.floor(Date.now() / 1000);
    const requestId = crypto.randomUUID();
    const data: OpenAiCompatibleModelListResponse['data'] = [];

    for (const provider of this.providerRegistry.listProviders()) {
      if (!provider.listModels) {
        continue;
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

        for (const model of filteredModels) {
          data.push({
            id: this.composeModelId(provider.providerId, model.id),
            object: 'model',
            created,
            owned_by: provider.providerId,
          });
        }
      } catch {
        continue;
      }
    }

    data.sort((left, right) => left.id.localeCompare(right.id));

    return {
      object: 'list',
      data,
    };
  }

  async createChatCompletion(
    request: OpenAiCompatibleChatCompletionsRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<OpenAiCompatibleChatCompletionResponse> {
    const modelTarget = this.parseModelTarget(request.model, authContext);
    const gatewayResponse = await this.gatewayService.chat(
      {
        providerId: modelTarget.providerId,
        model: modelTarget.model,
        maxOutputTokens: this.resolveMaxOutputTokens(request),
        reasoning: this.resolveReasoning(request.reasoning_effort),
        messages: this.normalizeMessages(request.messages),
      },
      authContext,
    );

    return this.mapChatResponse(gatewayResponse);
  }

  async createChatCompletionStream(
    request: OpenAiCompatibleChatCompletionsRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<GatewayChatStreamSession> {
    const modelTarget = this.parseModelTarget(request.model, authContext);
    return this.gatewayService.chatStream(
      {
        providerId: modelTarget.providerId,
        model: modelTarget.model,
        maxOutputTokens: this.resolveMaxOutputTokens(request),
        reasoning: this.resolveReasoning(request.reasoning_effort),
        messages: this.normalizeMessages(request.messages),
        stream: true,
      },
      authContext,
    );
  }

  private normalizeMessages(
    messages: OpenAiCompatibleChatCompletionsRequestDto['messages'],
  ) {
    return messages.map((message) => {
      if (typeof message.content === 'string') {
        return {
          role: message.role,
          content: message.content,
          ...(message.reasoning_content
            ? { reasoningContent: message.reasoning_content }
            : {}),
          ...(message.reasoning_details !== undefined
            ? { reasoningDetails: message.reasoning_details }
            : {}),
        };
      }

      if (Array.isArray(message.content)) {
        const normalizedContent = this.normalizeContentParts(message.content);
        if (!normalizedContent.length) {
          throw new BadRequestException(
            'The OpenAI-compatible facade requires at least one supported content block per chat message.',
          );
        }

        return {
          role: message.role,
          content: normalizedContent,
        };
      }

      throw new BadRequestException(
        'The OpenAI-compatible facade currently supports text-only chat message content.',
      );
    });
  }

  private normalizeContentParts(content: unknown[]): GatewayChatContentPart[] {
    return content.map((part) => {
      if (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return {
          type: 'text',
          text: part.text,
        };
      }

      if (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'image_url' &&
        'image_url' in part &&
        typeof part.image_url === 'object' &&
        part.image_url !== null &&
        'url' in part.image_url &&
        typeof part.image_url.url === 'string'
      ) {
        const detail =
          'detail' in part.image_url &&
          typeof part.image_url.detail === 'string'
            ? part.image_url.detail
            : undefined;

        return {
          type: 'image_url',
          image_url: {
            url: part.image_url.url,
            detail,
          },
        };
      }

      throw new BadRequestException(
        'The OpenAI-compatible facade only supports text and image_url chat content blocks at the moment.',
      );
    });
  }

  private parseModelTarget(
    rawModelId: string,
    authContext: GatewayAuthContext,
  ): { providerId: ProviderId; model: string } {
    for (const provider of this.providerRegistry.listProviders()) {
      const prefix = `${provider.providerId}/`;
      if (rawModelId.startsWith(prefix)) {
        return {
          providerId: provider.providerId,
          model: rawModelId.slice(prefix.length),
        };
      }
    }

    if (authContext.defaultProviderId) {
      return {
        providerId: authContext.defaultProviderId,
        model: rawModelId,
      };
    }

    throw new BadRequestException(
      'OpenAI-compatible model identifiers must include a provider prefix such as "openrouter/meta-llama/llama-3.3-70b-instruct".',
    );
  }

  private composeModelId(providerId: string, modelId: string): string {
    return `${providerId}/${modelId}`;
  }

  private resolveMaxOutputTokens(
    request: OpenAiCompatibleChatCompletionsRequestDto,
  ): number | undefined {
    const candidates = [
      request.max_completion_tokens,
      request.max_tokens,
    ] as const;

    for (const candidate of candidates) {
      if (
        typeof candidate === 'number' &&
        Number.isInteger(candidate) &&
        candidate > 0
      ) {
        return candidate;
      }
    }

    return undefined;
  }

  private resolveReasoning(
    value: unknown,
  ): GatewayChatReasoningRequest | undefined {
    if (value === undefined) return undefined;
    if (value === 'none') return { enabled: false } as const;
    if (
      value === 'minimal' ||
      value === 'low' ||
      value === 'medium' ||
      value === 'high' ||
      value === 'xhigh' ||
      value === 'max'
    ) {
      return { effort: value };
    }

    throw new BadRequestException(
      'reasoning_effort must be one of none, minimal, low, medium, high, xhigh, or max.',
    );
  }

  private mapChatResponse(
    response: GatewayChatResponse,
  ): OpenAiCompatibleChatCompletionResponse {
    return {
      id: response.requestId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this.composeModelId(response.providerId, response.model),
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.message.content,
            ...(response.message.reasoning
              ? { reasoning: response.message.reasoning }
              : {}),
            ...(response.message.reasoningDetails !== undefined
              ? { reasoning_details: response.message.reasoningDetails }
              : {}),
          },
          finish_reason: response.finishReason ?? null,
        },
      ],
      usage: response.usage
        ? {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens,
            reasoning_tokens: response.usage.reasoningTokens,
          }
        : undefined,
    };
  }
}
