import { BadRequestException, Injectable } from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';
import type { ProviderId } from '@lxp/domain';

import type { GatewayAuthContext } from '../auth/auth.types';
import { GatewayService } from '../gateway/gateway.service';
import { ProviderCredentialService } from '../gateway/provider-credential.service';
import { ProviderRegistryService } from '../gateway/provider-registry.service';
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
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

@Injectable()
export class OpenAiCompatibleService {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
  ) {}

  async listModels(
    authContext: GatewayAuthContext,
  ): Promise<OpenAiCompatibleModelListResponse> {
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
            authContext.emailHash,
            provider.providerId,
          );
        const models = await provider.listModels({
          requestId,
          userId: authContext.userId,
          providerAccess,
        });

        for (const model of models) {
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
        messages: this.normalizeMessages(request.messages),
      },
      authContext,
    );

    return this.mapChatResponse(gatewayResponse);
  }

  async createChatCompletionStream(
    request: OpenAiCompatibleChatCompletionsRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<{ requestId: string; stream: ReadableStream<Uint8Array> }> {
    const modelTarget = this.parseModelTarget(request.model, authContext);
    return this.gatewayService.chatStream(
      {
        providerId: modelTarget.providerId,
        model: modelTarget.model,
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
      if (typeof message.content !== 'string') {
        throw new BadRequestException(
          'The OpenAI-compatible facade currently supports text-only message content.',
        );
      }

      return {
        role: message.role,
        content: message.content,
      };
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
          },
          finish_reason: response.finishReason ?? null,
        },
      ],
      usage: response.usage
        ? {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens,
          }
        : undefined,
    };
  }
}
