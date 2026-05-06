import assert from 'node:assert/strict';
import test from 'node:test';

import { ZaiImageApiClient } from './api-client.js';

test('ZaiImageApiClient posts image generation requests to the native endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({ data: [{ url: 'https://example.com/image.png' }] }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const client = new ZaiImageApiClient('https://api.z.ai/api/paas/v4', 1000);
    await client.postGenerations(
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'zai-token' },
      },
      {
        model: 'glm-image',
        prompt: 'draw something',
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://api.z.ai/api/paas/v4/images/generations',
    );
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer zai-token',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
