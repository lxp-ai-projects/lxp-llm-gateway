import assert from 'node:assert/strict';
import test from 'node:test';

import { mapZaiImageResponse } from './response-mapper.js';

test('mapZaiImageResponse normalizes Z.ai image responses into the gateway shape', () => {
  const response = mapZaiImageResponse(
    'glm-image',
    {
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {},
    },
    {
      created: 1760335349,
      data: [{ url: 'https://example.com/generated.png' }],
      content_filter: [{ role: 'assistant', level: 3 }],
    },
  );

  assert.equal(response.providerId, 'zai');
  assert.equal(response.images[0]?.url, 'https://example.com/generated.png');
  assert.deepEqual(response.providerMetadata, {
    created: 1760335349,
    content_filter: [{ role: 'assistant', level: 3 }],
  });
});
