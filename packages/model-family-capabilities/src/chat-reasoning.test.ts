import assert from 'node:assert/strict';
import test from 'node:test';

import {
  lookupNativeChatReasoningCapability,
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
