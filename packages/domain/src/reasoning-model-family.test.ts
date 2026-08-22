import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectReasoningModelFamily,
  getThinkingTransportCompatibility,
  isAnthropicClaudeReasoningModel,
  isGlmThinkingModel,
  isOpenAiReasoningModel,
  isXAiGrokReasoningModel,
  supportsPreservedThinking,
  supportsThinkingModelFamily,
} from './index.js';

test('detects Claude reasoning models independently of aggregator prefixes', () => {
  for (const modelId of [
    'claude-3-7-sonnet-latest',
    'claude-sonnet-4-5-20250929',
    'anthropic/claude-opus-4.6',
    'nanogpt/anthropic/claude-haiku-4-5-20251001',
  ]) {
    assert.equal(isAnthropicClaudeReasoningModel(modelId), true, modelId);
    assert.equal(detectReasoningModelFamily(modelId), 'anthropic-claude');
  }
});

test('detects OpenAI reasoning models independently of aggregator prefixes', () => {
  for (const modelId of [
    'o1-preview',
    'openai/o3-mini',
    'openai/o4-mini-high',
    'gpt-5',
    'openai/gpt-5.2',
    'nanogpt/openai/gpt-5.6-sol',
  ]) {
    assert.equal(isOpenAiReasoningModel(modelId), true, modelId);
    assert.equal(detectReasoningModelFamily(modelId), 'openai-reasoning');
  }
});

test('detects xAI Grok reasoning models without matching media models', () => {
  for (const modelId of [
    'grok-3-mini',
    'x-ai/grok-4',
    'x-ai/grok-4.1-fast',
    'nanogpt/x-ai/grok-4.5',
  ]) {
    assert.equal(isXAiGrokReasoningModel(modelId), true, modelId);
    assert.equal(detectReasoningModelFamily(modelId), 'xai-grok');
  }

  assert.equal(isXAiGrokReasoningModel('grok-4-image'), false);
  assert.equal(isXAiGrokReasoningModel('grok-4-video'), false);
});

test('preserves GLM detection across known provider naming conventions', () => {
  for (const modelId of [
    'glm-4.5',
    'z-ai/glm-4.6:thinking',
    'zai-org/glm-5',
    'ollama/glm-5:cloud',
  ]) {
    assert.equal(isGlmThinkingModel(modelId), true, modelId);
    assert.equal(detectReasoningModelFamily(modelId), 'zai-glm');
  }
});

test('does not classify non-reasoning or media model ids', () => {
  for (const modelId of [
    undefined,
    'anthropic/claude-3-5-sonnet',
    'openai/gpt-4.1-mini',
    'openai/gpt-5-image',
    'grok-imagine-image',
    'grok-imagine-video',
    'z-ai/glm-4.0',
  ]) {
    assert.equal(detectReasoningModelFamily(modelId), null, String(modelId));
  }
});

test('uses an explicit compatibility entry for each supported transport and family', () => {
  assert.deepEqual(
    getThinkingTransportCompatibility(
      'openrouter',
      'anthropic/claude-opus-4.6',
    ),
    {
      requestMapping: 'openrouter-reasoning',
      preservesReasoning: true,
    },
  );
  assert.deepEqual(
    getThinkingTransportCompatibility('nanogpt', 'openai/gpt-5.2'),
    {
      requestMapping: 'nanogpt-reasoning',
      preservesReasoning: false,
    },
  );
  assert.deepEqual(
    getThinkingTransportCompatibility('openrouter', 'x-ai/grok-4.1-fast'),
    {
      requestMapping: 'openrouter-reasoning',
      preservesReasoning: true,
    },
  );
  assert.deepEqual(
    getThinkingTransportCompatibility('nanogpt', 'z-ai/glm-4.6:thinking'),
    {
      requestMapping: 'nanogpt-zai-thinking',
      preservesReasoning: true,
    },
  );
});

test('fails closed for unverified provider and model-family combinations', () => {
  assert.equal(
    supportsThinkingModelFamily('ollama', 'anthropic/claude-opus-4.6'),
    false,
  );
  assert.equal(supportsThinkingModelFamily('openai', 'openai/gpt-5.2'), false);
  assert.equal(
    getThinkingTransportCompatibility('unknown', 'x-ai/grok-4.1-fast'),
    null,
  );
});

test('reports whether a transport preserves visible reasoning', () => {
  assert.equal(
    supportsPreservedThinking('nanogpt', 'anthropic/claude-opus-4.6'),
    true,
  );
  assert.equal(
    supportsPreservedThinking('openrouter', 'openai/o3-mini'),
    false,
  );
});
