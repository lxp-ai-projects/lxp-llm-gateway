import assert from 'node:assert/strict';
import test from 'node:test';

import { ZaiImageApiClient } from './api-client.js';
import { ZaiImageGenerationService } from './generation-service.js';

test('ZaiImageGenerationService orchestrates image generation requests end to end', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        created: 1760335349,
        data: [{ url: 'https://example.com/generated.png' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const service = new ZaiImageGenerationService(
      new ZaiImageApiClient('https://api.z.ai/api/paas/v4', 1000),
    );
    const response = await service.execute(
      {
        model: 'glm-image',
        prompt: 'a bright skyline',
        resolution: '1280x1280',
        quality: 'hd',
      },
      {
        requestId: 'request-1',
        userId: 'user-123456',
        providerAccess: { apiKey: 'zai-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://api.z.ai/api/paas/v4/images/generations',
    );
    assert.equal(response.providerId, 'zai');
    assert.equal(response.model, 'glm-image');
    assert.equal(response.images[0]?.url, 'https://example.com/generated.png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
