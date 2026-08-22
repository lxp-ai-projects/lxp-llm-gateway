import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAggregatorReasoningOptions } from './reasoning-options.js';

test('maps an Anthropic budget exactly through OpenRouter', () => {
  assert.deepEqual(
    resolveAggregatorReasoningOptions(
      'openrouter',
      'anthropic/claude-opus-4.6',
      {
        anthropic: {
          extendedThinking: { mode: 'budget', budgetTokens: 4096 },
        },
      },
    ),
    {
      reasoning: { max_tokens: 4096 },
      minimumOutputTokens: 4097,
    },
  );
});

test('maps family-owned effort controls through both aggregators', () => {
  assert.deepEqual(
    resolveAggregatorReasoningOptions('nanogpt', 'openai/gpt-5.2', {
      openai: { reasoning: { effort: 'high' } },
    }),
    { reasoning: { effort: 'high' } },
  );
  assert.deepEqual(
    resolveAggregatorReasoningOptions('openrouter', 'x-ai/grok-4.1-fast', {
      xai: { reasoning: { effort: 'xhigh' } },
    }),
    { reasoning: { effort: 'xhigh' } },
  );
});

test('preserves the NanoGPT GLM thinking payload', () => {
  assert.deepEqual(
    resolveAggregatorReasoningOptions('nanogpt', 'z-ai/glm-4.6:thinking', {
      zai: { thinking: { type: 'enabled', clearThinking: false } },
    }),
    {
      thinking: { type: 'enabled', clear_thinking: false },
    },
  );
});

test('maps NanoGPT catalog-driven reasoning without requiring a known family', () => {
  assert.deepEqual(
    resolveAggregatorReasoningOptions('nanogpt', 'moonshotai/kimi-future', {
      nanogpt: { reasoning: { effort: 'medium' } },
    }),
    { reasoning: { effort: 'medium' } },
  );
});

test('rejects NanoGPT max reasoning effort', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions('nanogpt', 'future-model', {
        nanogpt: { reasoning: { effort: 'max' } },
      }),
    /does not document reasoning effort "max"/,
  );
});

test('maps OpenRouter catalog-driven reasoning without requiring a known family', () => {
  // Regression test: OpenRouter can declare a model as reasoning-capable in
  // its own catalog (supported_parameters / reasoning object) before LXP has
  // classified that model into a known ReasoningModelFamily (e.g. unlisted
  // "stealth" previews). The generic providerOptions.openrouter.reasoning
  // toggle must keep working in that case instead of throwing, otherwise
  // Chat Lab shows "Thinking: enabled" for a model that then fails on send.
  assert.deepEqual(
    resolveAggregatorReasoningOptions(
      'openrouter',
      'openrouter/stealth/ox-alpha',
      {
        openrouter: { reasoning: { enabled: true } },
      },
    ),
    { reasoning: { enabled: true } },
  );
});

test('rejects ambiguous NanoGPT generic and family reasoning options', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions('nanogpt', 'openai/gpt-5.2', {
        nanogpt: { reasoning: { effort: 'medium' } },
        openai: { reasoning: { effort: 'high' } },
      }),
    /ambiguous/,
  );
});

test('fails loudly when family-owned options do not match the model family', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions('openrouter', 'openai/gpt-5.2', {
        anthropic: { extendedThinking: { mode: 'adaptive' } },
      }),
    /targets anthropic-claude.*belongs to openai-reasoning/,
  );
});

test('fails loudly for a family option unsupported by the selected transport', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions(
        'nanogpt',
        'anthropic/claude-opus-4.6',
        {
          anthropic: {
            extendedThinking: { mode: 'budget', budgetTokens: 4096 },
          },
        },
      ),
    /does not document an exact Claude reasoning budget mapping/,
  );
});

test('fails loudly for transport-specific options sent to another aggregator', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions('nanogpt', 'openai/gpt-5.2', {
        openrouter: { reasoning: { effort: 'high' } },
      }),
    /cannot be relayed by nanogpt/,
  );
});

test('rejects clear_thinking for OpenRouter GLM reasoning', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions('openrouter', 'z-ai/glm-4.5', {
        zai: { thinking: { type: 'enabled', clearThinking: true } },
      }),
    /does not document a clear_thinking mapping/,
  );
});

test('rejects non-integer OpenRouter reasoning maxTokens', () => {
  assert.throws(
    () =>
      resolveAggregatorReasoningOptions('openrouter', 'future-model', {
        openrouter: { reasoning: { maxTokens: 10.5 } },
      }),
    /maxTokens must be a positive integer/,
  );
});
