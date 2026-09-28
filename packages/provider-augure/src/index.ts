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
      mapModels: (payload, context) => mapAugureModels(payload, context),
      mapProviderMetadata: (payload) => mapAugureProviderMetadata(payload),
    });
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

function mapAugureModels(
  payload:
    | {
        data?: Array<{
          id: string;
          name?: string;
          capabilities?: { reasoning?: boolean | { supported?: boolean } };
        }>;
      }
    | Array<{
        id: string;
        name?: string;
        capabilities?: { reasoning?: boolean | { supported?: boolean } };
      }>,
  context: ProviderExecutionContext,
): ProviderModel[] {
  void context;
  const data = Array.isArray(payload) ? payload : (payload.data ?? []);
  return data
    .filter((model) => !COMPATIBILITY_ALIASES.has(model.id))
    .map((model) => {
      const declaredReasoning = model.capabilities?.reasoning;
      const reasoningSupported =
        typeof declaredReasoning === 'boolean'
          ? declaredReasoning
          : declaredReasoning?.supported;
      return {
        id: model.id,
        displayName: model.name ?? model.id,
        ...(model.id !== 'auto' && typeof reasoningSupported === 'boolean'
          ? {
              capabilities: {
                reasoning: {
                  supported: reasoningSupported,
                  controls: [],
                  source: {
                    kind: 'provider-api' as const,
                    providerId: 'augure' as const,
                    modelId: model.id,
                  },
                },
              },
            }
          : {}),
      };
    });
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
