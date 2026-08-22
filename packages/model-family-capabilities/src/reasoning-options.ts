import type {
  GatewayChatProviderOptions,
  GatewayOpenRouterReasoning,
  GatewayReasoningEffort,
  GatewayZaiThinking,
} from '@lxp/contracts';
import {
  detectReasoningModelFamily,
  getThinkingTransportCompatibility,
  type ReasoningModelFamily,
} from '@lxp/domain';

export type ReasoningTransportProviderId = 'nanogpt' | 'openrouter';

export interface AggregatorReasoningRequestOptions {
  reasoning?: {
    enabled?: boolean;
    exclude?: boolean;
    effort?: GatewayReasoningEffort;
    max_tokens?: number;
  };
  thinking?: {
    type: GatewayZaiThinking['type'];
    clear_thinking?: boolean;
  };
  minimumOutputTokens?: number;
}

type ConfiguredFamilyOption = {
  family: ReasoningModelFamily;
  key: string;
  value: unknown;
};

export function resolveAggregatorReasoningOptions(
  providerId: ReasoningTransportProviderId,
  modelId: string | undefined,
  providerOptions: GatewayChatProviderOptions | undefined,
): AggregatorReasoningRequestOptions {
  const family = detectReasoningModelFamily(modelId);
  const configuredOptions = collectConfiguredFamilyOptions(providerOptions);
  const legacyOpenRouterReasoning = providerOptions?.openrouter?.reasoning;
  const nanoGptReasoning = providerOptions?.nanogpt?.reasoning;

  if (nanoGptReasoning && providerId !== 'nanogpt') {
    throw new Error(
      `providerOptions.nanogpt.reasoning cannot be relayed by ${providerId}.`,
    );
  }

  if (
    nanoGptReasoning &&
    (configuredOptions.length > 0 || legacyOpenRouterReasoning)
  ) {
    throw new Error(
      'Reasoning options are ambiguous: providerOptions.nanogpt.reasoning cannot be combined with family or OpenRouter options.',
    );
  }

  if (providerId !== 'openrouter' && legacyOpenRouterReasoning) {
    throw new Error(
      `providerOptions.openrouter.reasoning cannot be relayed by ${providerId}.`,
    );
  }

  if (configuredOptions.length > 1) {
    throw new Error(
      `Reasoning options are ambiguous: ${configuredOptions
        .map((option) => option.key)
        .join(', ')} were supplied together.`,
    );
  }

  if (legacyOpenRouterReasoning && configuredOptions.length > 0) {
    throw new Error(
      'Reasoning options are ambiguous: providerOptions.openrouter.reasoning cannot be combined with family options.',
    );
  }

  // OpenRouter's catalog can declare reasoning before LXP knows the model family.
  if (legacyOpenRouterReasoning) {
    return {
      reasoning: mapOpenRouterReasoning(legacyOpenRouterReasoning),
    };
  }

  const configuredOption = configuredOptions[0];
  if (configuredOption && configuredOption.family !== family) {
    throw new Error(
      `${configuredOption.key} targets ${configuredOption.family}, but model ${modelId ?? '<missing>'} belongs to ${family ?? 'no supported reasoning family'}.`,
    );
  }

  if (!configuredOption && !legacyOpenRouterReasoning && !nanoGptReasoning) {
    return {};
  }

  if (nanoGptReasoning) {
    return mapNanoGptReasoning(nanoGptReasoning);
  }

  const compatibility = getThinkingTransportCompatibility(providerId, modelId);
  if (!family || !compatibility) {
    throw new Error(
      `Reasoning options are not supported for ${providerId}/${modelId ?? '<missing>'}.`,
    );
  }

  if (family === 'anthropic-claude') {
    return mapAnthropicReasoning(providerId, configuredOption?.value);
  }

  if (family === 'openai-reasoning' || family === 'xai-grok') {
    return mapEffortReasoning(providerId, configuredOption?.value);
  }

  return mapZaiReasoning(providerId, configuredOption?.value);
}

function mapNanoGptReasoning(reasoning: {
  effort: GatewayReasoningEffort;
}): AggregatorReasoningRequestOptions {
  if (reasoning.effort === 'max') {
    throw new Error(
      'NanoGPT Chat Completions does not document reasoning effort "max"; use "xhigh" or a lower effort.',
    );
  }

  return { reasoning: { effort: reasoning.effort } };
}

