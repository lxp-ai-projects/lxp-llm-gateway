import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveZaiImageModelDescriptor,
  validateZaiImageGenerationRequest,
} from './model-policy.js';

test('resolveZaiImageModelDescriptor returns the catalog entry for GLM-Image', () => {
  const model = resolveZaiImageModelDescriptor('glm-image');

  assert.equal(model.id, 'glm-image');
  assert.equal(model.capabilities.supportsImageGeneration, true);
});

test('validateZaiImageGenerationRequest rejects multiple image outputs', () => {
  const model = resolveZaiImageModelDescriptor('glm-image');

  assert.throws(
    () =>
      validateZaiImageGenerationRequest(
        {
          model: 'glm-image',
          prompt: 'a skyline',
          n: 2,
        },
        model,
      ),
    /supports at most 1 image\(s\) per request/,
  );
});
