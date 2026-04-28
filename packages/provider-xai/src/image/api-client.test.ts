import assert from 'node:assert/strict';
import test from 'node:test';

import { XAiImageApiClient } from './api-client.js';

test('XAiImageApiClient posts image generation requests to the correct endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const client = new XAiImageApiClient('https://api.x.ai/v1', 1000);
    await client.postGenerations(
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'xai-token' },
      },
      { model: 'grok-imagine-image', prompt: 'A product shot' },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/images/generations');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