function collectConfiguredFamilyOptions(
  providerOptions: GatewayChatProviderOptions | undefined,
): ConfiguredFamilyOption[] {
  const options: Array<ConfiguredFamilyOption | null> = [
    providerOptions?.anthropic?.extendedThinking
      ? {
          family: 'anthropic-claude',
          key: 'providerOptions.anthropic.extendedThinking',
          value: providerOptions.anthropic.extendedThinking,
        }
      : null,
    providerOptions?.openai?.reasoning
      ? {
          family: 'openai-reasoning',
          key: 'providerOptions.openai.reasoning',
          value: providerOptions.openai.reasoning,
        }
      : null,
    providerOptions?.xai?.reasoning
      ? {
          family: 'xai-grok',
          key: 'providerOptions.xai.reasoning',
          value: providerOptions.xai.reasoning,
        }
      : null,
    providerOptions?.zai?.thinking
      ? {
          family: 'zai-glm',
          key: 'providerOptions.zai.thinking',
          value: providerOptions.zai.thinking,
        }
      : null,
  ];

  return options.filter((option): option is ConfiguredFamilyOption =>
    Boolean(option),
  );
}

function mapAnthropicReasoning(
  providerId: ReasoningTransportProviderId,
  value: unknown,
): AggregatorReasoningRequestOptions {
  const thinking = value as NonNullable<
    NonNullable<GatewayChatProviderOptions['anthropic']>['extendedThinking']
  >;

  if (thinking.mode === 'budget') {
    if (
      !Number.isInteger(thinking.budgetTokens) ||
      thinking.budgetTokens < 1024
    ) {
      throw new Error(
        'Anthropic extended thinking budgets must be integers of at least 1024 tokens.',
      );
    }

    if (providerId === 'nanogpt') {
      throw new Error(
        'NanoGPT Chat Completions does not document an exact Claude reasoning budget mapping; use adaptive mode or call Anthropic/OpenRouter.',
      );
    }

    return {
      reasoning: { max_tokens: thinking.budgetTokens },
      minimumOutputTokens: thinking.budgetTokens + 1,
    };
  }

  return {
    reasoning:
      thinking.mode === 'disabled'
        ? { effort: 'none' }
        : providerId === 'nanogpt'
          ? { effort: 'medium' }
          : { enabled: true },
  };
}

function mapEffortReasoning(
  providerId: ReasoningTransportProviderId,
  value: unknown,
): AggregatorReasoningRequestOptions {
  const reasoning = value as { effort: GatewayReasoningEffort };
  if (providerId === 'nanogpt' && reasoning.effort === 'max') {
    throw new Error(
      'NanoGPT Chat Completions does not document reasoning effort "max"; use "xhigh" or a lower effort.',
    );
  }

  return { reasoning: { effort: reasoning.effort } };
}

function mapZaiReasoning(
  providerId: ReasoningTransportProviderId,
  value: unknown,
): AggregatorReasoningRequestOptions {
  const thinking = value as GatewayZaiThinking;
  if (providerId === 'nanogpt') {
    return {
      thinking: {
        type: thinking.type,
        ...(typeof thinking.clearThinking === 'boolean'
          ? { clear_thinking: thinking.clearThinking }
          : {}),
      },
    };
  }

  if (typeof thinking.clearThinking === 'boolean') {
    throw new Error(
      'OpenRouter does not document a clear_thinking mapping for GLM reasoning.',
    );
  }

  return { reasoning: { enabled: thinking.type === 'enabled' } };
}

function mapOpenRouterReasoning(
  reasoning: GatewayOpenRouterReasoning,
): NonNullable<AggregatorReasoningRequestOptions['reasoning']> {
  if (
    reasoning.maxTokens !== undefined &&
    (!Number.isInteger(reasoning.maxTokens) || reasoning.maxTokens < 1)
  ) {
    throw new Error(
      'OpenRouter reasoning maxTokens must be a positive integer.',
    );
  }

  return {
    ...(typeof reasoning.enabled === 'boolean'
      ? { enabled: reasoning.enabled }
      : {}),
    ...(typeof reasoning.exclude === 'boolean'
      ? { exclude: reasoning.exclude }
      : {}),
    ...(reasoning.effort ? { effort: reasoning.effort } : {}),
    ...(reasoning.maxTokens !== undefined
      ? { max_tokens: reasoning.maxTokens }
      : {}),
  };
}
