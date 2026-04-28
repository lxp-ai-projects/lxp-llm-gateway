import assert from 'node:assert/strict';
import test from 'node:test';

import { XAiImageApiClient } from './api-client.js';
import { XAiImageGenerationService } from './generation-service.js';

test('XAiImageGenerationService orchestrates generation requests end to end', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        created: 123,
        data: [{ url: 'https://cdn.x.ai/generated.png' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const service = new XAiImageGenerationService(
      new XAiImageApiClient('https://api.x.ai/v1', 1000),
    );
    const response = await service.execute(
      {
        model: 'grok-imagine-image',
        prompt: 'A studio portrait',
        responseFormat: 'url',
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'xai-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/images/generations');
    assert.equal(response.images[0]?.url, 'https://cdn.x.ai/generated.png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
