import type {
  GatewayChatReasoningRequest,
  GatewayReasoningEffort,
} from '@lxp/contracts';
import type {
  ModelReasoningCapability,
  ModelReasoningEffort,
  ProviderId,
} from '@lxp/domain';

type RegistryEntry = Omit<ModelReasoningCapability, 'source'> & {
  providerId: ProviderId;
  modelIds: readonly string[];
  sourceUrl: string;
};

const REVIEWED_AT = '2026-08-25';

const toggle: Pick<
  ModelReasoningCapability,
  'supported' | 'controls' | 'supportsToggle' | 'defaultEnabled' | 'semantic'
> = {
  supported: true,
  controls: ['toggle'],
  supportsToggle: true,
  defaultEnabled: true,
  semantic: 'reasoning-depth' as const,
};

const effort = (
  supportedEfforts: ModelReasoningEffort[],
): Pick<
  ModelReasoningCapability,
  'supported' | 'controls' | 'supportedEfforts' | 'semantic'
> => ({
  supported: true,
  controls: ['effort'],
  supportedEfforts,
  semantic: 'reasoning-depth' as const,
});

/** Exact, reviewed native-route facts. Runtime-only routes are deliberately absent. */
const NATIVE_REASONING_REGISTRY: readonly RegistryEntry[] = [
  {
    providerId: 'anthropic',
    modelIds: ['claude-opus-5'],
    supported: true,
    controls: ['adaptive', 'effort', 'toggle'],
    supportsToggle: true,
    disableForbiddenEfforts: ['xhigh', 'max'],
    supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'high',
    defaultEnabled: true,
    supportsOutputExclusion: true,
    outputKind: 'opaque-signed',
    replayRequirement: 'opaque-signature',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://platform.claude.com/docs/en/build-with-claude/effort',
  },
  {
    providerId: 'anthropic',
    modelIds: ['claude-sonnet-5'],
    supported: true,
    controls: ['adaptive', 'effort', 'toggle'],
    supportsToggle: true,
    supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'high',
    defaultEnabled: true,
    supportsOutputExclusion: true,
    outputKind: 'opaque-signed',
    replayRequirement: 'opaque-signature',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://platform.claude.com/docs/en/build-with-claude/effort',
  },
  {
    providerId: 'anthropic',
    modelIds: ['claude-opus-4-8', 'claude-opus-4-7'],
    supported: true,
    controls: ['adaptive', 'effort', 'toggle'],
    supportsToggle: true,
    supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'high',
    defaultEnabled: false,
    supportsOutputExclusion: true,
    outputKind: 'opaque-signed',
    replayRequirement: 'opaque-signature',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://platform.claude.com/docs/en/build-with-claude/effort',
  },
  {
    providerId: 'anthropic',
    modelIds: ['claude-opus-4-6', 'claude-sonnet-4-6'],
    supported: true,
    controls: ['adaptive', 'effort', 'toggle'],
    supportsToggle: true,
    supportedEfforts: ['low', 'medium', 'high', 'max'],
    defaultEffort: 'high',
    defaultEnabled: false,
    supportsOutputExclusion: true,
    outputKind: 'opaque-signed',
    replayRequirement: 'opaque-signature',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://platform.claude.com/docs/en/build-with-claude/effort',
  },
  {
    providerId: 'anthropic',
    modelIds: ['claude-opus-4-5-20251101'],
    supported: true,
    controls: ['budget', 'effort', 'toggle'],
    supportsToggle: true,
    supportsBudgetTokens: true,
    minimumBudgetTokens: 1024,
    supportedEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'high',
    defaultEnabled: false,
    outputKind: 'opaque-signed',
    replayRequirement: 'opaque-signature',
    semantic: 'reasoning-depth',
    sourceUrl:
      'https://platform.claude.com/docs/en/build-with-claude/extended-thinking',
  },
  {
    providerId: 'anthropic',
    modelIds: [
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-1-20250805',
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
    ],
    supported: true,
    controls: ['budget', 'toggle'],
    supportsToggle: true,
    supportsBudgetTokens: true,
    minimumBudgetTokens: 1024,
    defaultEnabled: false,
    outputKind: 'opaque-signed',
    replayRequirement: 'opaque-signature',
    semantic: 'reasoning-depth',
    sourceUrl:
      'https://platform.claude.com/docs/en/build-with-claude/extended-thinking',
  },
  {
    providerId: 'deepseek',
    modelIds: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    ...toggle,
    outputKind: 'reasoning-text',
    replayRequirement: 'reasoning-content',
    sourceUrl: 'https://api-docs.deepseek.com/guides/thinking_mode',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-3.7-flash'],
    ...effort(['low', 'medium', 'high']),
    defaultEffort: 'medium',
    defaultEnabled: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-3.6-flash', 'gemini-3.5-flash'],
    ...effort(['minimal', 'low', 'medium', 'high']),
    defaultEffort: 'medium',
    defaultEnabled: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-3.5-flash-lite'],
    ...effort(['minimal', 'low', 'medium', 'high']),
    defaultEffort: 'minimal',
    defaultEnabled: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    ...effort(['low', 'medium', 'high']),
    defaultEnabled: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-3-flash-preview'],
    ...effort(['minimal', 'low', 'medium', 'high']),
    defaultEffort: 'high',
    defaultEnabled: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-3-pro-preview'],
    ...effort(['low', 'high']),
    defaultEffort: 'high',
    defaultEnabled: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'google',
    modelIds: ['gemini-2.5-flash-lite'],
    ...effort(['low', 'medium', 'high']),
    defaultEnabled: false,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/thinking',
  },
  {
    providerId: 'groq',
    modelIds: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
    ...effort(['low', 'medium', 'high']),
    supportsOutputExclusion: true,
    outputKind: 'reasoning-text',
    sourceUrl: 'https://console.groq.com/docs/reasoning',
  },
  {
    providerId: 'groq',
    modelIds: ['qwen/qwen3.6-27b'],
    ...toggle,
    supportsOutputExclusion: true,
    outputKind: 'reasoning-text',
    sourceUrl: 'https://console.groq.com/docs/reasoning',
  },
  {
    providerId: 'groq',
    modelIds: ['openai/gpt-oss-safeguard-20b', 'minimaxai/minimax-m2.7'],
    supported: true,
    controls: [],
    semantic: 'reasoning-depth',
    sourceUrl: 'https://console.groq.com/docs/reasoning',
  },
  {
    providerId: 'moonshot',
    modelIds: ['kimi-k3'],
    ...effort(['low', 'high', 'max']),
    defaultEffort: 'max',
    defaultEnabled: true,
    mandatory: true,
    outputKind: 'reasoning-text',
    replayRequirement: 'full-assistant-message',
    sourceUrl: 'https://platform.kimi.ai/docs/guide/use-thinking-models',
  },
  {
    providerId: 'moonshot',
    modelIds: ['kimi-k2.7-code', 'kimi-k2.7-code-highspeed'],
    supported: true,
    controls: [],
    defaultEnabled: true,
    mandatory: true,
    outputKind: 'reasoning-text',
    replayRequirement: 'full-assistant-message',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://platform.kimi.ai/docs/guide/use-thinking-models',
  },
  {
    providerId: 'moonshot',
    modelIds: ['kimi-k2.6'],
    ...toggle,
    replayRequirement: 'reasoning-content',
    sourceUrl: 'https://platform.kimi.ai/docs/guide/use-thinking-models',
  },
  {
    providerId: 'moonshot',
    modelIds: ['kimi-k2.5'],
    ...toggle,
    outputKind: 'reasoning-text',
    sourceUrl: 'https://platform.kimi.ai/docs/guide/use-thinking-models',
  },
  {
    providerId: 'mistral',
    modelIds: ['mistral-small-latest', 'mistral-medium-3-5'],
    ...effort(['high']),
    outputKind: 'reasoning-text',
    replayRequirement: 'full-assistant-message',
    sourceUrl: 'https://docs.mistral.ai/studio/conversations/reasoning',
  },
  {
    providerId: 'openai',
    modelIds: ['gpt-5.6', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'],
    ...effort(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
    supportsToggle: true,
    defaultEffort: 'medium',
    defaultEnabled: true,
    outputKind: 'none',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/reasoning',
  },
  {
    providerId: 'openai',
    modelIds: ['gpt-5.5'],
    ...effort(['none', 'low', 'medium', 'high', 'xhigh']),
    supportsToggle: true,
    defaultEffort: 'medium',
    defaultEnabled: true,
    outputKind: 'none',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/reasoning',
  },
  {
    providerId: 'openai',
    modelIds: ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.2'],
    ...effort(['none', 'low', 'medium', 'high', 'xhigh']),
    supportsToggle: true,
    defaultEffort: 'none',
    defaultEnabled: false,
    outputKind: 'none',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/reasoning',
  },
  {
    providerId: 'openai',
    modelIds: ['gpt-5.1'],
    ...effort(['none', 'low', 'medium', 'high']),
    supportsToggle: true,
    defaultEffort: 'none',
    defaultEnabled: false,
    outputKind: 'none',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/reasoning',
  },
  {
    providerId: 'openai',
    modelIds: ['gpt-5'],
    ...effort(['minimal', 'low', 'medium', 'high']),
    defaultEffort: 'medium',
    defaultEnabled: true,
    outputKind: 'none',
    sourceUrl: 'https://developers.openai.com/api/docs/guides/reasoning',
  },
  {
    providerId: 'openai',
    modelIds: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'],
    supported: false,
    controls: [],
    sourceUrl: 'https://developers.openai.com/api/docs/models/all',
  },
  {
    providerId: 'xai',
    modelIds: ['grok-4.6'],
    ...effort(['low', 'medium', 'high', 'xhigh']),
    defaultEffort: 'high',
    defaultEnabled: true,
    mandatory: true,
    outputKind: 'summary',
    sourceUrl: 'https://docs.x.ai/developers/model-capabilities/text/reasoning',
  },
  {
    providerId: 'xai',
    modelIds: ['grok-4.5'],
    ...effort(['low', 'medium', 'high']),
    defaultEffort: 'high',
    defaultEnabled: true,
    mandatory: true,
    sourceUrl: 'https://docs.x.ai/developers/model-capabilities/text/reasoning',
  },
  {
    providerId: 'zai',
    modelIds: ['glm-5.3'],
    ...effort(['low', 'high', 'max']),
    defaultEffort: 'max',
    defaultEnabled: true,
    mandatory: true,
    outputKind: 'reasoning-text',
    replayRequirement: 'reasoning-content',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://docs.z.ai/guides/capabilities/thinking-mode',
  },
  {
    providerId: 'zai',
    modelIds: ['glm-5.2'],
    ...toggle,
    controls: ['toggle', 'effort'],
    supportedEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'max',
    outputKind: 'reasoning-text',
    replayRequirement: 'reasoning-content',
    sourceUrl: 'https://docs.z.ai/guides/capabilities/thinking-mode',
  },
  {
    providerId: 'zai',
    modelIds: ['glm-5.1', 'glm-5', 'glm-5-turbo', 'glm-4.7', 'glm-4.6'],
    ...toggle,
    outputKind: 'reasoning-text',
    sourceUrl: 'https://docs.z.ai/guides/capabilities/thinking-mode',
  },
  {
    providerId: 'ollama',
    modelIds: ['gpt-oss', 'gpt-oss:20b', 'gpt-oss:120b'],
    ...effort(['low', 'medium', 'high']),
    mandatory: true,
    outputKind: 'reasoning-text',
    sourceUrl: 'https://docs.ollama.com/capabilities/thinking',
  },
];

export function lookupNativeChatReasoningCapability(
  providerId: ProviderId,
  modelId: string,
): ModelReasoningCapability | undefined {
  const entry = NATIVE_REASONING_REGISTRY.find(
    (candidate) =>
      candidate.providerId === providerId &&
      candidate.modelIds.includes(modelId),
  );
  if (!entry) return undefined;

  const { modelIds, providerId: entryProviderId, sourceUrl, ...capability } =
    entry;
  void modelIds;
  void entryProviderId;
  return {
    ...capability,
    controls: [...capability.controls],
    supportedEfforts: capability.supportedEfforts
      ? [...capability.supportedEfforts]
      : undefined,
    disableForbiddenEfforts: capability.disableForbiddenEfforts
      ? [...capability.disableForbiddenEfforts]
      : undefined,
    source: {
      kind: 'reviewed-registry',
      providerId,
      modelId,
      url: sourceUrl,
      reviewedAt: REVIEWED_AT,
    },
  };
}

export function resolveChatReasoningCapability(
  providerId: ProviderId,
  modelId: string,
  runtimeCapability: ModelReasoningCapability | undefined,
): ModelReasoningCapability | undefined {
  if (providerId === 'openrouter' || providerId === 'nanogpt') {
    return runtimeCapability;
  }

  const reviewed = lookupNativeChatReasoningCapability(providerId, modelId);
  if (providerId === 'ollama') {
    if (!runtimeCapability?.supported) return runtimeCapability;
    if (!reviewed?.supported) return runtimeCapability;
    return {
      ...reviewed,
      source: {
        kind: 'route-intersection',
        providerId,
        modelId,
        url: reviewed.source.url,
        reviewedAt: reviewed.source.reviewedAt,
      },
    };
  }

  if (reviewed) return reviewed;
  if (!runtimeCapability) return undefined;
  return {
    supported: runtimeCapability.supported,
    controls: [],
    source: runtimeCapability.source,
  };
}

export function validateChatReasoningRequest(
  request: GatewayChatReasoningRequest | undefined,
  capability: ModelReasoningCapability | undefined,
  route: string,
): void {
  if (!request) return;
  if (!capability?.supported) {
    throw new Error(`Reasoning controls are not supported for ${route}.`);
  }
  if (request.enabled === false && capability.mandatory) {
    throw new Error(
      `Reasoning is mandatory for ${route} and cannot be disabled.`,
    );
  }
  if (
    request.enabled === false &&
    request.effort &&
    capability.disableForbiddenEfforts?.includes(
      request.effort as ModelReasoningEffort,
    )
  ) {
    throw new Error(
      `Reasoning cannot be disabled at effort ${request.effort} for ${route}.`,
    );
  }
  if (request.enabled !== undefined && capability.supportsToggle !== true) {
    throw new Error(`A reasoning toggle is not supported for ${route}.`);
  }
  if (
    request.effort &&
    !capability.supportedEfforts?.includes(
      request.effort as ModelReasoningEffort,
    )
  ) {
    throw new Error(
      `Reasoning effort ${request.effort} is not supported for ${route}.`,
    );
  }
  if (request.budgetTokens !== undefined) {
    if (capability.supportsBudgetTokens !== true) {
      throw new Error(
        `Reasoning token budgets are not supported for ${route}.`,
      );
    }
    if (!Number.isInteger(request.budgetTokens) || request.budgetTokens < 1) {
      throw new Error('reasoning.budgetTokens must be a positive integer.');
    }
    if (
      capability.minimumBudgetTokens !== undefined &&
      request.budgetTokens < capability.minimumBudgetTokens
    ) {
      throw new Error(
        `reasoning.budgetTokens must be at least ${capability.minimumBudgetTokens} for ${route}.`,
      );
    }
  }
  if (
    request.includeOutput !== undefined &&
    capability.supportsOutputExclusion !== true
  ) {
    throw new Error(
      `Reasoning output visibility is not configurable for ${route}.`,
    );
  }
  if (
    request.preserveReasoning === true &&
    (!capability.replayRequirement || capability.replayRequirement === 'none')
  ) {
    throw new Error(`Reasoning replay is not supported for ${route}.`);
  }
}

export function toLegacyReasoningEffort(
  request: GatewayChatReasoningRequest,
): GatewayReasoningEffort | undefined {
  return request.enabled === false ? 'none' : request.effort;
}
