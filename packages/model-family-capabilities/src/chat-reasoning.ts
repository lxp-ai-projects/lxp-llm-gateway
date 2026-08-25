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

const REVIEWED_AT = '2026-08-24';

const toggle: Pick<
  ModelReasoningCapability,
  | 'supported'
  | 'controls'
  | 'supportsToggle'
  | 'defaultEnabled'
  | 'outputKind'
  | 'replayRequirement'
  | 'semantic'
> = {
  supported: true,
  controls: ['toggle'],
  supportsToggle: true,
  defaultEnabled: true,
  outputKind: 'reasoning-text' as const,
  replayRequirement: 'reasoning-content' as const,
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
    providerId: 'deepseek',
    modelIds: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    ...toggle,
    controls: ['toggle', 'effort'],
    supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
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
    modelIds: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-image'],
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
    replayRequirement: 'reasoning-content',
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
    replayRequirement: 'none',
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
    supported: true,
    controls: [],
    defaultEnabled: true,
    mandatory: true,
    outputKind: 'reasoning-text',
    replayRequirement: 'reasoning-content',
    semantic: 'reasoning-depth',
    sourceUrl: 'https://docs.z.ai/guides/capabilities/thinking-mode',
  },
  {
    providerId: 'zai',
    modelIds: ['glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6'],
    ...toggle,
    sourceUrl: 'https://docs.z.ai/guides/capabilities/thinking-mode',
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

  const { modelIds: _modelIds, sourceUrl, ...capability } = entry;
  return {
    ...capability,
    controls: [...capability.controls],
    supportedEfforts: capability.supportedEfforts
      ? [...capability.supportedEfforts]
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
  }
  if (
    request.includeOutput !== undefined &&
    capability.supportsOutputExclusion !== true
  ) {
    throw new Error(
      `Reasoning output visibility is not configurable for ${route}.`,
    );
  }
}

export function toLegacyReasoningEffort(
  request: GatewayChatReasoningRequest,
): GatewayReasoningEffort | undefined {
  return request.enabled === false ? 'none' : request.effort;
}
