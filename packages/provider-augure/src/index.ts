import type { GatewayChatRequest } from '@lxp/contracts';
import type {
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';
import { OpenAiCompatibleTextProviderAdapter } from '@lxp/provider-sdk';

const COMPATIBILITY_ALIASES = new Set([
  'gpt-4',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
]);

export class AugureProviderAdapter extends OpenAiCompatibleTextProviderAdapter {
  constructor(
    baseUrl = process.env.AUGURE_BASE_URL ?? 'https://api.augureai.ca/v1',
    requestTimeoutMs = resolveAugureRequestTimeoutMs(
      process.env.AUGURE_REQUEST_TIMEOUT_MS,
    ),
  ) {
    super({
      providerId: 'augure',
      displayName: 'Augure',
      defaultBaseUrl: baseUrl,
      requestTimeoutMs,
      buildRequestBody: (request, context, stream) =>
        buildAugureRequestBody(request, context, stream),
      mapProviderMetadata: (payload) => mapAugureProviderMetadata(payload),
    });
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const models = await super.listModels(context);
    return models
      .filter((model) => !COMPATIBILITY_ALIASES.has(model.id))
      .map((model) =>
        model.id === 'auto'
          ? { id: model.id, displayName: model.displayName }
          : model,
      );
  }
}

function resolveAugureRequestTimeoutMs(
  rawTimeoutMs: string | undefined,
): number {
  const parsedTimeoutMs = Number(rawTimeoutMs ?? '90000');
  return Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
    ? parsedTimeoutMs
    : 90000;
}

function buildAugureRequestBody(
  request: GatewayChatRequest,
  context: ProviderExecutionContext,
  stream: boolean,
): Record<string, unknown> {
  void context;
  return {
    model: request.model,
    messages: request.messages,
    stream,
    max_tokens: request.maxOutputTokens,
  };
}

function mapAugureProviderMetadata(
  payload: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const metadata = Object.fromEntries(
    Object.entries(payload).filter(
      ([key]) =>
        key === 'id' ||
        key === 'object' ||
        key === 'created' ||
        key.startsWith('x_'),
    ),
  );
  const augure = payload._augure;
  if (augure && typeof augure === 'object' && !Array.isArray(augure)) {
    const source = augure as Record<string, unknown>;
    const routingMetadata = Object.fromEntries(
      ['gateway_region', 'inference_region', 'request_id']
        .filter((key) => typeof source[key] === 'string')
        .map((key) => [key, source[key]]),
    );
    if (Object.keys(routingMetadata).length) {
      metadata._augure = routingMetadata;
    }
  }
  return Object.keys(metadata).length ? metadata : undefined;
}
