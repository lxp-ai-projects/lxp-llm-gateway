import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAiImageApiClient } from './api-client.js';

test('OpenAiImageApiClient posts image generation requests to the correct endpoint', async () => {
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
    const client = new OpenAiImageApiClient('https://api.openai.com/v1', 1000);
    await client.postGenerations(
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'openai-token' },
      },
      {
        kind: 'json',
        body: { model: 'gpt-image-1.5', prompt: 'A product shot' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/images/generations');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
