import assert from 'node:assert/strict';
import test from 'node:test';

import { mapXAiImageResponse } from './response-mapper.js';

test('mapXAiImageResponse normalizes xAI image payloads', () => {
  const response = mapXAiImageResponse(
    'grok-imagine-image',
    {
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {},
    },
    {
      created: 123,
      data: [
        {
          url: 'https://cdn.x.ai/generated.png',
          revised_prompt: 'Refined prompt',
        },
      ],
    },
  );

  assert.equal(response.providerId, 'xai');
  assert.equal(response.model, 'grok-imagine-image');
  assert.equal(response.images[0]?.url, 'https://cdn.x.ai/generated.png');
  assert.equal(response.images[0]?.revisedPrompt, 'Refined prompt');
});
