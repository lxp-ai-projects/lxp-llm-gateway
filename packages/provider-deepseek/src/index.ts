import type { ProviderExecutionContext, ProviderModel } from '@lxp/provider-sdk';
import {
  OpenAiCompatibleTextProviderAdapter,
} from '@lxp/provider-sdk';

const DEPRECATED_MODEL_IDS = new Set(['deepseek-chat', 'deepseek-reasoner']);

const MODEL_NAME_BY_ID: Record<string, string> = {
  'deepseek-v4-flash': 'DeepSeek V4 Flash',
  'deepseek-v4-pro': 'DeepSeek V4 Pro',
};

export class DeepSeekProviderAdapter extends OpenAiCompatibleTextProviderAdapter {
  constructor(
    baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    requestTimeoutMs = Number(
      process.env.DEEPSEEK_REQUEST_TIMEOUT_MS ?? '90000',
    ),
  ) {
    super({
      providerId: 'deepseek',
      displayName: 'DeepSeek',
      defaultBaseUrl: baseUrl,
      requestTimeoutMs,
      mapModels: (payload, context) => mapDeepSeekModels(payload, context),
    });
  }
}

function mapDeepSeekModels(
  payload: { data?: Array<{ id: string; name?: string }> } | Array<{ id: string; name?: string }>,
  context: ProviderExecutionContext,
): ProviderModel[] {
  void context;
  const data = Array.isArray(payload) ? payload : payload.data ?? [];
  return data
    .filter((model) => !DEPRECATED_MODEL_IDS.has(model.id))
    .map((model) => ({
      id: model.id,
      displayName: model.name ?? MODEL_NAME_BY_ID[model.id] ?? model.id,
    }));
}
