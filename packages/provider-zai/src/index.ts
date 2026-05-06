import type {
  GatewayChatRequest,
  GatewayImageGenerationRequest,
} from '@lxp/contracts';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';
import {
  OpenAiCompatibleTextProviderAdapter,
} from '@lxp/provider-sdk';

import {
  buildZaiImageCatalog,
  buildZaiModelCatalog,
} from './image/catalog.js';
import { ZaiImageApiClient } from './image/api-client.js';
import { ZaiImageGenerationService } from './image/generation-service.js';

export class ZaiProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: false,
  } as const;

  private readonly textAdapter: OpenAiCompatibleTextProviderAdapter;
  private readonly imageApiClient: ZaiImageApiClient;
  private readonly imageGenerationService: ZaiImageGenerationService;

  constructor(
    baseUrl = process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/paas/v4',
    requestTimeoutMs = Number(process.env.ZAI_REQUEST_TIMEOUT_MS ?? '90000'),
    imageRequestTimeoutMs = Number(
      process.env.ZAI_IMAGE_REQUEST_TIMEOUT_MS ?? '120000',
    ),
  ) {
    this.textAdapter = new OpenAiCompatibleTextProviderAdapter({
      providerId: 'zai',
      displayName: 'Z.ai',
      defaultBaseUrl: baseUrl,
      requestTimeoutMs,
      buildRequestBody: (request, context, stream) =>
        buildZaiChatRequestBody(request, context, stream),
      mapModels: (payload) => buildZaiModelCatalog(extractModelIds(payload)),
      mapProviderMetadata: (payload) =>
        buildZaiChatProviderMetadata(payload),
    });
    this.imageApiClient = new ZaiImageApiClient(baseUrl, imageRequestTimeoutMs);
    this.imageGenerationService = new ZaiImageGenerationService(
      this.imageApiClient,
    );
  }

  get providerId(): LlmProviderAdapter['providerId'] {
    return this.textAdapter.providerId;
  }

  supportsStreaming(): boolean {
    return this.textAdapter.supportsStreaming();
  }

  listModels(context: ProviderExecutionContext): Promise<ProviderModel[]> {
    return this.textAdapter.listModels(context);
  }

  async listImageCatalog(context: ProviderExecutionContext) {
    let listedModelIds: string[] = [];
    try {
      listedModelIds = await this.imageApiClient.listModelIds(context);
    } catch (error) {
      if (!isModelListingNotSupportedError(error)) {
        throw error;
      }
    }

    return buildZaiImageCatalog(buildZaiModelCatalog(listedModelIds));
  }

  chat(request: GatewayChatRequest, context: ProviderExecutionContext) {
    return this.textAdapter.chat(request, context);
  }

  chatStream(request: GatewayChatRequest, context: ProviderExecutionContext) {
    return this.textAdapter.chatStream(request, context);
  }

  generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ) {
    return this.imageGenerationService.execute(request, context);
  }
}

function buildZaiChatRequestBody(
  request: GatewayChatRequest,
  context: ProviderExecutionContext,
  stream: boolean,
): Record<string, unknown> {
  const zaiThinking = request.providerOptions?.zai?.thinking;

  return {
    model: request.model,
    messages: request.messages.map((message) => ({
      role: message.role,
      content: message.content,
      ...(typeof message.reasoningContent === 'string' &&
      message.reasoningContent.trim()
        ? {
            reasoning_content: message.reasoningContent,
          }
        : {}),
    })),
    stream,
    request_id: context.requestId,
    user_id: context.userId,
    ...(typeof request.maxOutputTokens === 'number'
      ? { max_tokens: request.maxOutputTokens }
      : {}),
    ...(zaiThinking
      ? {
          thinking: {
            type: zaiThinking.type,
            ...(typeof zaiThinking.clearThinking === 'boolean'
              ? { clear_thinking: zaiThinking.clearThinking }
              : {}),
          },
        }
      : {}),
  };
}

function extractModelIds(
  payload:
    | { data?: Array<{ id: string; name?: string; owned_by?: string }> }
    | Array<{ id: string; name?: string; owned_by?: string }>,
) {
  const data = Array.isArray(payload) ? payload : payload.data ?? [];
  return data.map((model) => model.id);
}

function buildZaiChatProviderMetadata(payload: {
  request_id?: unknown;
  web_search?: unknown;
  [key: string]: unknown;
}) {
  const providerMetadata: Record<string, unknown> = {};

  if (typeof payload.request_id === 'string' && payload.request_id.trim()) {
    providerMetadata.request_id = payload.request_id.trim();
  }

  if (Array.isArray(payload.web_search) && payload.web_search.length > 0) {
    providerMetadata.web_search = payload.web_search;
  }

  return Object.keys(providerMetadata).length ? providerMetadata : undefined;
}

function isModelListingNotSupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    /not supported/i.test(error.message) ||
    /status (404|405|501)\b/i.test(error.message)
  );
}
