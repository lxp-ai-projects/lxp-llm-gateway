import assert from 'node:assert/strict';
import test from 'node:test';

import {
  lookupNativeChatReasoningCapability,
  resolveChatReasoningCapability,
  validateChatReasoningRequest,
} from './chat-reasoning.js';

test('native registry matches only exact reviewed model IDs', () => {
  assert.equal(
    lookupNativeChatReasoningCapability('deepseek', 'deepseek-v4-pro')
      ?.supported,
    true,
  );
  assert.equal(
    lookupNativeChatReasoningCapability('deepseek', 'deepseek-v4-pro-thinking'),
    undefined,
  );
  assert.equal(
    lookupNativeChatReasoningCapability('xai', 'grok-4.20-multi-agent'),
    undefined,
  );
  assert.equal(
    lookupNativeChatReasoningCapability('zai', 'glm-future-reasoner'),
    undefined,
  );
  assert.equal(
    lookupNativeChatReasoningCapability('anthropic', 'claude-opus-5-snapshot'),
    undefined,
  );
  assert.equal(
    lookupNativeChatReasoningCapability(
      'google',
      'gemini-3.1-flash-lite-image',
    ),
    undefined,
  );
});

test('DeepSeek exposes proven toggle semantics but no effort controls', () => {
  const capability = lookupNativeChatReasoningCapability(
    'deepseek',
    'deepseek-v4-pro',
  );
  assert.deepEqual(capability?.controls, ['toggle']);
  assert.equal(capability?.defaultEnabled, true);
  assert.equal(capability?.supportedEfforts, undefined);
  assert.doesNotThrow(() =>
    validateChatReasoningRequest(
      { enabled: false },
      capability,
      'deepseek/deepseek-v4-pro',
    ),
  );
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { effort: 'high' },
        capability,
        'deepseek/deepseek-v4-pro',
      ),
    /effort high is not supported/,
  );
});

test('OpenAI capability is exact-model-specific despite sparse discovery', () => {
  assert.deepEqual(
    lookupNativeChatReasoningCapability('openai', 'gpt-5.4')?.supportedEfforts,
    ['none', 'low', 'medium', 'high', 'xhigh'],
  );
  assert.equal(
    lookupNativeChatReasoningCapability('openai', 'gpt-4o')?.supported,
    false,
  );
  assert.equal(
    lookupNativeChatReasoningCapability('openai', 'gpt-5.4-unknown-snapshot'),
    undefined,
  );
});

test('unreviewed native runtime metadata cannot create executable controls', () => {
  const capability = resolveChatReasoningCapability(
    'anthropic',
    'claude-future-model',
    {
      supported: true,
      controls: ['adaptive', 'budget'],
      supportsBudgetTokens: true,
      source: {
        kind: 'provider-api',
        providerId: 'anthropic',
        modelId: 'claude-future-model',
      },
    },
  );
  assert.deepEqual(capability?.controls, []);
  assert.equal(capability?.supportsBudgetTokens, undefined);
});

test('Ollama reviewed controls require runtime thinking support', () => {
  const runtime = {
    supported: true,
    controls: [],
    source: {
      kind: 'provider-api' as const,
      providerId: 'ollama' as const,
      modelId: 'gpt-oss:20b',
    },
  };
  assert.deepEqual(
    resolveChatReasoningCapability('ollama', 'gpt-oss:20b', runtime)
      ?.supportedEfforts,
    ['low', 'medium', 'high'],
  );
  assert.deepEqual(
    resolveChatReasoningCapability('ollama', 'qwen3:8b', {
      ...runtime,
      source: { ...runtime.source, modelId: 'qwen3:8b' },
    })?.controls,
    [],
  );
  assert.equal(
    resolveChatReasoningCapability('ollama', 'gpt-oss:20b', undefined),
    undefined,
  );
});

test('conditional Anthropic disable rules are validated without wildcard matching', () => {
  const capability = lookupNativeChatReasoningCapability(
    'anthropic',
    'claude-opus-5',
  );
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { enabled: false, effort: 'xhigh' },
        capability,
        'anthropic/claude-opus-5',
      ),
    /cannot be disabled at effort xhigh/,
  );
});

test('mandatory models reject canonical disable requests', () => {
  const capability = lookupNativeChatReasoningCapability('moonshot', 'kimi-k3');
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { enabled: false },
        capability,
        'moonshot/kimi-k3',
      ),
    /mandatory/,
  );
});

test('unsupported effort is rejected rather than downgraded', () => {
  const capability = lookupNativeChatReasoningCapability('xai', 'grok-4.5');
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { effort: 'xhigh' },
        capability,
        'xai/grok-4.5',
      ),
    /xhigh is not supported/,
  );
});

test('unknown models do not accept canonical reasoning controls', () => {
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { effort: 'high' },
        undefined,
        'groq/future-reasoner',
      ),
    /not supported/,
  );
});

test('preserved reasoning is accepted only for documented replay-capable identities', () => {
  assert.doesNotThrow(() =>
    validateChatReasoningRequest(
      { enabled: true, preserveReasoning: true },
      lookupNativeChatReasoningCapability('zai', 'glm-5.2'),
      'zai/glm-5.2',
    ),
  );
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { enabled: true, preserveReasoning: true },
        lookupNativeChatReasoningCapability('zai', 'glm-4.6'),
        'zai/glm-4.6',
      ),
    /replay is not supported/,
  );
});

test('Z.AI thinking is toggleable for exact reviewed models except GLM-5.3', () => {
  for (const modelId of [
    'glm-5.2',
    'glm-5.1',
    'glm-5',
    'glm-5-turbo',
    'glm-4.7',
    'glm-4.6',
    'glm-4.5',
    'glm-4.5-air',
    'glm-4.5-x',
    'glm-4.5-airx',
    'glm-4.5-flash',
  ]) {
    const capability = lookupNativeChatReasoningCapability('zai', modelId);
    assert.equal(capability?.supportsToggle, true, modelId);
    assert.doesNotThrow(() =>
      validateChatReasoningRequest(
        { enabled: false },
        capability,
        `zai/${modelId}`,
      ),
    );
  }

  const forcedCapability = lookupNativeChatReasoningCapability(
    'zai',
    'glm-5.3',
  );
  assert.equal(forcedCapability?.supportsToggle, undefined);
  assert.equal(forcedCapability?.mandatory, true);
  assert.throws(
    () =>
      validateChatReasoningRequest(
        { enabled: false },
        forcedCapability,
        'zai/glm-5.3',
      ),
    /mandatory/,
  );
});
