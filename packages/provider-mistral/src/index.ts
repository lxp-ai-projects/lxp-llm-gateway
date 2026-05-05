import type { ProviderExecutionContext, ProviderModel } from '@lxp/provider-sdk';
import type { GatewayChatRequest } from '@lxp/contracts';
import {
  OpenAiCompatibleTextProviderAdapter,
} from '@lxp/provider-sdk';

export class MistralProviderAdapter extends OpenAiCompatibleTextProviderAdapter {
  constructor(
    baseUrl = process.env.MISTRAL_BASE_URL ?? 'https://api.mistral.ai/v1',
    requestTimeoutMs = Number(process.env.MISTRAL_REQUEST_TIMEOUT_MS ?? '90000'),
  ) {
    super({
      providerId: 'mistral',
      displayName: 'Mistral',
      defaultBaseUrl: baseUrl,
      requestTimeoutMs,
      buildRequestBody: (request, context, stream) =>
        buildMistralRequestBody(request, context, stream),
      mapModels: (payload, context) => mapMistralModels(payload, context),
    });
  }
}

function buildMistralRequestBody(
  request: GatewayChatRequest,
  context: ProviderExecutionContext,
  stream: boolean,
): Record<string, unknown> {
  void context;

  return {
    model: request.model,
    messages: request.messages,
    stream,
    ...(typeof request.maxOutputTokens === 'number'
      ? { max_tokens: request.maxOutputTokens }
      : {}),
  };
}

function mapMistralModels(
  payload: { data?: Array<{ id: string; name?: string }> } | Array<{ id: string; name?: string }>,
  context: ProviderExecutionContext,
): ProviderModel[] {
  void context;
  const data = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : [];
  return data.map((model) => ({
    id: model.id,
    displayName: model.name ?? model.id,
  }));
}
