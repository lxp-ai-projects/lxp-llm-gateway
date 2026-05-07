import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveZaiImageModelDescriptor } from './model-policy.js';
import { buildZaiImageGenerationRequest } from './request-mapper.js';

test('buildZaiImageGenerationRequest maps the gateway request to the Z.ai image payload', () => {
  const model = resolveZaiImageModelDescriptor('glm-image');
  const payload = buildZaiImageGenerationRequest(
    {
      model: 'glm-image',
      prompt: 'draw a mountain',
      quality: 'hd',
      resolution: '1280x1280',
    },
    model,
    'user-123456',
  );

  assert.deepEqual(payload, {
    model: 'glm-image',
    prompt: 'draw a mountain',
    quality: 'hd',
    size: '1280x1280',
    user_id: 'user-123456',
  });
});
